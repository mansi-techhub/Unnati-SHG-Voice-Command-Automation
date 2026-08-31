const Meeting = require('../models/Meeting');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../services/auditService');

exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.shg ? { shg: req.query.shg } : {};
  res.json(await Meeting.find(filter).populate('attendance.member', 'name memberId').sort({ date: 1 }));
});

exports.create = asyncHandler(async (req, res) => {
  const meeting = await Meeting.create({ ...req.body, createdBy: req.user._id });
  await logAction({ shg: meeting.shg, action: 'Meeting Scheduled', entityType: 'Meeting', entityId: meeting._id, after: meeting, performedBy: req.user._id });
  res.status(201).json(meeting);
});

exports.update = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  await logAction({ shg: meeting.shg, action: 'Meeting Updated', entityType: 'Meeting', entityId: meeting._id, after: meeting, performedBy: req.user._id });
  res.json(meeting);
});

exports.markAttendance = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  meeting.attendance = (req.body.attendance || []).map((entry) => ({
    member: entry.member,
    present: Boolean(entry.present),
  }));
  meeting.status = req.body.status || meeting.status;
  await meeting.save();

  await logAction({ shg: meeting.shg, action: 'Meeting Attendance Marked', entityType: 'Meeting', entityId: meeting._id, after: meeting, performedBy: req.user._id });
  res.json(await meeting.populate('attendance.member', 'name memberId'));
});

exports.myAttendance = asyncHandler(async (req, res) => {
  if (!req.user.member) return res.json([]);

  const meetings = await Meeting.find({ 'attendance.member': req.user.member })
    .select('title date time location attendance status')
    .sort({ date: -1 });

  res.json(meetings.map((meeting) => {
    const attendance = meeting.attendance.find((entry) => entry.member.toString() === req.user.member.toString());
    return {
      meeting: meeting.title,
      date: meeting.date,
      time: meeting.time,
      location: meeting.location,
      status: attendance?.present ? 'Present' : 'Absent',
      meetingStatus: meeting.status,
    };
  }));
});
