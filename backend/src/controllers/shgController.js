const SHG = require('../models/SHG');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../services/auditService');

exports.list = asyncHandler(async (req, res) => {
  res.json(await SHG.find().sort({ createdAt: -1 }));
});

exports.create = asyncHandler(async (req, res) => {
  const shg = await SHG.create({ ...req.body, createdBy: req.user._id });
  await logAction({ shg: shg._id, action: 'SHG Created', entityType: 'SHG', entityId: shg._id, after: shg, performedBy: req.user._id });
  res.status(201).json(shg);
});

exports.get = asyncHandler(async (req, res) => {
  const shg = await SHG.findById(req.params.id);
  if (!shg) return res.status(404).json({ message: 'SHG not found' });
  res.json(shg);
});

exports.update = asyncHandler(async (req, res) => {
  const before = await SHG.findById(req.params.id);
  if (!before) return res.status(404).json({ message: 'SHG not found' });
  const shg = await SHG.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await logAction({ shg: shg._id, action: 'SHG Updated', entityType: 'SHG', entityId: shg._id, before, after: shg, performedBy: req.user._id });
  res.json(shg);
});
