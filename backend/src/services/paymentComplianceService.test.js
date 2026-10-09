const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPaymentCompliance,
  duePaymentState,
  reminderText,
  validateRequest,
} = require('./paymentComplianceService');

const members = [
  { _id: 'member-1', name: 'Asha', memberId: 'SHG-1' },
  { _id: 'member-2', name: 'Meena', memberId: 'SHG-2' },
  { _id: 'member-3', name: 'Rani', memberId: 'SHG-3' },
];

test('reports annual savings paid and unpaid members separately', () => {
  const report = buildPaymentCompliance({
    year: 2026,
    paymentType: 'savings',
    members,
    savings: [{ member: 'member-1' }, { member: 'member-1' }, { member: 'member-3' }],
  });

  assert.deepEqual(report.savings, {
    totalMembers: 3,
    paidCount: 2,
    unpaidCount: 1,
    paid: [
      { id: 'member-1', name: 'Asha', memberId: 'SHG-1' },
      { id: 'member-3', name: 'Rani', memberId: 'SHG-3' },
    ],
    unpaid: [{ id: 'member-2', name: 'Meena', memberId: 'SHG-2' }],
  });
});

test('reports EMI only for members with an eligible loan or an EMI record in the year', () => {
  const report = buildPaymentCompliance({
    year: 2026,
    period: '2026-09',
    paymentType: 'loan_emi',
    members,
    eligibleLoanMemberIds: ['member-1', 'member-2'],
    repaymentMemberIds: ['member-1'],
    paymentCollectionMemberIds: ['member-1'],
  });

  assert.deepEqual(report.loan_emi, {
    totalMembers: 2,
    paidCount: 1,
    unpaidCount: 1,
    paid: [{ id: 'member-1', name: 'Asha', memberId: 'SHG-1' }],
    unpaid: [{ id: 'member-2', name: 'Meena', memberId: 'SHG-2' }],
  });
});

test('validates requested year and payment type', () => {
  assert.equal(validateRequest('2026', 'both').period, '2026');
  assert.equal(validateRequest('2026-09', 'savings').period, '2026-09');
  assert.throws(() => validateRequest('2027-13', 'savings'), { statusCode: 400 });
  assert.throws(() => validateRequest(2026, 'cash'), { statusCode: 400 });
});

test('writes in-app reminder text in English, Hindi, and Marathi without requiring SMS', () => {
  assert.match(reminderText('en', ['loan_emi'], '2026-09'), /loan EMI payment recorded for September 2026/);
  assert.match(reminderText('hi', ['loan_emi'], '2026-09'), /ऋण की किस्त भुगतान दर्ज नहीं है/);
  assert.match(reminderText('mr', ['loan_emi'], '2026-09'), /कर्जाचा हप्ता भरणा नोंदलेला नाही/);
  assert.match(reminderText('hi', ['savings'], '2026-09'), /बचत भुगतान दर्ज नहीं है/);
  assert.match(reminderText('mr', ['savings'], '2026-09'), /बचत भरणा नोंदलेला नाही/);
});

test('marks an EMI due date as overdue only after its calendar day has ended', () => {
  const dueDate = new Date(2026, 8, 15);
  assert.equal(duePaymentState(dueDate, new Date(2026, 8, 15, 22, 0)), 'not_yet_due');
  assert.equal(duePaymentState(dueDate, new Date(2026, 8, 16, 0, 0)), 'overdue');
});

test('includes payment date and overdue due-date detail in monthly member rows', () => {
  const report = buildPaymentCompliance({
    year: 2026,
    period: '2026-09',
    paymentType: 'loan_emi',
    members,
    eligibleLoanMemberIds: ['member-1', 'member-2'],
    repaymentMemberIds: ['member-1'],
    emiDetails: {
      paidDetails: new Map([['member-1', { paymentStatus: 'paid', paidDate: '2026-09-10' }]]),
      unpaidDetails: new Map([['member-2', { paymentStatus: 'overdue', dueDate: '2026-09-15' }]]),
    },
  });
  assert.equal(report.loan_emi.paid[0].paidDate, '2026-09-10');
  assert.equal(report.loan_emi.unpaid[0].paymentStatus, 'overdue');
  assert.equal(report.loan_emi.unpaid[0].dueDate, '2026-09-15');
});
