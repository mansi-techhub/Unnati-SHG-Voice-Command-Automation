const mongoose = require('mongoose');

const governmentSchemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    eligibility: String,
    benefits: String,
    requiredDocuments: [String],
    officialSource: { type: String, required: true },
    applicationInfo: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GovernmentScheme', governmentSchemeSchema);
