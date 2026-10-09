const Loan = require('../models/Loan');
const Notification = require('../models/Notification');
const { sendSms } = require('./smsProvider');

function dayDifference(date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - start) / 86400000);
}

async function createReminder({ shg, member, loan, title, message, type, reminderKey }) {
  if (await Notification.exists({ reminderKey })) return null;
  const delivery = member
    ? await sendSms({ to: member.phone, body: message })
    : { status: 'not_attempted' };
  return Notification.create({
    shg,
    member: member?._id,
    loan: loan?._id,
    title,
    message,
    type,
    channel: 'in_app_and_sms',
    deliveryStatus: delivery.status,
    deliveryError: delivery.error,
    sentAt: delivery.status === 'sent' ? new Date() : undefined,
    reminderKey,
  });
}

async function createReminderForLoan(loan, daysBefore) {
  if (!loan.nextDueDate || !loan.member) return null;
  const dueDate = new Date(loan.nextDueDate);
  const dueDateLabel = dueDate.toLocaleDateString('en-IN');
  const key = `emi:${loan._id}:${dueDate.toISOString().slice(0, 10)}:${daysBefore}`;
  const member = loan.member;
  return createReminder({
    shg: loan.shg,
    member,
    loan,
    title: `EMI payment reminder - ${daysBefore} day${daysBefore === 1 ? '' : 's'} left`,
    message: `Reminder: your loan ${loan.loanId} EMI is due on ${dueDateLabel}, in ${daysBefore} day${daysBefore === 1 ? '' : 's'}.`,
    type: 'loan',
    reminderKey: key,
  });
}

async function createMeetingReminders(meeting, members) {
  const daysBefore = dayDifference(meeting.date);
  if (![1, 2].includes(daysBefore)) return [];
  const notifications = await Promise.all(members.map((member) => createReminder({
    shg: meeting.shg,
    member,
    title: `${meeting.type === 'event' ? 'Event' : 'Meeting'} reminder - ${daysBefore} day${daysBefore === 1 ? '' : 's'} left`,
    message: `Reminder: ${meeting.title} is scheduled on ${new Date(meeting.date).toLocaleDateString('en-IN')}${meeting.time ? ` at ${meeting.time}` : ''}${meeting.location ? ` at ${meeting.location}` : ''}.`,
    type: 'meeting',
    reminderKey: `meeting:${meeting._id}:${new Date(meeting.date).toISOString().slice(0, 10)}:${daysBefore}:${member._id}`,
  })));
  notifications.push(await createReminder({
    shg: meeting.shg,
    title: `${meeting.type === 'event' ? 'Event' : 'Meeting'} reminder - ${daysBefore} day${daysBefore === 1 ? '' : 's'} left`,
    message: `Reminder: ${meeting.title} is scheduled on ${new Date(meeting.date).toLocaleDateString('en-IN')}.`,
    type: 'meeting',
    reminderKey: `meeting:${meeting._id}:${new Date(meeting.date).toISOString().slice(0, 10)}:${daysBefore}:group`,
  }));
  return notifications;
}

async function createSavingsReminders(shg, members) {
  if (!shg.monthlySavingsAmount) return [];
  const dueDay = Number(shg.monthlySavingsDueDay || (shg.formationDate ? new Date(shg.formationDate).getDate() : 1));
  const today = new Date();
  const dueDate = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()));
  const daysBefore = dayDifference(dueDate);
  if (![1, 2].includes(daysBefore)) return [];
  const notifications = await Promise.all(members.map((member) => createReminder({
    shg: shg._id,
    member,
    title: `Monthly savings reminder - ${daysBefore} day${daysBefore === 1 ? '' : 's'} left`,
    message: `Reminder: your monthly savings of ${shg.monthlySavingsAmount} is due on ${dueDate.toLocaleDateString('en-IN')}.`,
    type: 'savings',
    reminderKey: `savings:${shg._id}:${member._id}:${today.getFullYear()}-${today.getMonth() + 1}:${daysBefore}`,
  })));
  notifications.push(await createReminder({
    shg: shg._id,
    title: `Monthly savings reminder - ${daysBefore} day${daysBefore === 1 ? '' : 's'} left`,
    message: `Reminder: monthly savings collection is due on ${dueDate.toLocaleDateString('en-IN')}.`,
    type: 'savings',
    reminderKey: `savings:${shg._id}:group:${today.getFullYear()}-${today.getMonth() + 1}:${daysBefore}`,
  }));
  return notifications;
}

async function sendDueReminders() {
  const loans = await Loan.find({
    status: { $in: ['active', 'partially_paid', 'overdue'] },
  }).populate('member', 'phone name');
  const Meeting = require('../models/Meeting');
  const SHG = require('../models/SHG');
  const membersByShg = {};
  const shgs = await SHG.find({}).select('_id monthlySavingsAmount monthlySavingsDueDay formationDate');
  for (const shg of shgs) {
    membersByShg[String(shg._id)] = await require('../models/Member').find({ shg: shg._id, status: 'active' }).select('phone name');
  }
  const results = [];
  for (const loan of loans) {
    const daysBefore = dayDifference(loan.nextDueDate);
    if ([1, 2].includes(daysBefore)) {
      const notification = await createReminderForLoan(loan, daysBefore);
      if (notification) results.push(notification);
    }
  }
  const meetings = await Meeting.find({ date: { $gte: new Date() }, status: { $ne: 'cancelled' } });
  for (const meeting of meetings) {
    results.push(...(await createMeetingReminders(meeting, membersByShg[String(meeting.shg)] || [])).filter(Boolean));
  }
  for (const shg of shgs) {
    results.push(...(await createSavingsReminders(shg, membersByShg[String(shg._id)] || [])).filter(Boolean));
  }
  return results;
}

module.exports = { sendDueReminders };
