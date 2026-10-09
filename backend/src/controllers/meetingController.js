const Meeting = require('../models/Meeting');
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../services/auditService');

async function migrateLegacyAttendance(meetings) {
  const legacyEntries = meetings.flatMap((meeting) => (meeting.attendance || []).map((entry) => ({
    shg: meeting.shg,
    meeting: meeting._id,
    member: entry.member,
    present: Boolean(entry.present),
    note: String(entry.note || '').trim(),
  })));
  if (legacyEntries.length) {
    await Attendance.bulkWrite(legacyEntries.map((entry) => ({
      updateOne: {
        filter: { shg: entry.shg, meeting: entry.meeting, member: entry.member },
        update: { $setOnInsert: entry },
        upsert: true,
      },
    })));
    await Meeting.updateMany(
      { _id: { $in: meetings.map((meeting) => meeting._id) } },
      { $unset: { attendance: 1 } },
    );
  }
}

async function attachAttendance(meetings) {
  await migrateLegacyAttendance(meetings);
  const meetingIds = meetings.map((meeting) => meeting._id);
  let attendance = await Attendance.find({ meeting: { $in: meetingIds } })
    .populate('member', 'name memberId');
  const meetingsById = new Map(meetings.map((meeting) => [String(meeting._id), meeting]));
  const snapshotUpdates = attendance.flatMap((entry) => {
    const meeting = meetingsById.get(String(entry.meeting));
    if (!meeting) return [];
    const present = Boolean(entry.present);
    const snapshot = {
      memberName: entry.member?.name || entry.memberName || '',
      memberId: entry.member?.memberId || entry.memberId || '',
      attendanceStatus: present ? 'Present' : 'Absent',
      markedAt: entry.markedAt || entry.updatedAt || entry.createdAt || new Date(),
      meetingTitle: meeting.title,
      meetingType: meeting.type,
      meetingDate: meeting.date,
      meetingTime: meeting.time || '',
      meetingLocation: meeting.location || '',
    };
    const changed = Object.entries(snapshot).some(([key, value]) => {
      const current = entry[key];
      if (value instanceof Date) return !current || new Date(current).getTime() !== value.getTime();
      return String(current || '') !== String(value || '');
    });
    return changed ? [{ updateOne: { filter: { _id: entry._id }, update: { $set: snapshot } } }] : [];
  });
  if (snapshotUpdates.length) {
    await Attendance.bulkWrite(snapshotUpdates);
    attendance = await Attendance.find({ meeting: { $in: meetingIds } })
      .populate('member', 'name memberId');
  }
  const byMeeting = new Map();
  attendance.forEach((entry) => {
    const key = String(entry.meeting);
    if (!byMeeting.has(key)) byMeeting.set(key, []);
    byMeeting.get(key).push(entry);
  });
  return meetings.map((meeting) => {
    const result = meeting.toObject();
    delete result.attendance;
    result.attendance = byMeeting.get(String(meeting._id)) || [];
    return result;
  });
}

exports.list = asyncHandler(async (req, res) => {
  const filter = { shg: req.user.shg };
  const meetings = await Meeting.find(filter).sort({ date: 1 });
  res.json(await attachAttendance(meetings));
});

exports.create = asyncHandler(async (req, res) => {
  const { attendance, ...meetingData } = req.body;
  const meeting = await Meeting.create({ ...meetingData, shg: req.user.shg, createdBy: req.user._id });
  await logAction({ shg: meeting.shg, action: 'Meeting Scheduled', entityType: 'Meeting', entityId: meeting._id, after: meeting, performedBy: req.user._id });
  res.status(201).json(meeting);
});

exports.update = asyncHandler(async (req, res) => {
  const { attendance, ...meetingData } = req.body;
  const meeting = await Meeting.findOneAndUpdate({ _id: req.params.id, shg: req.user.shg }, meetingData, { new: true, runValidators: true });
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  await logAction({ shg: meeting.shg, action: 'Meeting Updated', entityType: 'Meeting', entityId: meeting._id, after: meeting, performedBy: req.user._id });
  res.json(meeting);
});

exports.markAttendance = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.id, shg: req.user.shg });
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  const memberIds = (req.body.attendance || []).map((entry) => entry.member);
  const validMembers = await Member.find({ _id: { $in: memberIds }, shg: req.user.shg }).select('_id name memberId');
  const membersById = new Map(validMembers.map((member) => [String(member._id), member]));
  const markedAt = new Date();
  const entries = (req.body.attendance || [])
    .flatMap((entry) => {
      const member = membersById.get(String(entry.member));
      if (!member) return [];
      const present = Boolean(entry.present);
      return [{
        shg: req.user.shg,
        meeting: meeting._id,
        member: member._id,
        memberName: member.name,
        memberId: member.memberId,
        present,
        attendanceStatus: present ? 'Present' : 'Absent',
        markedAt,
        meetingTitle: meeting.title,
        meetingType: meeting.type,
        meetingDate: meeting.date,
        meetingTime: meeting.time || '',
        meetingLocation: meeting.location || '',
        note: String(entry.note || '').trim(),
        markedBy: req.user._id,
      }];
    });
  await Attendance.bulkWrite(entries.map((entry) => ({
    updateOne: {
      filter: { shg: entry.shg, meeting: entry.meeting, member: entry.member },
      update: { $set: entry },
      upsert: true,
    },
  })));
  meeting.status = req.body.status || meeting.status;
  await meeting.save();

  await logAction({ shg: meeting.shg, action: 'Meeting Attendance Marked', entityType: 'Meeting', entityId: meeting._id, after: meeting, performedBy: req.user._id });
  res.json((await attachAttendance([meeting]))[0]);
});

exports.myAttendance = asyncHandler(async (req, res) => {
  if (!req.user.member) return res.json([]);

  const legacyMeetings = await Meeting.find({ shg: req.user.shg, 'attendance.member': req.user.member });
  await migrateLegacyAttendance(legacyMeetings);
  const attendance = await Attendance.find({ shg: req.user.shg, member: req.user.member })
    .populate('meeting', 'title date time location status')
    .sort({ createdAt: -1 });

  res.json(attendance.filter((entry) => entry.meeting).map((entry) => {
    const meeting = entry.meeting;
    return {
      meeting: meeting.title,
      date: meeting.date,
      time: meeting.time,
      location: meeting.location,
      status: entry.present ? 'Present' : 'Absent',
      note: entry.note || '',
      meetingStatus: meeting.status,
    };
  }));
});
