const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SHG = require('../models/SHG');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { makeId } = require('../utils/id');
const crypto = require('crypto');

function signToken(user, accessRole = user.role) {
  return jwt.sign({ id: user._id, role: accessRole }, process.env.JWT_SECRET || 'development-only-secret-change-me', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sendAuth(res, user, status = 200, accessRole = user.role) {
  const safeUser = user.toObject ? user.toObject() : user;
  delete safeUser.password;
  safeUser.role = accessRole;
  res.status(status).json({ token: signToken(user, accessRole), user: safeUser, accessRole });
}

exports.register = asyncHandler(async (req, res) => {
  const user = await User.create({
    ...req.body,
    language: req.body.language || 'en',
  });
  sendAuth(res, user, 201);
});

exports.registerPresident = asyncHandler(async (req, res) => {
  const {
    shgName,
    depositAmount,
    monthlySavingsAmount,
    startMonth,
    name,
    phone,
    email,
    password,
    language,
  } = req.body;

  const shgId = req.body.shgId || makeId('SHG');
  let user;
  try {
    user = await User.create({
      name, email, phone, password, role: 'admin', language: language || 'en',
    });
    const shg = await SHG.create({
      name: shgName,
      shgId,
      formationDate: startMonth ? new Date(startMonth) : new Date(),
      presidentName: name,
      contactPhone: phone,
      contactEmail: email,
      monthlySavingsAmount,
      createdBy: user._id,
    });
    const member = await Member.create({
      shg: shg._id,
      user: user._id,
      memberId: makeId('MBR'),
      name,
      phone,
      email,
      roleInGroup: 'President',
      notes: depositAmount ? `Opening deposit: ${depositAmount}` : undefined,
    });
    user.shg = shg._id;
    user.member = member._id;
    await user.save();
    sendAuth(res, user, 201);
  } catch (error) {
    if (user?._id) await User.findByIdAndDelete(user._id);
    throw error;
  }
});

exports.registerMember = asyncHandler(async (req, res) => {
  const { name, phone, email, password, language, shgCode } = req.body;
  const loginEmail = email || `${phone}@unnati-member.local`;
  const shg = shgCode
    ? await SHG.findOne({ shgId: String(shgCode).trim().toUpperCase() })
    : null;
  if (shgCode && !shg) return res.status(404).json({ message: 'SHG code not found' });
  const user = await User.create({
    name,
    email: loginEmail,
    phone,
    password,
    role: 'member',
    language: language || 'en',
  });
  if (shg) {
    const member = await Member.create({
      shg: shg._id, user: user._id, memberId: makeId('MBR'),
      name, phone, email: loginEmail, roleInGroup: 'Member',
    });
    user.shg = shg._id;
    user.member = member._id;
    await user.save();
  }
  sendAuth(res, user, 201);
});

exports.loginWithShg = asyncHandler(async (req, res) => {
  const { shgCode, role, name, password } = req.body;
  const shg = await SHG.findOne({ shgId: String(shgCode).trim().toUpperCase() });
  if (!shg) return res.status(404).json({ message: 'SHG code not found' });

  let user;
  if (role === 'president' || role === 'president-member') {
    user = await User.findOne({ shg: shg._id, role: 'admin' }).select('+password');
  } else {
    const member = await Member.findOne({ shg: shg._id, name: new RegExp(`^${name}$`, 'i') });
    user = member?.user ? await User.findById(member.user).select('+password') : null;
  }

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid login details' });
  }

  const accessRole = role === 'president' ? 'admin' : 'member';
  sendAuth(res, user, 200, accessRole);
});

exports.lookupShg = asyncHandler(async (req, res) => {
  const shg = await SHG.findOne({ shgId: String(req.params.code).trim().toUpperCase() })
    .select('name shgId presidentName');
  if (!shg) return res.status(404).json({ message: 'SHG code not found' });
  const members = await Member.find({ shg: shg._id, status: { $ne: 'inactive' } })
    .select('name memberId roleInGroup')
    .sort({ name: 1 })
    .lean();
  res.json({ name: shg.name, shgId: shg.shgId, presidentName: shg.presidentName, members });
});

exports.login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  sendAuth(res, user);
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
  if (!user) return res.json({ message: 'If the account exists, a password reset token has been generated.' });
  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  const response = { message: 'Password reset token generated. It expires in 15 minutes.' };
  if (process.env.NODE_ENV !== 'production') response.resetToken = token;
  res.json(response);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body.token || '');
  const user = await User.findOne({
    resetPasswordToken: crypto.createHash('sha256').update(token).digest('hex'),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password');
  if (!user) return res.status(400).json({ message: 'Invalid or expired password reset token' });
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json({ message: 'Password updated successfully' });
});
