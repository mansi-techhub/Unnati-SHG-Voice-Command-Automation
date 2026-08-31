const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema(
  {
    repaymentId: { type: String, required: true, unique: true },
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    principal: { type: Number, default: 0, min: 0 },
    interest: { type: Number, default: 0, min: 0 },
    penalty: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 1 },
    date: { type: Date, default: Date.now },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Repayment', repaymentSchema);
