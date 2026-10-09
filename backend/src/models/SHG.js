const mongoose = require('mongoose');

const shgSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shgId: { type: String, required: true, unique: true, trim: true },
    formationDate: Date,
    village: String,
    taluka: String,
    district: String,
    state: String,
    presidentName: String,
    contactPhone: String,
    contactEmail: String,
    monthlySavingsAmount: { type: Number, default: 0, min: 0 },
    monthlySavingsDueDay: { type: Number, min: 1, max: 28, default: 1 },
    loanInterestRate: { type: Number, default: 2, min: 0 },
    savingsInterestRate: { type: Number, default: 0, min: 0 },
    latePenaltyAmount: { type: Number, default: 50, min: 0 },
    bank: {
      name: String,
      branch: String,
      accountNumberMasked: String,
      ifsc: String,
    },
    rules: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

shgSchema.index({ name: 'text', village: 'text', district: 'text' });

module.exports = mongoose.model('SHG', shgSchema);
