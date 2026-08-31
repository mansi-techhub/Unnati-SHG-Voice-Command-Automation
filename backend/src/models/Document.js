const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, enum: ['registration', 'bank', 'meeting', 'loan', 'government', 'other'], default: 'other' },
    fileUrl: String,
    mimeType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
