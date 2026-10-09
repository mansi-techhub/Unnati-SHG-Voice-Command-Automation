const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    memberName: { type: String, trim: true },
    memberId: { type: String, trim: true },
    present: { type: Boolean, default: false },
    attendanceStatus: { type: String, enum: ['Present', 'Absent'] },
    markedAt: { type: Date, default: Date.now },
    meetingTitle: { type: String, trim: true },
    meetingType: { type: String, enum: ['meeting', 'event'] },
    meetingDate: Date,
    meetingTime: String,
    meetingLocation: { type: String, trim: true },
    note: { type: String, trim: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

attendanceSchema.index({ shg: 1, meeting: 1, member: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
