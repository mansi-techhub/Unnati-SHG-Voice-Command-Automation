const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.shg) filter.shg = req.query.shg;
  if (req.query.member) filter.member = req.query.member;
  res.json(await Notification.find(filter).sort({ createdAt: -1 }));
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await Notification.create({ ...req.body, createdBy: req.user._id }));
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json(notification);
});
