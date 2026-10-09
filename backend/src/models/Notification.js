const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['savings', 'loan', 'meeting', 'announcement', 'group'], default: 'announcement' },
    channel: { type: String, enum: ['in_app', 'sms', 'in_app_and_sms', 'whatsapp_ready'], default: 'in_app' },
    deliveryStatus: { type: String, enum: ['not_attempted', 'sent', 'failed', 'unconfigured'], default: 'not_attempted' },
    deliveryError: String,
    sentAt: Date,
    reminderKey: { type: String, index: true },
    read: { type: Boolean, default: false },
    scheduledFor: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
