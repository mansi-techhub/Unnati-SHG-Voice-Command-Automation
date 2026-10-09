const Goal = require('../models/Goal');
const EmergencyFund = require('../models/EmergencyFund');
const Document = require('../models/Document');
const GovernmentScheme = require('../models/GovernmentScheme');
const AuditLog = require('../models/AuditLog');
const Transaction = require('../models/Transaction');
const RuleNotice = require('../models/RuleNotice');
const asyncHandler = require('../utils/asyncHandler');
const { createTransaction } = require('../services/financeService');
const { logAction } = require('../services/auditService');

function crud(Model, label) {
  return {
    list: asyncHandler(async (req, res) => {
      const rows = await Model.find({ shg: req.user.shg }).sort({ createdAt: -1 });
      res.json(rows);
    }),
    create: asyncHandler(async (req, res) => {
      const row = await Model.create({ ...req.body, shg: req.user.shg, createdBy: req.user?._id, uploadedBy: req.user?._id });
      res.status(201).json(row);
    }),
    update: asyncHandler(async (req, res) => {
      const row = await Model.findOneAndUpdate({ _id: req.params.id, shg: req.user.shg }, req.body, { new: true, runValidators: true });
      if (!row) return res.status(404).json({ message: `${label} not found` });
      res.json(row);
    }),
  };
}

exports.goals = crud(Goal, 'Goal');
exports.ruleNotices = crud(RuleNotice, 'Rule or notice');
exports.goals.contribute = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Contribution amount must be positive' });
  const goal = await Goal.findOne({ _id: req.params.id, shg: req.user.shg });
  if (!goal) return res.status(404).json({ message: 'Goal not found' });
  if (goal.status !== 'active') return res.status(400).json({ message: 'Only active goals can receive contributions' });
  if (req.body.idempotencyKey) {
    const duplicate = await Transaction.findOne({ shg: goal.shg, idempotencyKey: req.body.idempotencyKey });
    if (duplicate) return res.json({ goal, transaction: duplicate });
  }
  const transaction = await createTransaction({
    shg: goal.shg,
    type: 'goal',
    direction: 'credit',
    amount,
    date: req.body.date,
    description: req.body.note || `Contribution to ${goal.title}`,
    createdBy: req.user._id,
    idempotencyKey: req.body.idempotencyKey,
  });
  goal.savedAmount += amount;
  goal.status = goal.savedAmount >= goal.targetAmount ? 'completed' : 'active';
  goal.contributions.push({ amount, date: req.body.date || new Date(), note: req.body.note, createdBy: req.user._id });
  await goal.save();
  await logAction({ shg: goal.shg, action: 'Goal Contribution Added', entityType: 'Goal', entityId: goal._id, after: goal, performedBy: req.user._id });
  res.status(201).json({ goal, transaction });
});
exports.documents = crud(Document, 'Document');
exports.documents.upload = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please select a PDF or CSV file.' });
  const document = await Document.create({
    name: req.body.name || req.file.originalname,
    category: req.body.category || 'other',
    notes: req.body.notes || '',
    fileUrl: `/uploads/documents/${req.file.filename}`,
    mimeType: req.file.mimetype,
    shg: req.user.shg,
    createdBy: req.user._id,
    uploadedBy: req.user._id,
  });
  res.status(201).json(document);
});
exports.schemes = crud(GovernmentScheme, 'Government scheme');

exports.auditLogs = {
  list: asyncHandler(async (req, res) => {
    const rows = await AuditLog.find(req.query.shg ? { shg: req.query.shg } : {}).populate('performedBy', 'name role').sort({ createdAt: -1 }).limit(100);
    res.json(rows);
  }),
};

exports.emergencyFund = {
  get: asyncHandler(async (req, res) => {
    const fund = await EmergencyFund.findOne({ shg: req.user.shg });
    res.json(fund || { available: 0, used: 0, transactions: [] });
  }),
  update: asyncHandler(async (req, res) => {
    if (req.body.idempotencyKey) {
      const duplicate = await Transaction.findOne({ shg: req.user.shg, idempotencyKey: req.body.idempotencyKey });
      if (duplicate) return res.json({ fund: await EmergencyFund.findOne({ shg: req.user.shg }), transaction: duplicate });
    }
    let fund = await EmergencyFund.findOne({ shg: req.user.shg });
    if (!fund) fund = await EmergencyFund.create({ shg: req.user.shg });
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Emergency fund amount must be positive' });
    if (!['contribution', 'usage', 'return'].includes(req.body.type)) {
      return res.status(400).json({ message: 'Invalid emergency fund transaction type' });
    }
    if (req.body.type === 'usage' && fund.available < amount) {
      return res.status(400).json({ message: 'Emergency fund balance is insufficient' });
    }
    if (req.body.type === 'usage') {
      fund.available = Math.max(0, fund.available - amount);
      fund.used += amount;
    } else if (req.body.type === 'return') {
      fund.available += amount;
      fund.used = Math.max(0, fund.used - amount);
    } else {
      fund.available += amount;
    }
    fund.transactions.push({ type: req.body.type, amount, date: req.body.date || new Date(), purpose: req.body.purpose, createdBy: req.user._id });
    await fund.save();
    const transaction = await createTransaction({
      shg: fund.shg,
      type: 'emergency_fund',
      direction: req.body.type === 'usage' ? 'debit' : 'credit',
      amount,
      description: req.body.purpose || `Emergency fund ${req.body.type}`,
      createdBy: req.user._id,
      idempotencyKey: req.body.idempotencyKey,
    });
    res.json({ fund, transaction });
  }),
};
