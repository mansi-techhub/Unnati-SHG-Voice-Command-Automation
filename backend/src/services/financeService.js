const Transaction = require('../models/Transaction');
const { makeId } = require('../utils/id');

async function getCurrentBalance(shg) {
  const last = await Transaction.findOne({ shg }).sort({ date: -1, createdAt: -1 });
  return last ? last.balanceAfter : 0;
}

async function createTransaction({ shg, member, type, direction, amount, date, description, createdBy, idempotencyKey }) {
  if (idempotencyKey) {
    const duplicate = await Transaction.findOne({ idempotencyKey });
    if (duplicate) return duplicate;
  }

  const previousBalance = await getCurrentBalance(shg);
  const signedAmount = direction === 'credit' ? Number(amount) : -Number(amount);

  return Transaction.create({
    transactionId: makeId('TXN'),
    shg,
    member,
    type,
    direction,
    amount,
    balanceAfter: previousBalance + signedAmount,
    date: date || new Date(),
    description,
    createdBy,
    idempotencyKey,
  });
}

module.exports = { createTransaction, getCurrentBalance };
