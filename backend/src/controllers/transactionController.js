const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');

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
