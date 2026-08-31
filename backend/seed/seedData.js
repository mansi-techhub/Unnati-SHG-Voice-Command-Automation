const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const SHG = require('../src/models/SHG');
const Member = require('../src/models/Member');
const Savings = require('../src/models/Savings');
const Loan = require('../src/models/Loan');
const Transaction = require('../src/models/Transaction');
const Meeting = require('../src/models/Meeting');
const Notification = require('../src/models/Notification');
const GovernmentScheme = require('../src/models/GovernmentScheme');
const Goal = require('../src/models/Goal');
const EmergencyFund = require('../src/models/EmergencyFund');
const Document = require('../src/models/Document');
const AuditLog = require('../src/models/AuditLog');
const { createTransaction } = require('../src/services/financeService');

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shgms');
  await Promise.all([
    User.deleteMany(), SHG.deleteMany(), Member.deleteMany(), Savings.deleteMany(), Loan.deleteMany(),
    Transaction.deleteMany(), Meeting.deleteMany(), Notification.deleteMany(), GovernmentScheme.deleteMany(),
    Goal.deleteMany(), EmergencyFund.deleteMany(), Document.deleteMany(), AuditLog.deleteMany(),
  ]);

  const admin = await User.create({ name: 'Sunita Patil', email: 'admin@shgms.test', phone: '9876543210', password: 'Password@123', role: 'admin', language: 'en' });
  const shg = await SHG.create({
    name: 'Sakhi Mahila Bachat Gat',
    shgId: 'SHG-MH-2026-001',
    formationDate: new Date('2021-06-15'),
    village: 'Nandgaon',
    taluka: 'Shrigonda',
    district: 'Ahmednagar',
    state: 'Maharashtra',
    presidentName: 'Sunita Patil',
    contactPhone: '9876543210',
    monthlySavingsAmount: 500,
    loanInterestRate: 2,
    latePenaltyAmount: 50,
    bank: { name: 'Maharashtra Gramin Bank', branch: 'Nandgaon', accountNumberMasked: 'XXXXXX4321', ifsc: 'MAHG0001234' },
    createdBy: admin._id,
  });

  admin.shg = shg._id;
  await admin.save();

  const names = ['Asha Jadhav', 'Meena Shinde', 'Lata Pawar', 'Kavita More', 'Rani Deshmukh', 'Pooja Kale', 'Anita Chavan', 'Sarika Gaikwad', 'Nirmala Kadam', 'Vaishali Lokhande', 'Rekha Salunke', 'Sangita Nikam', 'Jyoti Bhosale', 'Manisha Wagh', 'Pratibha Karde'];
  const members = await Member.insertMany(names.map((name, index) => ({
    shg: shg._id,
    memberId: `MBR${String(index + 1).padStart(3, '0')}`,
    name,
    phone: `98${String(70000000 + index * 34721).slice(0, 8)}`,
    address: 'Nandgaon, Maharashtra',
    roleInGroup: index === 0 ? 'Secretary' : 'Member',
  })));

  for (const member of members) {
    for (const month of ['2026-04', '2026-05', '2026-06', '2026-07']) {
      const transaction = await createTransaction({ shg: shg._id, member: member._id, type: 'savings', direction: 'credit', amount: 500, date: new Date(`${month}-05`), description: `Monthly savings ${month}`, createdBy: admin._id });
      await Savings.create({ shg: shg._id, member: member._id, month, amount: 500, receiptNumber: `SAV-${member.memberId}-${month}`, transaction: transaction._id, createdBy: admin._id });
    }
  }

  await Loan.insertMany([
    { loanId: 'LOAN001', shg: shg._id, member: members[1]._id, amount: 20000, purpose: 'Tailoring machine', interestRate: 2, durationMonths: 12, status: 'partially_paid', principalRepaid: 8000, interestPaid: 1200, outstanding: 12000, nextDueDate: new Date('2026-09-05'), createdBy: admin._id },
    { loanId: 'LOAN002', shg: shg._id, member: members[5]._id, amount: 15000, purpose: 'Goat rearing', interestRate: 2, durationMonths: 10, status: 'overdue', principalRepaid: 3000, interestPaid: 600, outstanding: 12000, nextDueDate: new Date('2026-08-01'), createdBy: admin._id },
    { loanId: 'LOAN003', shg: shg._id, member: members[8]._id, amount: 10000, purpose: 'Education fees', interestRate: 1.5, durationMonths: 8, status: 'completed', principalRepaid: 10000, interestPaid: 900, outstanding: 0, createdBy: admin._id },
  ]);

  await Meeting.create({ shg: shg._id, title: 'Monthly savings and loan review', date: new Date('2026-09-02'), time: '10:30', location: 'Gram Panchayat Hall', agenda: 'Savings collection, overdue installment review, scheme awareness', status: 'scheduled', createdBy: admin._id });
  await Notification.create({ shg: shg._id, title: 'Savings reminder', message: 'Monthly savings collection is scheduled for 5 September.', type: 'savings', createdBy: admin._id });
  await Goal.create({ shg: shg._id, title: 'Purchase Sewing Machines', targetAmount: 50000, savedAmount: 32500, dueDate: new Date('2026-12-31'), createdBy: admin._id });
  await EmergencyFund.create({ shg: shg._id, available: 18500, used: 4000, transactions: [{ type: 'contribution', amount: 22500, purpose: 'Monthly reserve', createdBy: admin._id }, { type: 'usage', amount: 4000, purpose: 'Medical emergency support', createdBy: admin._id }] });
  await Document.create({ shg: shg._id, name: 'SHG Registration Certificate', category: 'registration', uploadedBy: admin._id, notes: 'Upload storage is integration-ready.' });
  await GovernmentScheme.insertMany([
    { name: 'DAY-NRLM', description: 'National rural livelihood mission information for eligible rural households and SHGs.', eligibility: 'As per official scheme rules.', benefits: 'Livelihood support and SHG ecosystem strengthening.', requiredDocuments: ['Identity proof', 'SHG records', 'Bank details'], officialSource: 'https://www.myscheme.gov.in/schemes/day-nrlm', applicationInfo: 'Use the official source for current application steps.' },
    { name: 'Credit support information for SHGs', description: 'Official scheme discovery entry for SHG credit support.', eligibility: 'As per official scheme rules.', benefits: 'Credit support subject to eligibility.', requiredDocuments: ['SHG registration', 'Bank account', 'Loan documents'], officialSource: 'https://www.myscheme.gov.in/', applicationInfo: 'Verify current details on official government portals before applying.' },
  ]);

  console.log('Seed complete. Admin login: admin@shgms.test / Password@123');
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
