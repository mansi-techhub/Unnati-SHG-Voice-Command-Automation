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

  const hasFinancialRecords = savings.length > 0 || loans.length > 0 || transactions.length > 0;
  res.json({
    members,
    totalSavings,
    activeLoans: loans.filter((loan) => ['active', 'partially_paid', 'overdue'].includes(loan.status)).length,
    totalDistributed,
    outstanding,
    groupBalance: income - expense,
    financialHealth: hasFinancialRecords
      ? Math.max(0, Math.min(95, Math.round(100 - (outstanding / Math.max(totalSavings + income, 1)) * 35)))
      : 0,
  });
});

exports.exportInfo = asyncHandler(async (req, res) => {
  const format = String(req.query.format || 'json').toLowerCase();
  const filter = req.query.shg ? { shg: req.query.shg } : {};
  const transactions = await Transaction.find(filter).populate('member', 'name memberId').sort({ date: -1 }).lean();
  if (format === 'csv') {
    const headers = ['transactionId', 'date', 'type', 'direction', 'amount', 'balanceAfter', 'member', 'description'];
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = transactions.map((item) => [
      item.transactionId, item.date?.toISOString(), item.type, item.direction, item.amount,
      item.balanceAfter, item.member?.name || '', item.description || '',
    ].map(escape).join(','));
    res.type('text/csv').send([headers.join(','), ...rows].join('\n'));
    return;
  }
  res.json({ format: 'json', generatedAt: new Date().toISOString(), transactions });
});
