const LoanApplication = require('../models/LoanApplication');
const Loan = require('../models/Loan');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { makeId } = require('../utils/id');
const { logAction } = require('../services/auditService');

exports.list = asyncHandler(async (req, res) => {
  const filter = { shg: req.user.shg };
  if (req.user.role === 'member') {
    const member = await Member.findOne({ user: req.user._id, shg: req.user.shg });
    if (!member) return res.json([]);
    filter.member = member._id;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }
  res.json(await LoanApplication.find(filter).populate('member', 'name memberId').populate('loan', 'loanId status').sort({ createdAt: -1 }));
});

exports.create = asyncHandler(async (req, res) => {
  if (req.user.role !== 'member') return res.status(403).json({ message: 'Only members can submit loan applications' });
  const member = await Member.findOne({ user: req.user._id, _id: req.body.member, shg: req.user.shg });
  if (!member) return res.status(400).json({ message: 'Member profile does not belong to this SHG' });
  if (Number(req.body.amount) <= 0 || Number(req.body.durationMonths) <= 0 || Number(req.body.monthlyIncome) < 0) {
    return res.status(400).json({ message: 'Amount and duration must be positive and monthly income cannot be negative' });
  }
  const pending = await LoanApplication.exists({ shg: req.user.shg, member: member._id, status: 'pending' });
  if (pending) return res.status(409).json({ message: 'You already have a pending loan application' });
  const application = await LoanApplication.create({
    applicationId: makeId('APP'),
    shg: req.user.shg,
    member: member._id,
    amount: Number(req.body.amount),
    purpose: String(req.body.purpose).trim(),
    purposeDetails: String(req.body.purposeDetails || '').trim(),
    durationMonths: Number(req.body.durationMonths),
    repaymentPlan: String(req.body.repaymentPlan).trim(),
    monthlyIncome: Number(req.body.monthlyIncome),
    existingLoanDetails: String(req.body.existingLoanDetails || '').trim(),
    createdBy: req.user._id,
  });
  await logAction({ shg: application.shg, action: 'Loan Application Submitted', entityType: 'LoanApplication', entityId: application._id, after: application, performedBy: req.user._id });
  res.status(201).json(application);
});

async function findApplication(req, res) {
  const application = await LoanApplication.findOne({ _id: req.params.id, shg: req.user.shg });
  if (!application) {
    res.status(404).json({ message: 'Loan application not found' });
    return null;
  }
  return application;
}

exports.approve = asyncHandler(async (req, res) => {
  const application = await findApplication(req, res);
  if (!application) return;
  if (application.status !== 'pending') return res.status(400).json({ message: 'Only pending applications can be decided' });
  if (Number(req.body.interestRate) < 0) return res.status(400).json({ message: 'Interest rate cannot be negative' });
  const loan = await Loan.create({
    loanId: makeId('LOAN'),
    shg: application.shg,
    member: application.member,
    amount: application.amount,
    purpose: application.purpose,
    interestRate: Number(req.body.interestRate ?? 0),
    durationMonths: application.durationMonths,
    requestedDate: application.requestedDate,
    status: 'approved',
    outstanding: application.amount,
    createdBy: req.user._id,
  });
  application.status = 'approved';
  application.decisionNote = String(req.body.decisionNote || '').trim();
  application.decidedAt = new Date();
  application.decidedBy = req.user._id;
  application.loan = loan._id;
  await application.save();
  await logAction({ shg: application.shg, action: 'Loan Application Approved', entityType: 'LoanApplication', entityId: application._id, after: application, performedBy: req.user._id });
  res.json({ application, loan });
});

exports.reject = asyncHandler(async (req, res) => {
  const application = await findApplication(req, res);
  if (!application) return;
  if (application.status !== 'pending') return res.status(400).json({ message: 'Only pending applications can be decided' });
  application.status = 'rejected';
  application.decisionNote = String(req.body.decisionNote || '').trim();
  application.decidedAt = new Date();
  application.decidedBy = req.user._id;
  await application.save();
  await logAction({ shg: application.shg, action: 'Loan Application Rejected', entityType: 'LoanApplication', entityId: application._id, after: application, performedBy: req.user._id });
  res.json(application);
});
