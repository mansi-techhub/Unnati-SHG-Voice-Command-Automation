const mongoose = require('mongoose');

const paymentCollectionSchema = new mongoose.Schema(
  {
    paymentType: {
      type: String,
      enum: ['monthly_savings', 'loan_emi'],
      required: true,
      index: true,
    },
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', index: true },
    amount: { type: Number, required: true, min: 0.01 },
    interestAmount: { type: Number, min: 0, default: 0 },
    dueDate: { type: Date, required: true },
    receivedDate: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'phonepe', 'upi', 'bank_transfer'],
      required: true,
    },
    reference: { type: String, trim: true },
    receipt: { type: String, trim: true },
    lateDays: { type: Number, required: true, min: 0, default: 0 },
    penaltyAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0.01 },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    savings: { type: mongoose.Schema.Types.ObjectId, ref: 'Savings' },
    repayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Repayment' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

paymentCollectionSchema.index({ shg: 1, receivedDate: -1 });

module.exports = mongoose.model('PaymentCollection', paymentCollectionSchema);
