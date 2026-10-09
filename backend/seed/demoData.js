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
const GovernmentScheme = require('../src/models/GovernmentScheme');
const Goal = require('../src/models/Goal');
const EmergencyFund = require('../src/models/EmergencyFund');
const Document = require('../src/models/Document');
const AuditLog = require('../src/models/AuditLog');
const PaymentCollection = require('../src/models/PaymentCollection');
const { createTransaction } = require('../src/services/financeService');

dotenv.config();

const DEMO_SHG_CODE = 'DEMO-SHG-2026';
const DEMO_PASSWORD = 'Demo@123';
const demoPeople = [
  ['Asha Patil', 'asha.demo@shgms.test', '9000000001', 'Secretary'],
  ['Meena Shinde', 'meena.demo@shgms.test', '9000000002', 'Treasurer'],
  ['Kavita More', 'kavita.demo@shgms.test', '9000000003', 'Member'],
  ['Pooja Pawar', 'pooja.demo@shgms.test', '9000000004', 'Member'],
  ['Rani Jadhav', 'rani.demo@shgms.test', '9000000005', 'Member'],
  ['Lata Kale', 'lata.demo@shgms.test', '9000000006', 'Member'],
];

async function removeDemoRecords(shgId) {
  await Promise.all([
    Savings.deleteMany({ shg: shgId }),
    Loan.deleteMany({ shg: shgId }),
    Repayment.deleteMany({ shg: shgId }),
    Transaction.deleteMany({ shg: shgId }),
    Meeting.deleteMany({ shg: shgId }),
    Attendance.deleteMany({ shg: shgId }),
    Notification.deleteMany({ shg: shgId }),
    Goal.deleteMany({ shg: shgId }),
    EmergencyFund.deleteMany({ shg: shgId }),
    Document.deleteMany({ shg: shgId }),
    AuditLog.deleteMany({ shg: shgId }),
    PaymentCollection.deleteMany({ shg: shgId }),
    Member.deleteMany({ shg: shgId }),
  ]);
  await User.deleteMany({ email: { $in: demoPeople.map((person) => person[1]) } });
}

async function seedDemo() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shgms');
  const admin = await User.findOne({ role: 'admin' }).select('+password');
  if (!admin) throw new Error('An existing admin account is required. Run the normal seed or register a president first.');

  let shg = await SHG.findOne({ shgId: DEMO_SHG_CODE });
  if (!shg) {
    shg = await SHG.create({
      name: 'Demo Sakhi Bachat Gat',
      shgId: DEMO_SHG_CODE,
      formationDate: new Date('2026-01-15'),
      village: 'Nandgaon',
      taluka: 'Shrigonda',
      district: 'Ahmednagar',
      state: 'Maharashtra',
      presidentName: admin.name,
      contactPhone: admin.phone || '9000000099',
      monthlySavingsAmount: 500,
      loanInterestRate: 2,
      latePenaltyAmount: 50,
      bank: { name: 'Maharashtra Gramin Bank', branch: 'Nandgaon', accountNumberMasked: 'XXXXXX2026', ifsc: 'MAHG0001234' },
      createdBy: admin._id,
    });
  } else {
    await removeDemoRecords(shg._id);
    shg.name = 'Demo Sakhi Bachat Gat';
    shg.presidentName = admin.name;
    shg.createdBy = admin._id;
    await shg.save();
  }

  admin.shg = shg._id;
  await admin.save();

  const members = [];
  for (let index = 0; index < demoPeople.length; index += 1) {
    const [name, email, phone, roleInGroup] = demoPeople[index];
    const user = await User.create({ name, email, phone, password: DEMO_PASSWORD, role: 'member', shg: shg._id, language: index % 3 === 0 ? 'en' : index % 3 === 1 ? 'hi' : 'mr' });
    const member = await Member.create({
      shg: shg._id,
      user: user._id,
      memberId: `DEMO-MBR-${String(index + 1).padStart(2, '0')}`,
      name,
      phone,
      email,
      address: 'Nandgaon, Maharashtra',
      roleInGroup,
      joinedDate: new Date('2026-02-01'),
    });
    user.member = member._id;
    await user.save();
    members.push(member);
  }

  for (const member of members) {
    for (const month of ['2026-07', '2026-08', '2026-09']) {
      const date = new Date(`${month}-05T00:00:00.000Z`);
      const transaction = await createTransaction({ shg: shg._id, member: member._id, type: 'savings', direction: 'credit', amount: 500, date, description: `Monthly saving ${month}`, createdBy: admin._id });
      await Savings.create({ shg: shg._id, member: member._id, month, amount: 500, date, receiptNumber: `DEMO-SAV-${member.memberId}-${month}`, transaction: transaction._id, createdBy: admin._id });
    }
  }

  const loans = await Loan.insertMany([
    { loanId: 'DEMO-LOAN-001', shg: shg._id, member: members[1]._id, amount: 20000, purpose: 'Tailoring machine', interestRate: 2, durationMonths: 12, status: 'partially_paid', principalRepaid: 5000, interestPaid: 400, outstanding: 15000, nextDueDate: new Date('2026-09-25'), createdBy: admin._id },
    { loanId: 'DEMO-LOAN-002', shg: shg._id, member: members[3]._id, amount: 12000, purpose: 'Goat rearing', interestRate: 2, durationMonths: 10, status: 'overdue', principalRepaid: 2000, interestPaid: 240, outstanding: 10000, nextDueDate: new Date('2026-09-10'), createdBy: admin._id },
    { loanId: 'DEMO-LOAN-003', shg: shg._id, member: members[4]._id, amount: 8000, purpose: 'Education fees', interestRate: 1.5, durationMonths: 8, status: 'active', outstanding: 8000, nextDueDate: new Date('2026-10-05'), createdBy: admin._id },
  ]);

  for (const loan of loans) {
    await createTransaction({ shg: shg._id, member: loan.member, type: 'loan_disbursement', direction: 'debit', amount: loan.amount, date: new Date('2026-03-10'), description: `Loan disbursement ${loan.loanId}`, createdBy: admin._id });
  }
  await createTransaction({ shg: shg._id, type: 'income', direction: 'credit', amount: 2500, date: new Date('2026-09-03'), description: 'Training programme income', createdBy: admin._id });
  await createTransaction({ shg: shg._id, type: 'expense', direction: 'debit', amount: 850, date: new Date('2026-09-04'), description: 'Stationery and meeting expense', createdBy: admin._id });

  const repaymentDate = new Date('2026-09-08T00:00:00.000Z');
  const repaymentTransaction = await createTransaction({ shg: shg._id, member: members[1]._id, type: 'repayment', direction: 'credit', amount: 1200, date: repaymentDate, description: 'Demo EMI repayment', createdBy: admin._id });
  await Repayment.create({ repaymentId: 'DEMO-PAY-001', shg: shg._id, loan: loans[0]._id, member: members[1]._id, principal: 1000, interest: 200, total: 1200, date: repaymentDate, transaction: repaymentTransaction._id, createdBy: admin._id });
  await PaymentCollection.create({ paymentType: 'loan_emi', shg: shg._id, member: members[1]._id, loan: loans[0]._id, amount: 1000, interestAmount: 200, dueDate: new Date('2026-09-05'), receivedDate: repaymentDate, paymentMethod: 'phonepe', reference: 'PHONEPE-DEMO-001', receipt: 'DEMO-REC-001', lateDays: 3, penaltyAmount: 150, totalAmount: 1350, transaction: repaymentTransaction._id, repayment: null, createdBy: admin._id });

  const meeting = await Meeting.create({ shg: shg._id, title: 'Monthly savings and loan review', date: new Date('2026-09-20'), time: '10:30', location: 'Gram Panchayat Hall', agenda: 'Savings collection, EMI review, and member questions', status: 'scheduled', createdBy: admin._id });
  await Attendance.create(members.map((member, index) => ({ shg: shg._id, meeting: meeting._id, member: member._id, present: index < 5, markedBy: admin._id })));
  await Notification.create({ shg: shg._id, title: 'EMI reminder', message: 'Meena Shinde loan EMI is due on 25 September 2026.', type: 'loan', recipient: members[1]._id, createdBy: admin._id });
  await Goal.create({ shg: shg._id, title: 'Purchase sewing machines', targetAmount: 50000, savedAmount: 15000, dueDate: new Date('2026-12-31'), status: 'active', createdBy: admin._id });
  await EmergencyFund.create({ shg: shg._id, available: 10000, used: 2000, transactions: [{ type: 'contribution', amount: 12000, purpose: 'Monthly reserve', createdBy: admin._id }, { type: 'usage', amount: 2000, purpose: 'Medical emergency support', createdBy: admin._id }] });
  await Document.create({ shg: shg._id, name: 'Demo SHG registration certificate', category: 'registration', uploadedBy: admin._id, notes: 'Demo document record for testing.' });
  await AuditLog.create({ shg: shg._id, action: 'demo_seeded', entityType: 'SHG', entityId: shg._id, summary: 'Demo records created for module testing.', performedBy: admin._id });
  await GovernmentScheme.deleteMany({ name: /^Demo:/ });
  await GovernmentScheme.insertMany([
    { name: 'Demo: DAY-NRLM', description: 'Demo government scheme record for testing.', eligibility: 'Eligible SHG members', benefits: 'Livelihood support', requiredDocuments: ['Identity proof', 'SHG records'], officialSource: 'https://www.myscheme.gov.in/', applicationInfo: 'Demo record only.' },
    { name: 'Demo: SHG credit support', description: 'Demo credit support scheme record.', eligibility: 'As per scheme rules', benefits: 'Credit support', requiredDocuments: ['Bank details'], officialSource: 'https://www.myscheme.gov.in/', applicationInfo: 'Demo record only.' },
  ]);

  console.log(`Demo data ready for SHG ${DEMO_SHG_CODE}`);
  console.log(`Admin login: use your existing admin credentials`);
  console.log(`Member password for all six accounts: ${DEMO_PASSWORD}`);
  demoPeople.forEach(([name, email], index) => console.log(`${index + 1}. ${name} | ${email} | ${DEMO_PASSWORD}`));
  await mongoose.disconnect();
}

seedDemo().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
