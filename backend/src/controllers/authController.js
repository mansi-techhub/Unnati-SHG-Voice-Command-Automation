const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SHG = require('../models/SHG');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { makeId } = require('../utils/id');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sendAuth(res, user, status = 200) {
  const safeUser = user.toObject ? user.toObject() : user;
  delete safeUser.password;
  res.status(status).json({ token: signToken(user), user: safeUser });
}

exports.register = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
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
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'admin',
    language,
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
});

exports.registerMember = asyncHandler(async (req, res) => {
  const { name, phone, email, password, language } = req.body;
  const loginEmail = email || `${phone}@unnati-member.local`;
  const user = await User.create({
    name,
    email: loginEmail,
    phone,
    password,
    role: 'member',
    language,
  });
  sendAuth(res, user, 201);
});

exports.loginWithShg = asyncHandler(async (req, res) => {
  const { shgCode, role, name, password } = req.body;
  const shg = await SHG.findOne({ shgId: shgCode });
  if (!shg) return res.status(404).json({ message: 'SHG code not found' });

  let user;
  if (role === 'president') {
    user = await User.findOne({ shg: shg._id, role: 'admin' }).select('+password');
  } else {
    const member = await Member.findOne({ shg: shg._id, name: new RegExp(`^${name}$`, 'i') });
    user = member?.user ? await User.findById(member.user).select('+password') : null;
    if (!user) {
      user = await User.findOne({ name: new RegExp(`^${name}$`, 'i'), role: 'member' }).select('+password');
      if (user) {
        const joinedMember = await Member.create({
          shg: shg._id,
          user: user._id,
          memberId: makeId('MBR'),
          name: user.name,
          phone: user.phone,
          email: user.email,
          roleInGroup: 'Member',
        });
        user.shg = shg._id;
        user.member = joinedMember._id;
        await user.save();
      }
    }
  }

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid login details' });
  }

  sendAuth(res, user);
});

exports.login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  sendAuth(res, user);
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  res.json({ message: 'Password reset email architecture is ready. Configure email service to send reset links.' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  res.json({ message: 'Reset password endpoint ready for token validation and email integration.' });
});
