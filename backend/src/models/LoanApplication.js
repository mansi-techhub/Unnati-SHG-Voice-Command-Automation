const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema(
  {
    applicationId: { type: String, required: true, unique: true },
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    purpose: { type: String, required: true, trim: true },
    purposeDetails: { type: String, trim: true, default: '' },
    durationMonths: { type: Number, required: true, min: 1 },
    repaymentPlan: { type: String, required: true, trim: true },
    monthlyIncome: { type: Number, required: true, min: 0 },
    existingLoanDetails: { type: String, trim: true, default: '' },
    requestedDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    decisionNote: { type: String, trim: true, default: '' },
    decidedAt: Date,
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
