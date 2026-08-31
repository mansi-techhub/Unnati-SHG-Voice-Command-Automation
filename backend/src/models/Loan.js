const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    loanId: { type: String, required: true, unique: true },
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    purpose: { type: String, required: true },
    interestRate: { type: Number, required: true, min: 0 },
    durationMonths: { type: Number, required: true, min: 1 },
    requestedDate: { type: Date, default: Date.now },
    approvedDate: Date,
    disbursedDate: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'partially_paid', 'completed', 'rejected', 'overdue'],
      default: 'pending',
      index: true,
    },
    principalRepaid: { type: Number, default: 0 },
    interestPaid: { type: Number, default: 0 },
    penaltyPaid: { type: Number, default: 0 },
    outstanding: { type: Number, default: 0 },
    nextDueDate: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);
