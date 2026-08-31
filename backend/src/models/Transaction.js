const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    type: {
      type: String,
      enum: ['savings', 'loan_disbursement', 'repayment', 'interest', 'penalty', 'expense', 'income', 'emergency_fund', 'goal'],
      required: true,
      index: true,
    },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, default: 0 },
    date: { type: Date, required: true, index: true },
    description: String,
    idempotencyKey: { type: String, sparse: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

transactionSchema.index({ shg: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
