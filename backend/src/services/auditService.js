const AuditLog = require('../models/AuditLog');

async function logAction(data) {
  return AuditLog.create(data);
}

module.exports = { logAction };
