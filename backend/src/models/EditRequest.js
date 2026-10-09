const mongoose = require('mongoose');

const editRequestSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    memberName: { type: String, required: true, trim: true },
    memberId: { type: String, trim: true },
    category: { type: String, enum: ['savings', 'loan', 'attendance', 'passbook'], required: true },
    reference: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'rejected'], default: 'pending' },
    adminResponse: { type: String, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('EditRequest', editRequestSchema);
