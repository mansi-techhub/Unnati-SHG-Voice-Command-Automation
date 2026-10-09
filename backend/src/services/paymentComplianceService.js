const Loan = require('../models/Loan');
const Member = require('../models/Member');
const PaymentCollection = require('../models/PaymentCollection');
const Repayment = require('../models/Repayment');
const Savings = require('../models/Savings');
const SHG = require('../models/SHG');
const Notification = require('../models/Notification');

const emiStatuses = ['active', 'partially_paid', 'overdue'];

function validateRequest(period, paymentType) {
  const parsedPeriod = String(period || '');
  const match = parsedPeriod.match(/^(\d{4})(?:-(0[1-9]|1[0-2]))?$/);
  const year = match ? Number(match[1]) : NaN;
  if (!match || !Number.isInteger(year) || year < 2000 || year > new Date().getFullYear()) {
    const error = new Error('Period must be a year or month in YYYY or YYYY-MM format within the supported range');
    error.statusCode = 400;
    throw error;
  }
  if (!['savings', 'loan_emi', 'both'].includes(paymentType)) {
    const error = new Error('Payment type must be savings, loan_emi, or both');
    error.statusCode = 400;
    throw error;
  }
  const month = match[2] ? Number(match[2]) : null;
  const start = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const end = new Date(Date.UTC(year, month || 12, 1));
  return { year, month, period: parsedPeriod, start, end };
}

function idOf(value) {
  return String(value?._id || value);
}

function dateLabel(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function duePaymentState(dueDate, now = new Date()) {
  const endOfDueDate = new Date(dueDate);
  endOfDueDate.setHours(23, 59, 59, 999);
  return now > endOfDueDate ? 'overdue' : 'not_yet_due';
}

function summarizeMembers(members, paidIds, eligibleIds = null, details = {}) {
  const eligible = members.filter((member) => !eligibleIds || eligibleIds.has(idOf(member)));
  const paid = eligible.filter((member) => paidIds.has(idOf(member)));
  const unpaid = eligible.filter((member) => !paidIds.has(idOf(member)));
  const paidDetails = details.paidDetails || new Map();
  const unpaidDetails = details.unpaidDetails || new Map();
  return {
    totalMembers: eligible.length,
    paidCount: paid.length,
    unpaidCount: unpaid.length,
    paid: paid.map(({ _id, name, memberId }) => ({
      id: idOf(_id),
      name,
      memberId,
      ...(paidDetails.get(idOf(_id)) || {}),
    })),
    unpaid: unpaid.map(({ _id, name, memberId }) => ({
      id: idOf(_id),
      name,
      memberId,
      ...(unpaidDetails.get(idOf(_id)) || {}),
    })),
  };
}

function buildPaymentCompliance({
  year,
  paymentType,
  members,
  savings = [],
  eligibleLoanMemberIds = [],
  repaymentMemberIds = [],
  paymentCollectionMemberIds = [],
  period = String(year),
  savingsDetails = {},
  emiDetails = {},
}) {
  const report = { year, period, paymentType };
  if (paymentType === 'savings' || paymentType === 'both') {
    report.savings = summarizeMembers(
      members,
      new Set(savings.map((record) => idOf(record.member))),
      savingsDetails.eligibleIds || null,
      savingsDetails,
    );
  }
  if (paymentType === 'loan_emi' || paymentType === 'both') {
    const paidIds = new Set([...repaymentMemberIds, ...paymentCollectionMemberIds].map(idOf));
    const eligibleIds = new Set([...eligibleLoanMemberIds, ...paidIds]);
    report.loan_emi = summarizeMembers(members, paidIds, eligibleIds, emiDetails);
  }
  return report;
}

async function getPaymentCompliance({ shg, year, period = year, paymentType }) {
  const range = validateRequest(period, paymentType);
  const monthStart = range.month
    ? range.period
    : `${range.year}-01`;
  const monthEnd = range.month
    ? range.period
    : `${range.year}-12`;
  const group = range.month
    ? await SHG.findById(shg).select('monthlySavingsAmount monthlySavingsDueDay formationDate')
    : null;
  const members = await Member.find({ shg, status: 'active', joinedDate: { $lt: range.end } })
    .select('_id name memberId joinedDate');

  const [savings, loans, repayments, collections] = await Promise.all([
    paymentType === 'savings' || paymentType === 'both'
      ? Savings.find({ shg, month: { $gte: monthStart, $lte: monthEnd } }).select('member dueDate actualDate')
      : [],
    paymentType === 'loan_emi' || paymentType === 'both'
      ? Loan.find({
        shg,
        outstanding: { $gt: 0 },
        $or: [
          { status: { $in: emiStatuses }, disbursedDate: { $lt: range.end }, nextDueDate: { $lt: range.end } },
          { status: { $in: emiStatuses }, nextDueDate: { $gte: range.start, $lt: range.end } },
        ],
      }).select('member nextDueDate loanId outstanding')
      : [],
    paymentType === 'loan_emi' || paymentType === 'both'
      ? Repayment.find({ shg, date: { $gte: range.start, $lt: range.end } }).select('member loan date')
      : [],
    paymentType === 'loan_emi' || paymentType === 'both'
      ? PaymentCollection.find({
        shg,
        paymentType: 'loan_emi',
        receivedDate: { $gte: range.start, $lt: range.end },
      }).select('member loan dueDate receivedDate')
      : [],
  ]);

  const savingsDetails = { paidDetails: new Map(), unpaidDetails: new Map() };
  if (range.month && (paymentType === 'savings' || paymentType === 'both')) {
    const monthIndex = range.month - 1;
    const lastDay = new Date(range.year, range.month, 0).getDate();
    const configuredDueDay = Number(group?.monthlySavingsDueDay
      || (group?.formationDate ? new Date(group.formationDate).getDate() : 1));
    const dueDate = new Date(range.year, monthIndex, Math.min(Math.max(configuredDueDay, 1), lastDay));
    const paidByMember = new Map();
    for (const record of savings) {
      const memberId = idOf(record.member);
      const paidDate = dateLabel(record.actualDate);
      const saved = paidByMember.get(memberId);
      if (!saved || String(paidDate || '') > String(saved.paidDate || '')) {
        paidByMember.set(memberId, {
          paymentStatus: 'paid',
          dueDate: dateLabel(record.dueDate) || dateLabel(dueDate),
          paidDate,
        });
      }
    }
    savingsDetails.paidDetails = paidByMember;
    savingsDetails.eligibleIds = new Set(members
      .filter((member) => !member.joinedDate || new Date(member.joinedDate) <= dueDate)
      .map((member) => idOf(member._id)));
    savingsDetails.unpaidDetails = new Map(members
      .filter((member) => savingsDetails.eligibleIds.has(idOf(member._id)))
      .filter((member) => !paidByMember.has(idOf(member._id)))
      .map((member) => [idOf(member._id), {
        paymentStatus: duePaymentState(dueDate),
        dueDate: dateLabel(dueDate),
      }]));
  }

  const emiDetails = { paidDetails: new Map(), unpaidDetails: new Map() };
  const dueLoans = loans.filter((loan) => loan.nextDueDate && new Date(loan.nextDueDate) < range.end);
  const paidLoanIds = new Set([
    ...repayments.map((repayment) => idOf(repayment.loan)),
    ...collections.map((collection) => idOf(collection.loan)),
  ]);
  const paidEmiByMember = new Map();
  for (const record of [...repayments, ...collections]) {
    const memberId = idOf(record.member);
    const previous = paidEmiByMember.get(memberId);
    const paidDate = dateLabel(record.receivedDate || record.date);
    if (!previous || String(paidDate || '') > String(previous.paidDate || '')) {
      paidEmiByMember.set(memberId, {
        paymentStatus: 'paid',
        paidDate,
        loanId: record.loan?.loanId,
        dueDate: dateLabel(record.dueDate),
      });
    }
  }
  const unpaidEmiByMember = new Map();
  for (const loan of dueLoans) {
    if (paidLoanIds.has(idOf(loan._id))) continue;
    const memberId = idOf(loan.member);
    const dueDate = dateLabel(loan.nextDueDate);
    const details = unpaidEmiByMember.get(memberId) || {
      paymentStatus: duePaymentState(loan.nextDueDate),
      dueDate,
      loanIds: [],
    };
    details.loanIds.push(loan.loanId);
    if (duePaymentState(loan.nextDueDate) === 'overdue') {
      details.paymentStatus = 'overdue';
      if (!details.dueDate || dueDate < details.dueDate) details.dueDate = dueDate;
    }
    unpaidEmiByMember.set(memberId, details);
  }
  emiDetails.paidDetails = paidEmiByMember;
  emiDetails.unpaidDetails = unpaidEmiByMember;

  return buildPaymentCompliance({
    year: range.year,
    period: range.period,
    paymentType,
    members,
    savings,
    eligibleLoanMemberIds: dueLoans.map((loan) => loan.member),
    repaymentMemberIds: repayments.map((repayment) => repayment.member),
    paymentCollectionMemberIds: collections.map((collection) => collection.member),
    savingsDetails,
    emiDetails,
  });
}

function reminderText(language, paymentTypes, period) {
  const labels = {
    en: { savings: 'savings', loan_emi: 'loan EMI' },
    hi: { savings: 'बचत', loan_emi: 'ऋण की किस्त' },
    mr: { savings: 'बचत', loan_emi: 'कर्जाचा हप्ता' },
  };
  const safeLanguage = labels[language] ? language : 'en';
  const label = paymentTypes.map((type) => labels[safeLanguage][type]).join(safeLanguage === 'en' ? ' and ' : ' और ');
  const displayPeriod = /^\d{4}-\d{2}$/.test(period)
    ? new Date(`${period}-01T00:00:00`).toLocaleDateString(safeLanguage === 'en' ? 'en-IN' : safeLanguage === 'hi' ? 'hi-IN' : 'mr-IN', { month: 'long', year: 'numeric' })
    : period;
  if (safeLanguage === 'hi') {
    return `अनुस्मारक: हमारे रिकॉर्ड में ${displayPeriod} के लिए आपका ${label} भुगतान दर्ज नहीं है। यदि आपने भुगतान कर दिया है, तो कृपया इस संदेश को अनदेखा करें।`;
  }
  if (safeLanguage === 'mr') {
    return `स्मरणपत्र: आमच्या नोंदींमध्ये ${displayPeriod} साठी तुमचा ${label} भरणा नोंदलेला नाही. तुम्ही आधीच पैसे भरले असल्यास, कृपया या संदेशाकडे दुर्लक्ष करा.`;
  }
  return `Reminder: our records show no ${label} payment recorded for ${displayPeriod}. If you have already paid, please disregard this message.`;
}

async function sendPaymentReminders({ shg, year, period = year, paymentType, language = 'en', createdBy, memberIds }) {
  const report = await getPaymentCompliance({ shg, period, paymentType });
  const unpaidByType = new Map();
  for (const type of ['savings', 'loan_emi']) {
    const summary = report[type];
    if (!summary) continue;
    for (const member of summary.unpaid) {
      const key = member.id;
      const paymentTypes = unpaidByType.get(key) || [];
      paymentTypes.push(type);
      unpaidByType.set(key, paymentTypes);
    }
  }

  const membersById = new Map();
  for (const summary of Object.values(report).filter((value) => value && typeof value === 'object' && Array.isArray(value.unpaid))) {
    for (const member of summary.unpaid) membersById.set(member.memberId, member);
  }
  const allowedRecipientIds = new Set([...membersById.values()].map((member) => member.id));
  const requestedIds = memberIds === undefined ? [...allowedRecipientIds] : memberIds.map(String);
  if (requestedIds.some((memberId) => !allowedRecipientIds.has(memberId))) {
    const error = new Error('One or more selected members have a recorded payment for this period or are not eligible for this reminder');
    error.statusCode = 400;
    throw error;
  }
  const recipients = await Member.find({
    shg,
    _id: { $in: requestedIds },
  }).select('_id name memberId');

  const results = await Promise.all(recipients.map(async (member) => {
    const paymentTypes = unpaidByType.get(String(member._id)) || [];
    const message = reminderText(language, paymentTypes, report.period);
    const notification = await Notification.create({
      shg,
      member: member._id,
      title: `Payment reminder - ${report.period}`,
      message,
      type: paymentTypes.length === 1 ? (paymentTypes[0] === 'savings' ? 'savings' : 'loan') : 'group',
      channel: 'in_app',
      deliveryStatus: 'not_attempted',
      createdBy,
    });
    return { name: member.name, notificationId: notification._id };
  }));

  return {
    year: report.year,
    period: report.period,
    paymentType: report.paymentType,
    inAppCreated: results.length,
    recipients: results,
  };
}

module.exports = {
  buildPaymentCompliance,
  duePaymentState,
  getPaymentCompliance,
  reminderText,
  sendPaymentReminders,
  validateRequest,
};
