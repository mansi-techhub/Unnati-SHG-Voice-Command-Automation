const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', index: true },
    action: { type: String, required: true },
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    summary: String,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
