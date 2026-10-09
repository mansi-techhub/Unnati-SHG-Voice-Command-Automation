const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { makeId } = require('../utils/id');
const { logAction } = require('../services/auditService');
const Loan = require('../models/Loan');
const Savings = require('../models/Savings');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.shg) filter.shg = req.query.shg;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.$text = { $search: req.query.q };
  res.json(await Member.find(filter).sort({ name: 1 }));
});

exports.create = asyncHandler(async (req, res) => {
  const member = await Member.create({ ...req.body, memberId: req.body.memberId || makeId('MBR') });
  await logAction({ shg: member.shg, action: 'Member Added', entityType: 'Member', entityId: member._id, after: member, performedBy: req.user._id });
  res.status(201).json(member);
});

exports.get = asyncHandler(async (req, res) => {
  const member = await Member.findOne({ _id: req.params.id, shg: req.user.shg });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json(member);
});

exports.update = asyncHandler(async (req, res) => {
  const before = await Member.findOne({ _id: req.params.id, shg: req.user.shg });
  if (!before) return res.status(404).json({ message: 'Member not found' });
  const member = await Member.findOneAndUpdate({ _id: req.params.id, shg: req.user.shg }, req.body, { new: true, runValidators: true });
  await logAction({ shg: member.shg, action: 'Member Updated', entityType: 'Member', entityId: member._id, before, after: member, performedBy: req.user._id });
  res.json(member);
});

exports.remove = asyncHandler(async (req, res) => {
  const member = await Member.findOne({ _id: req.params.id, shg: req.user.shg });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (member.roleInGroup?.toLowerCase() === 'president') {
    return res.status(400).json({ message: 'The SHG president cannot be removed' });
  }
  const outstandingLoan = await Loan.findOne({ member: member._id, outstanding: { $gt: 0 } });
  if (outstandingLoan) {
    return res.status(409).json({ message: 'Settle the member loan before removal' });
  }
  await Promise.all([
    Savings.deleteMany({ member: member._id }),
    Member.deleteOne({ _id: member._id }),
  ]);
  await logAction({ shg: member.shg, action: 'Member Removed', entityType: 'Member', entityId: member._id, before: member, performedBy: req.user._id });
  res.json({ message: 'Member removed successfully', id: member._id });
});
