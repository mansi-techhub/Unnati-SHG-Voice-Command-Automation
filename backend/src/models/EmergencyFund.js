const mongoose = require('mongoose');

const emergencyFundSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, unique: true },
    available: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 },
    transactions: [{ type: { type: String, enum: ['contribution', 'usage', 'return'], required: true }, amount: { type: Number, required: true }, date: { type: Date, default: Date.now }, purpose: String, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmergencyFund', emergencyFundSchema);
