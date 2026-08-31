const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { makeId } = require('../utils/id');
const { logAction } = require('../services/auditService');

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
  const member = await Member.findById(req.params.id);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json(member);
});

exports.update = asyncHandler(async (req, res) => {
  const before = await Member.findById(req.params.id);
  if (!before) return res.status(404).json({ message: 'Member not found' });
  const member = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await logAction({ shg: member.shg, action: 'Member Updated', entityType: 'Member', entityId: member._id, before, after: member, performedBy: req.user._id });
  res.json(member);
});
