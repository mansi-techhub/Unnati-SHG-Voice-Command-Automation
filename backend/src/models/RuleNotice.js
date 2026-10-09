const mongoose = require('mongoose');

const ruleNoticeSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    kind: { type: String, enum: ['rule', 'notice'], required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    isPublished: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RuleNotice', ruleNoticeSchema);
