const Transaction = require('../models/Transaction');
const { makeId } = require('../utils/id');

async function getCurrentBalance(shg) {
  const last = await Transaction.findOne({ shg }).sort({ date: -1, createdAt: -1 });
  return last ? last.balanceAfter : 0;
}

async function createTransaction({ shg, member, type, direction, amount, date, description, createdBy, idempotencyKey }) {
  const numericAmount = Number(amount);
  if (!shg || !type || !direction || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error('A valid SHG, transaction type, direction, and positive amount are required');
    error.statusCode = 400;
    throw error;
  }
  const transactionDate = date ? new Date(date) : new Date();
  if (Number.isNaN(transactionDate.getTime())) {
    const error = new Error('Invalid transaction date');
    error.statusCode = 400;
    throw error;
  }
  if (idempotencyKey) {
    const duplicate = await Transaction.findOne({ shg, idempotencyKey });
    if (duplicate) return duplicate;
  }

  const previousBalance = await getCurrentBalance(shg);
  const signedAmount = direction === 'credit' ? numericAmount : -numericAmount;

  return Transaction.create({
    transactionId: makeId('TXN'),
    shg,
    member,
    type,
    direction,
    amount: numericAmount,
    balanceAfter: previousBalance + signedAmount,
    date: transactionDate,
    description,
    createdBy,
    idempotencyKey,
  });
}

function calculateMonthlyInterest(principal, annualOrMonthlyRate) {
  const amount = Number(principal);
  const rate = Number(annualOrMonthlyRate);
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || amount < 0 || rate < 0) return 0;
  return Math.round((amount * rate / 100) * 100) / 100;
}

module.exports = { createTransaction, getCurrentBalance, calculateMonthlyInterest };
