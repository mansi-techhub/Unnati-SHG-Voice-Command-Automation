const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['meeting', 'event'], default: 'meeting' },
    date: { type: Date, required: true },
    time: String,
    location: String,
    agenda: String,
    minutes: String,
    decisions: [String],
    actionItems: [String],
    // Kept read-compatible for one-time migration of older meeting documents.
    attendance: [{ member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' }, present: Boolean, note: String }],
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Meeting', meetingSchema);
