const Transaction = require('../models/Transaction');
const Savings = require('../models/Savings');
const Loan = require('../models/Loan');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');

exports.summary = asyncHandler(async (req, res) => {
  const filter = req.query.shg ? { shg: req.query.shg } : {};
  const [members, savings, loans, transactions] = await Promise.all([
    Member.countDocuments(filter),
    Savings.find(filter),
    Loan.find(filter),
    Transaction.find(filter).sort({ date: -1 }),
  ]);

  const totalSavings = savings.reduce((sum, item) => sum + item.amount, 0);
  const totalDistributed = loans.reduce((sum, item) => sum + item.amount, 0);
  const outstanding = loans.reduce((sum, item) => sum + item.outstanding, 0);
  const income = transactions.filter((t) => t.direction === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.direction === 'debit').reduce((sum, t) => sum + t.amount, 0);

  res.json({
    members,
    totalSavings,
    activeLoans: loans.filter((loan) => ['active', 'partially_paid', 'overdue'].includes(loan.status)).length,
    totalDistributed,
    outstanding,
    groupBalance: income - expense,
    financialHealth: Math.max(35, Math.min(95, Math.round(100 - (outstanding / Math.max(totalSavings + income, 1)) * 35))),
  });
});

exports.exportInfo = asyncHandler(async (req, res) => {
  res.json({ message: 'Export architecture ready', formats: ['pdf', 'csv', 'xlsx'] });
});
