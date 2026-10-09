const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const Member = require('../models/Member');
const { sendSms } = require('../services/smsProvider');
const { sendDueReminders } = require('../services/reminderService');
const { getPaymentCompliance, sendPaymentReminders } = require('../services/paymentComplianceService');

exports.list = asyncHandler(async (req, res) => {
  const filter = { shg: req.user.shg };
  if (req.user.role !== 'admin') filter.member = req.user.member;
  else if (req.query.member) filter.member = req.query.member;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 });
  const seen = new Set();
  const unique = notifications.filter((notification) => {
    const key = notification.reminderKey || `${notification.title}|${notification.message}|${notification.type}|${notification.member || 'group'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  res.json(unique);
});

exports.create = asyncHandler(async (req, res) => {
  const { member, title, message, sendSms: requestSms } = req.body;
  const shg = req.user.shg;
  const targets = member
    ? await Member.find({ _id: member, shg }).select('phone')
    : await Member.find({ shg, status: 'active' }).select('phone');
  // SMS is attempted by default for admin broadcasts; `sendSms: false`
  // explicitly opts out while retaining the in-app notification.
  const shouldSend = requestSms !== false && requestSms !== 'false';
  let delivery = { status: 'not_attempted' };
  if (shouldSend && targets.length) {
    const deliveries = await Promise.all(targets.map((target) => sendSms({ to: target.phone, body: message })));
    const failed = deliveries.find((item) => item.status === 'failed');
    const sent = deliveries.some((item) => item.status === 'sent');
    delivery = {
      status: failed && !sent ? 'failed' : sent ? 'sent' : 'unconfigured',
      error: failed?.error || deliveries.find((item) => item.error)?.error,
    };
  }
  const notification = await Notification.create({
    ...req.body,
    shg,
    member: member || undefined,
    channel: shouldSend ? 'in_app_and_sms' : 'in_app',
    deliveryStatus: delivery.status,
    deliveryError: delivery.error,
    sentAt: delivery.status === 'sent' ? new Date() : undefined,
    createdBy: req.user._id,
  });
  res.status(201).json(notification);
});

exports.createMemberMessage = asyncHandler(async (req, res) => {
  const memberId = String(req.body.member || '');
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (!mongoose.isValidObjectId(memberId)) {
    return res.status(400).json({ message: 'A valid member is required' });
  }
  if (!message || message.length > 1000) {
    return res.status(400).json({ message: 'Message must contain between 1 and 1000 characters' });
  }
  const member = await Member.findOne({ _id: memberId, shg: req.user.shg }).select('_id name');
  if (!member) return res.status(404).json({ message: 'Member not found in this SHG' });

  const notification = await Notification.create({
    shg: req.user.shg,
    member: member._id,
    title: 'Message from your SHG',
    message,
    type: 'announcement',
    channel: 'in_app',
    deliveryStatus: 'not_attempted',
    createdBy: req.user._id,
  });
  res.status(201).json({ notification, recipient: { id: member._id, name: member.name } });
});

exports.triggerReminders = asyncHandler(async (req, res) => {
  const notifications = await sendDueReminders({ daysAhead: req.body.daysAhead ?? req.query.daysAhead ?? 3 });
  res.json({ count: notifications.length, notifications });
});

exports.paymentCompliance = asyncHandler(async (req, res) => {
  const { year, period, paymentType } = req.query;
  res.json(await getPaymentCompliance({ shg: req.user.shg, year, period, paymentType }));
});

exports.sendPaymentReminders = asyncHandler(async (req, res) => {
  const { year, period, paymentType, language = 'en', memberIds } = req.body;
  if (!['en', 'hi', 'mr'].includes(language)) {
    return res.status(400).json({ message: 'Unsupported reminder language' });
  }
  if (memberIds !== undefined && (!Array.isArray(memberIds)
    || memberIds.length > 500
    || memberIds.some((memberId) => typeof memberId !== 'string' || memberId.length > 100))) {
    return res.status(400).json({ message: 'Invalid reminder recipient list' });
  }
  res.json(await sendPaymentReminders({
    shg: req.user.shg,
    year,
    period,
    paymentType,
    language,
    memberIds,
    createdBy: req.user._id,
  }));
});

exports.markRead = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, shg: req.user.shg };
  if (req.user.role !== 'admin') filter.member = req.user.member;
  const notification = await Notification.findOneAndUpdate(filter, { read: true }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json(notification);
});
