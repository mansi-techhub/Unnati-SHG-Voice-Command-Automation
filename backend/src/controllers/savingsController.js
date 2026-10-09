const Savings = require('../models/Savings');
const Member = require('../models/Member');
const SHG = require('../models/SHG');
const asyncHandler = require('../utils/asyncHandler');
const { createTransaction } = require('../services/financeService');
const { makeId } = require('../utils/id');
const { logAction } = require('../services/auditService');

function parseDate(value, label) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid ${label}`);
    error.statusCode = 400;
    throw error;
  }
  return date;
}

function getDueDate(month, dueDay) {
  const match = String(month || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    const error = new Error('Month must be in YYYY-MM format');
    error.statusCode = 400;
    throw error;
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(Math.max(Number(dueDay) || 1, 1), lastDay));
}

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.shg) filter.shg = req.query.shg;
  if (req.query.member) filter.member = req.query.member;
  if (req.query.month) filter.month = req.query.month;
  res.json(await Savings.find(filter).populate('member', 'name memberId').sort({ date: -1 }));
});

exports.create = asyncHandler(async (req, res) => {
  const member = await Member.findOne({ _id: req.body.member, shg: req.user.shg });
  if (!member) return res.status(400).json({ message: 'Member does not belong to this SHG' });
  const shg = await SHG.findById(req.user.shg).select('monthlySavingsDueDay latePenaltyAmount');
  if (!shg || String(req.body.shg) !== String(req.user.shg)) return res.status(400).json({ message: 'Savings must belong to your SHG' });
  const existing = await Savings.findOne({ shg: req.body.shg, member: req.body.member, month: req.body.month });
  if (existing) {
    return res.status(409).json({ message: 'Savings for this member and month already exists', savings: existing });
  }
  const dueDate = req.body.dueDate ? parseDate(req.body.dueDate, 'due date') : getDueDate(req.body.month, shg.monthlySavingsDueDay);
  const actualDate = parseDate(req.body.actualDate || req.body.date, 'actual payment date');
  const lateDays = Math.max(0, Math.floor((actualDate - dueDate) / 86400000));
  const penaltyAmount = Math.round(lateDays * Number(shg.latePenaltyAmount || 0) * 100) / 100;
  const transaction = await createTransaction({
    shg: req.body.shg,
    member: req.body.member,
    type: 'savings',
    direction: 'credit',
    amount: Number(req.body.amount),
    date: actualDate,
    description: req.body.notes || `Savings for ${req.body.month}`,
    createdBy: req.user._id,
    idempotencyKey: req.body.idempotencyKey || `savings:${req.body.shg}:${req.body.member}:${req.body.month}`,
  });

  let savings;
  try {
    savings = await Savings.create({
      ...req.body,
      dueDate,
      actualDate,
      lateDays,
      penaltyAmount,
      date: actualDate,
      receiptNumber: req.body.receiptNumber || makeId('SAV'),
      transaction: transaction._id,
      createdBy: req.user._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = await Savings.findOne({ shg: req.body.shg, member: req.body.member, month: req.body.month });
      return res.status(409).json({ message: 'Savings for this member and month already exists', savings: duplicate });
    }
    throw error;
  }

  if (penaltyAmount > 0) {
    const penaltyTransaction = await createTransaction({
      shg: req.body.shg,
      member: req.body.member,
      type: 'penalty',
      direction: 'credit',
      amount: penaltyAmount,
      date: actualDate,
      description: `Late savings penalty for ${req.body.month}`,
      createdBy: req.user._id,
      idempotencyKey: `savings-penalty:${req.body.shg}:${req.body.member}:${req.body.month}`,
    });
    savings.penaltyTransaction = penaltyTransaction._id;
    await savings.save();
  }

  await logAction({ shg: savings.shg, action: 'Savings Added', entityType: 'Savings', entityId: savings._id, after: savings, performedBy: req.user._id });
  res.status(201).json(savings);
});
