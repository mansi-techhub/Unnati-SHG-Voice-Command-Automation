const Loan = require('../models/Loan');
const Member = require('../models/Member');
const Repayment = require('../models/Repayment');
const asyncHandler = require('../utils/asyncHandler');
const { createTransaction, calculateMonthlyInterest } = require('../services/financeService');
const { makeId } = require('../utils/id');
const { logAction } = require('../services/auditService');

exports.list = asyncHandler(async (req, res) => {
  const filter = { shg: req.user.shg };
  if (req.user.role === 'member') {
    const member = await Member.findOne({ user: req.user._id, shg: req.user.shg });
    if (!member) return res.json([]);
    filter.member = member._id;
  }
  if (req.user.role === 'admin' && req.query.member) filter.member = req.query.member;
  if (req.query.status) filter.status = req.query.status;
  res.json(await Loan.find(filter).populate('member', 'name memberId').sort({ createdAt: -1 }));
});

exports.apply = asyncHandler(async (req, res) => {
  if (Number(req.body.amount) <= 0 || Number(req.body.durationMonths) <= 0 || Number(req.body.interestRate) < 0) {
    return res.status(400).json({ message: 'Loan amount and duration must be positive and interest cannot be negative' });
  }
  const member = await Member.findOne({ _id: req.body.member, shg: req.user.shg });
  if (!member) return res.status(400).json({ message: 'Member does not belong to this SHG' });
  const loan = await Loan.create({ ...req.body, loanId: req.body.loanId || makeId('LOAN'), outstanding: Number(req.body.amount), createdBy: req.user._id });
  await logAction({ shg: loan.shg, action: 'Loan Applied', entityType: 'Loan', entityId: loan._id, after: loan, performedBy: req.user._id });
  res.status(201).json(loan);
});

exports.approve = asyncHandler(async (req, res) => {
  const loan = await Loan.findOneAndUpdate({ _id: req.params.id, shg: req.user.shg }, { status: 'approved', approvedDate: new Date(), approvedBy: req.user._id }, { new: true });
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  await logAction({ shg: loan.shg, action: 'Loan Approved', entityType: 'Loan', entityId: loan._id, after: loan, performedBy: req.user._id });
  res.json(loan);
});

exports.reject = asyncHandler(async (req, res) => {
  const loan = await Loan.findOneAndUpdate({ _id: req.params.id, shg: req.user.shg }, { status: 'rejected' }, { new: true });
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  await logAction({ shg: loan.shg, action: 'Loan Rejected', entityType: 'Loan', entityId: loan._id, after: loan, performedBy: req.user._id });
  res.json(loan);
});

exports.disburse = asyncHandler(async (req, res) => {
  const loan = await Loan.findOne({ _id: req.params.id, shg: req.user.shg });
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  if (!['approved', 'active'].includes(loan.status)) return res.status(400).json({ message: 'Loan must be approved before distribution' });

  await createTransaction({ shg: loan.shg, member: loan.member, type: 'loan_disbursement', direction: 'debit', amount: loan.amount, date: req.body.date, description: `Loan distribution ${loan.loanId}`, createdBy: req.user._id });
  loan.status = 'active';
  loan.disbursedDate = req.body.date || new Date();
  loan.nextDueDate = req.body.nextDueDate;
  await loan.save();
  await logAction({ shg: loan.shg, action: 'Loan Distributed', entityType: 'Loan', entityId: loan._id, after: loan, performedBy: req.user._id });
  res.json(loan);
});

exports.repay = asyncHandler(async (req, res) => {
  const loan = await Loan.findOne({ _id: req.params.id, shg: req.user.shg });
  if (!loan) return res.status(404).json({ message: 'Loan not found' });

  const principal = Number(req.body.principal || 0);
  const interest = calculateMonthlyInterest(loan.outstanding, loan.interestRate);
  const penalty = Number(req.body.penalty || 0);
  const total = principal + interest + penalty;
  if (principal < 0 || interest < 0 || penalty < 0 || total <= 0) {
    return res.status(400).json({ message: 'Repayment amounts must be non-negative and total must be positive' });
  }
  if (principal > loan.outstanding) {
    return res.status(400).json({ message: 'Principal repayment cannot exceed the outstanding principal' });
  }

  const transaction = await createTransaction({ shg: loan.shg, member: loan.member, type: 'repayment', direction: 'credit', amount: total, date: req.body.date, description: `Repayment for ${loan.loanId}`, createdBy: req.user._id });
  const repayment = await Repayment.create({ repaymentId: makeId('PAY'), shg: loan.shg, loan: loan._id, member: loan.member, principal, interest, penalty, total, date: req.body.date || new Date(), transaction: transaction._id, createdBy: req.user._id });

  loan.principalRepaid += principal;
  loan.interestPaid += interest;
  loan.penaltyPaid += penalty;
  loan.outstanding = Math.max(0, loan.amount - loan.principalRepaid);
  loan.status = loan.outstanding === 0 ? 'completed' : 'partially_paid';
  await loan.save();

  await logAction({ shg: loan.shg, action: 'Loan Repayment Added', entityType: 'Repayment', entityId: repayment._id, after: repayment, performedBy: req.user._id });
  res.status(201).json({ loan, repayment });
});
