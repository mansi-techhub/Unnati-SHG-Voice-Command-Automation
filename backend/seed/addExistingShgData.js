const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const SHG = require('../src/models/SHG');
const Member = require('../src/models/Member');
const Savings = require('../src/models/Savings');
const Loan = require('../src/models/Loan');
const Repayment = require('../src/models/Repayment');
const Transaction = require('../src/models/Transaction');
const Meeting = require('../src/models/Meeting');
const Attendance = require('../src/models/Attendance');
const Notification = require('../src/models/Notification');
const Goal = require('../src/models/Goal');
const EmergencyFund = require('../src/models/EmergencyFund');
const Document = require('../src/models/Document');
const AuditLog = require('../src/models/AuditLog');
const PaymentCollection = require('../src/models/PaymentCollection');
const { createTransaction } = require('../src/services/financeService');

dotenv.config();

const SHG_CODE = 'SHG1812A';
const PASSWORD = 'Test@123';
const people = [
  ['Asha Patil', 'asha.test@shgms.test', '9010000001', 'Secretary'],
  ['Meena Shinde', 'meena.test@shgms.test', '9010000002', 'Treasurer'],
  ['Kavita More', 'kavita.test@shgms.test', '9010000003', 'Member'],
  ['Pooja Pawar', 'pooja.test@shgms.test', '9010000004', 'Member'],
  ['Rani Jadhav', 'rani.test@shgms.test', '9010000005', 'Member'],
  ['Lata Kale', 'lata.test@shgms.test', '9010000006', 'Member'],
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shgms');
  const shg = await SHG.findOne({ shgId: SHG_CODE });
  if (!shg) throw new Error(`Existing SHG ${SHG_CODE} was not found`);
  const admin = await User.findOne({ role: 'admin', $or: [{ shg: shg._id }, { _id: shg.createdBy }] }).select('+password');
  if (!admin) throw new Error('The existing SHG does not have an admin account');
  admin.shg = shg._id;
  await admin.save();

  const members = [];
  for (let index = 0; index < people.length; index += 1) {
    const [name, email, phone, roleInGroup] = people[index];
    let user = await User.findOne({ email });
    let member = await Member.findOne({ memberId: `TEST-MBR-${index + 1}` });
    if (!user) user = await User.create({ name, email, phone, password: PASSWORD, role: 'member', shg: shg._id, language: index % 3 === 0 ? 'en' : index % 3 === 1 ? 'hi' : 'mr' });
    if (!member) {
      member = await Member.create({ shg: shg._id, user: user._id, memberId: `TEST-MBR-${index + 1}`, name, phone, email, address: 'Nandgaon, Maharashtra', roleInGroup, joinedDate: new Date('2026-02-01') });
    }
    user.shg = shg._id;
    user.member = member._id;
    await user.save();
    members.push(member);
  }

  for (const member of members) {
    for (const month of ['2026-07', '2026-08', '2026-09']) {
      const receipt = `TEST-SAV-${member.memberId}-${month}`;
      if (await Savings.exists({ receiptNumber: receipt })) continue;
      const date = new Date(`${month}-05T00:00:00.000Z`);
      const transaction = await createTransaction({ shg: shg._id, member: member._id, type: 'savings', direction: 'credit', amount: 500, date, description: `Test monthly saving ${month}`, createdBy: admin._id });
      await Savings.create({ shg: shg._id, member: member._id, month, amount: 500, date, receiptNumber: receipt, transaction: transaction._id, createdBy: admin._id });
    }
  }

  const loanDefinitions = [
    ['TEST-LOAN-001', members[1], 20000, 'Tailoring machine', '2026-09-25'],
    ['TEST-LOAN-002', members[3], 12000, 'Goat rearing', '2026-09-10'],
    ['TEST-LOAN-003', members[4], 8000, 'Education fees', '2026-10-05'],
  ];
  const loans = [];
  for (const [loanId, member, amount, purpose, due] of loanDefinitions) {
    let loan = await Loan.findOne({ loanId });
    if (!loan) {
      loan = await Loan.create({ loanId, shg: shg._id, member: member._id, amount, purpose, interestRate: 2, durationMonths: 12, status: due < '2026-09-20' ? 'overdue' : 'active', principalRepaid: amount === 20000 ? 5000 : amount === 12000 ? 2000 : 0, interestPaid: amount === 20000 ? 400 : amount === 12000 ? 240 : 0, outstanding: amount === 20000 ? 15000 : amount === 12000 ? 10000 : 8000, nextDueDate: new Date(`${due}T00:00:00.000Z`), createdBy: admin._id });
      await createTransaction({ shg: shg._id, member: member._id, type: 'loan_disbursement', direction: 'debit', amount, date: new Date('2026-03-10T00:00:00.000Z'), description: `Test loan disbursement ${loanId}`, createdBy: admin._id });
    }
    loans.push(loan);
  }

  if (!(await PaymentCollection.exists({ receipt: 'TEST-EMI-001' }))) {
    const loan = loans[0];
    const receivedDate = new Date('2026-09-08T00:00:00.000Z');
    const transaction = await createTransaction({ shg: shg._id, member: members[1]._id, type: 'repayment', direction: 'credit', amount: 1350, date: receivedDate, description: 'Test PhonePe EMI collection', createdBy: admin._id });
    const repayment = await Repayment.create({ repaymentId: 'TEST-PAY-001', shg: shg._id, loan: loan._id, member: members[1]._id, principal: 1000, interest: 200, penalty: 150, total: 1350, date: receivedDate, transaction: transaction._id, createdBy: admin._id });
    await PaymentCollection.create({ paymentType: 'loan_emi', shg: shg._id, member: members[1]._id, loan: loan._id, amount: 1000, interestAmount: 200, dueDate: new Date('2026-09-05T00:00:00.000Z'), receivedDate, paymentMethod: 'phonepe', reference: 'PHONEPE-TEST-001', receipt: 'TEST-EMI-001', lateDays: 3, penaltyAmount: 150, totalAmount: 1350, transaction: transaction._id, repayment: repayment._id, createdBy: admin._id });
  }

  if (!(await Meeting.exists({ shg: shg._id, title: 'Test monthly review meeting' }))) {
    const meeting = await Meeting.create({ shg: shg._id, title: 'Test monthly review meeting', date: new Date('2026-09-20T00:00:00.000Z'), time: '10:30', location: 'Gram Panchayat Hall', agenda: 'Test savings, EMI, and attendance workflow', createdBy: admin._id });
    await Attendance.create(members.map((member, index) => ({ shg: shg._id, meeting: meeting._id, member: member._id, present: index < 5, markedBy: admin._id })));
  }
  if (!(await Notification.exists({ shg: shg._id, title: 'Test EMI reminder' }))) await Notification.create({ shg: shg._id, member: members[1]._id, loan: loans[0]._id, title: 'Test EMI reminder', message: 'Meena Shinde loan EMI is due on 25 September 2026.', type: 'loan', channel: 'in_app', createdBy: admin._id });
  if (!(await Goal.exists({ shg: shg._id, title: 'Test sewing machine goal' }))) await Goal.create({ shg: shg._id, title: 'Test sewing machine goal', targetAmount: 50000, savedAmount: 15000, dueDate: new Date('2026-12-31T00:00:00.000Z'), createdBy: admin._id });
  if (!(await EmergencyFund.exists({ shg: shg._id }))) await EmergencyFund.create({ shg: shg._id, available: 10000, used: 2000, transactions: [{ type: 'contribution', amount: 12000, purpose: 'Test monthly reserve', createdBy: admin._id }, { type: 'usage', amount: 2000, purpose: 'Test emergency support', createdBy: admin._id }] });
  if (!(await Document.exists({ shg: shg._id, name: 'Test SHG registration certificate' }))) await Document.create({ shg: shg._id, name: 'Test SHG registration certificate', category: 'registration', uploadedBy: admin._id, notes: 'Test document record.' });
  if (!(await AuditLog.exists({ shg: shg._id, action: 'test_data_added' }))) await AuditLog.create({ shg: shg._id, action: 'test_data_added', entityType: 'SHG', entityId: shg._id, summary: 'Test records added to the existing SHG.', performedBy: admin._id });

  console.log(`Added test records to existing SHG: ${shg.name} (${SHG_CODE})`);
  console.log(`All six member passwords: ${PASSWORD}`);
  people.forEach(([name, email], index) => console.log(`${index + 1}. ${name} | ${email} | ${PASSWORD}`));
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
