const Member = require('../models/Member');
const SHG = require('../models/SHG');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const PaymentCollection = require('../models/PaymentCollection');
const asyncHandler = require('../utils/asyncHandler');
const { createTransaction, calculateMonthlyInterest } = require('../services/financeService');
const { makeId } = require('../utils/id');
const { logAction } = require('../services/auditService');

function asDate(value, fallback) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = value ? new Date(value) : fallback;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.shg) filter.shg = req.query.shg;
  if (req.query.member) filter.member = req.query.member;
  if (req.query.paymentType) filter.paymentType = req.query.paymentType;
  res.json(
    await PaymentCollection.find(filter)
      .populate('member', 'name memberId')
      .populate('loan', 'loanId')
      .sort({ receivedDate: -1, createdAt: -1 })
  );
});

exports.create = asyncHandler(async (req, res) => {
  const { paymentType, shg: shgId, member: memberId } = req.body;
  const amount = Number(req.body.amount);
  let interestAmount = Number(req.body.interestAmount || 0);
  if (paymentType !== 'loan_emi' || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(interestAmount) || interestAmount < 0) {
    return res.status(400).json({ message: 'This collection module accepts loan EMI payments only' });
  }

  const [shg, member] = await Promise.all([SHG.findById(shgId), Member.findById(memberId)]);
  if (!shg) return res.status(404).json({ message: 'SHG not found' });
  if (!member || String(member.shg) !== String(shg._id)) {
    return res.status(400).json({ message: 'Member does not belong to this SHG' });
  }

  const dueDate = asDate(req.body.dueDate);
  const receivedDate = asDate(req.body.receivedDate, new Date());
  if (!dueDate || !receivedDate) return res.status(400).json({ message: 'Invalid dueDate or receivedDate' });
  if (!['cash', 'check', 'phonepe', 'upi', 'bank_transfer'].includes(req.body.paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' });
  }

  const receivedDay = Date.UTC(receivedDate.getFullYear(), receivedDate.getMonth(), receivedDate.getDate());
  const dueDay = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const lateDays = Math.max(0, Math.floor((receivedDay - dueDay) / 86400000));
  const penaltyAmount = lateDays * Number(shg.latePenaltyAmount || 0);

  let loan;
  const month = req.body.month || dueDate.toISOString().slice(0, 7);
  if (paymentType === 'loan_emi') {
    loan = await Loan.findOne({ _id: req.body.loan, shg: shg._id, member: member._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found for this member and SHG' });
    if (amount > loan.outstanding) return res.status(400).json({ message: 'Payment cannot exceed the outstanding loan principal' });
    interestAmount = calculateMonthlyInterest(loan.outstanding, loan.interestRate);
  }
  const totalAmount = amount + interestAmount + penaltyAmount;
  const base = {
    shg: shg._id,
    member: member._id,
    amount,
    interestAmount,
    dueDate,
    receivedDate,
    paymentMethod: req.body.paymentMethod,
    reference: req.body.reference,
    receipt: req.body.receipt,
    lateDays,
    penaltyAmount,
    totalAmount,
    createdBy: req.user._id,
  };

  const transaction = await createTransaction({
    shg: shg._id,
    member: member._id,
    type: paymentType === 'loan_emi' ? 'repayment' : 'savings',
    direction: 'credit',
    amount: totalAmount,
    date: receivedDate,
    description: paymentType === 'loan_emi' ? `Loan EMI collection for ${loan.loanId}` : `Monthly savings collection`,
    createdBy: req.user._id,
  });

  let repayment;
  repayment = await Repayment.create({
    repaymentId: makeId('PAY'),
    shg: shg._id,
    loan: loan._id,
    member: member._id,
    principal: amount,
    interest: interestAmount,
    penalty: penaltyAmount,
    total: totalAmount,
    date: receivedDate,
    transaction: transaction._id,
    createdBy: req.user._id,
  });
  loan.principalRepaid += amount;
  loan.interestPaid += interestAmount;
  loan.penaltyPaid += penaltyAmount;
  loan.outstanding = Math.max(0, loan.amount - loan.principalRepaid);
  loan.status = loan.outstanding === 0 ? 'completed' : 'partially_paid';
  if (loan.outstanding > 0 && loan.nextDueDate) {
    const nextDueDate = new Date(loan.nextDueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    loan.nextDueDate = nextDueDate;
  }
  await loan.save();

  const collection = await PaymentCollection.create({
    ...base,
    paymentType,
    loan: loan && loan._id,
    repayment: repayment && repayment._id,
    transaction: transaction._id,
  });
  await logAction({ shg: collection.shg, action: 'Payment Collection Added', entityType: 'PaymentCollection', entityId: collection._id, after: collection, performedBy: req.user._id });
  res.status(201).json({ collection, transaction, repayment, loan });
});
