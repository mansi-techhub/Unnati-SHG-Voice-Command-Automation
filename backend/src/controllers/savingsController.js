const Savings = require('../models/Savings');
const asyncHandler = require('../utils/asyncHandler');
const { createTransaction } = require('../services/financeService');
const { makeId } = require('../utils/id');
const { logAction } = require('../services/auditService');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.shg) filter.shg = req.query.shg;
  if (req.query.member) filter.member = req.query.member;
  if (req.query.month) filter.month = req.query.month;
  res.json(await Savings.find(filter).populate('member', 'name memberId').sort({ date: -1 }));
});

exports.create = asyncHandler(async (req, res) => {
  const transaction = await createTransaction({
    shg: req.body.shg,
    member: req.body.member,
    type: 'savings',
    direction: 'credit',
    amount: Number(req.body.amount),
    date: req.body.date,
    description: req.body.notes || `Savings for ${req.body.month}`,
    createdBy: req.user._id,
    idempotencyKey: req.body.idempotencyKey,
  });

  const savings = await Savings.create({
    ...req.body,
    receiptNumber: req.body.receiptNumber || makeId('SAV'),
    transaction: transaction._id,
    createdBy: req.user._id,
  });

  await logAction({ shg: savings.shg, action: 'Savings Added', entityType: 'Savings', entityId: savings._id, after: savings, performedBy: req.user._id });
  res.status(201).json(savings);
});
