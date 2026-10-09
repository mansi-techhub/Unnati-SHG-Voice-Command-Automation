const mongoose = require('mongoose');

const savingsSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    dueDate: { type: Date, required: true },
    actualDate: { type: Date, required: true },
    lateDays: { type: Number, default: 0, min: 0 },
    penaltyAmount: { type: Number, default: 0, min: 0 },
    date: { type: Date, default: Date.now },
    receiptNumber: { type: String, required: true, unique: true },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    penaltyTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

savingsSchema.index({ shg: 1, member: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Savings', savingsSchema);
