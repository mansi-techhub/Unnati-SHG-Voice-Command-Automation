const Transaction = require('../models/Transaction');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { createTransaction } = require('../services/financeService');
const { logAction } = require('../services/auditService');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.shg) filter.shg = req.query.shg;
  if (req.query.member) filter.member = req.query.member;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  res.json(await Transaction.find(filter).populate('member', 'name memberId').sort({ date: -1, createdAt: -1 }));
});

exports.create = asyncHandler(async (req, res) => {
  if (req.body.member) {
    const member = await Member.findOne({ _id: req.body.member, shg: req.user.shg });
    if (!member) return res.status(400).json({ message: 'Member does not belong to this SHG' });
  }
  const transaction = await createTransaction({ ...req.body, amount: Number(req.body.amount), createdBy: req.user._id });
  await logAction({
    shg: transaction.shg,
    action: 'Transaction Added',
    entityType: 'Transaction',
    entityId: transaction._id,
    after: transaction,
    performedBy: req.user._id,
  });
  res.status(201).json(transaction);
});
