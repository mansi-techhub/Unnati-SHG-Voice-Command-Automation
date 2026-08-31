const Goal = require('../models/Goal');
const EmergencyFund = require('../models/EmergencyFund');
const Document = require('../models/Document');
const GovernmentScheme = require('../models/GovernmentScheme');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

function crud(Model, label) {
  return {
    list: asyncHandler(async (req, res) => {
      const rows = await Model.find(req.query.shg ? { shg: req.query.shg } : {}).sort({ createdAt: -1 });
      res.json(rows);
    }),
    create: asyncHandler(async (req, res) => {
      const row = await Model.create({ ...req.body, createdBy: req.user?._id, uploadedBy: req.user?._id });
      res.status(201).json(row);
    }),
    update: asyncHandler(async (req, res) => {
      const row = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!row) return res.status(404).json({ message: `${label} not found` });
      res.json(row);
    }),
  };
}

exports.goals = crud(Goal, 'Goal');
exports.documents = crud(Document, 'Document');
exports.schemes = crud(GovernmentScheme, 'Government scheme');

exports.auditLogs = {
  list: asyncHandler(async (req, res) => {
    const rows = await AuditLog.find(req.query.shg ? { shg: req.query.shg } : {}).populate('performedBy', 'name role').sort({ createdAt: -1 }).limit(100);
    res.json(rows);
  }),
};

exports.emergencyFund = {
  get: asyncHandler(async (req, res) => {
    const fund = await EmergencyFund.findOne({ shg: req.query.shg });
    res.json(fund || { available: 0, used: 0, transactions: [] });
  }),
  update: asyncHandler(async (req, res) => {
    let fund = await EmergencyFund.findOne({ shg: req.body.shg });
    if (!fund) fund = await EmergencyFund.create({ shg: req.body.shg });
    const amount = Number(req.body.amount || 0);
    if (req.body.type === 'usage') {
      fund.available = Math.max(0, fund.available - amount);
      fund.used += amount;
    } else {
      fund.available += amount;
    }
    fund.transactions.push({ type: req.body.type, amount, purpose: req.body.purpose, createdBy: req.user._id });
    await fund.save();
    res.json(fund);
  }),
};
