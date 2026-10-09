import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatPaymentCompliance,
  formatPaymentReminderResult,
  formatUnpaidMembers,
  getMentionedMemberIds,
  isExplicitRecipientRequest,
  isPaymentReminderRequest,
  isPaymentStatusFollowUp,
  parsePaymentStatusRequest,
} from './paymentCompliance.js'

test('formats annual savings and EMI status with counts and member names', () => {
  const result = formatPaymentCompliance({
    year: 2026,
    period: '2026-09',
    paymentType: 'both',
    savings: {
      totalMembers: 2,
      paidCount: 1,
      unpaidCount: 1,
      paid: [{ name: 'Asha' }],
      unpaid: [{ name: 'Meena' }],
    },
    loan_emi: {
      totalMembers: 1,
      paidCount: 0,
      unpaidCount: 1,
      paid: [],
      unpaid: [{ name: 'Rani' }],
    },
  })

  assert.match(result, /Savings in September 2026: 2 members considered/)
  assert.match(result, /1 recorded a payment \(Asha\)/)
  assert.match(result, /1 have no payment recorded \(Meena\)/)
  assert.match(result, /Loan EMI in September 2026: 1 member considered/)
  assert.match(result, /no payment recorded \(Rani\)/)
})

test('recognizes an explicit reminder follow-up in supported languages', () => {
  assert.equal(isPaymentReminderRequest('Please send a reminder message to them'), true)
  assert.equal(isPaymentReminderRequest('Send a reminder msg to all members who have not paid loan EMI this month'), true)
  assert.equal(isPaymentReminderRequest('उन्हें अनुस्मारक भेजो'), true)
  assert.equal(isPaymentReminderRequest('त्यांना स्मरणपत्र पाठवा'), true)
  assert.equal(isPaymentReminderRequest('सभी सदस्यों को जिन्होंने ऋण की किस्त नहीं भरी संदेश भेजें'), true)
  assert.equal(isPaymentReminderRequest('ज्या सदस्यांनी कर्जाचा हप्ता भरला नाही अशा सर्व सदस्यांना संदेश पाठवा'), true)
  assert.equal(isPaymentReminderRequest('उन्हें संदेश भेजें'), true)
  assert.equal(isPaymentReminderRequest('त्यांना संदेश पाठवा'), true)
  assert.equal(isPaymentReminderRequest('What does a reminder mean?'), false)
})

test('parses monthly and annual payment questions before generic assistant intents', () => {
  assert.deepEqual(parsePaymentStatusRequest('How many members have not paid savings of September 2026?'), {
    period: '2026-09',
    paymentType: 'savings',
  })
  assert.deepEqual(parsePaymentStatusRequest('Who paid the loan EMI in 2026?'), {
    period: '2026',
    paymentType: 'loan_emi',
  })
  assert.deepEqual(parsePaymentStatusRequest('Who did not pay in September 2026?'), {
    period: '2026-09',
    paymentType: 'both',
  })
  assert.deepEqual(parsePaymentStatusRequest('How many members have not paid loan EMI for September 2026?'), {
    period: '2026-09',
    paymentType: 'loan_emi',
  })
  assert.deepEqual(parsePaymentStatusRequest('सितंबर २०२६ में किस सदस्य ने ऋण की किस्त नहीं भरी?'), {
    period: '2026-09',
    paymentType: 'loan_emi',
  })
  assert.deepEqual(parsePaymentStatusRequest('सप्टेंबर २०२६ मध्ये कोणत्या सदस्यांनी कर्जाचा हप्ता भरला नाही?'), {
    period: '2026-09',
    paymentType: 'loan_emi',
  })
  assert.deepEqual(parsePaymentStatusRequest('किती सदस्यांनी सप्टेंबर २०२६ ची बचत भरली नाही?'), {
    period: '2026-09',
    paymentType: 'savings',
  })
  assert.deepEqual(parsePaymentStatusRequest('Send a reminder msg to all members who have not paid loan EMI or savings this month'), {
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    paymentType: 'both',
  })
  assert.deepEqual(parsePaymentStatusRequest('इस महीने बचत जमा नहीं करने वाले सभी सदस्य'), {
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    paymentType: 'savings',
  })
  assert.deepEqual(parsePaymentStatusRequest('या महिन्यात EMI न भरलेल्या सर्व सदस्यांची नावे सांगा'), {
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    paymentType: 'loan_emi',
  })
  assert.equal(parsePaymentStatusRequest('How many members are there?'), null)
})

test('answers payment follow-ups using unpaid names and resolves explicitly named recipients', () => {
  const report = {
    savings: {
      unpaid: [
        { id: 'member-1', memberId: 'M-1', name: 'Komal Deokar' },
        { id: 'member-2', memberId: 'M-2', name: 'Isha Patil' },
      ],
    },
  }
  assert.equal(isPaymentStatusFollowUp('Which are they?'), true)
  assert.equal(isPaymentStatusFollowUp('कौन-कौन?'), true)
  assert.equal(isPaymentStatusFollowUp('त्यांची नावे काय?'), true)
  assert.equal(formatUnpaidMembers(report), 'Members with no recorded payment: Komal Deokar, Isha Patil.')
  assert.deepEqual(getMentionedMemberIds(
    'Can we send a reminder to Komal Deokar and Isha Patil?',
    [
      { _id: 'member-1', name: 'Komal Deokar', memberId: 'M-1' },
      { _id: 'member-2', name: 'Isha Patil', memberId: 'M-2' },
    ],
  ), ['member-1', 'member-2'])
  assert.equal(isExplicitRecipientRequest('send reminder to them'), false)
  assert.equal(isExplicitRecipientRequest('Please send a reminder message to them'), false)
})

test('formats paid dates and unpaid overdue due dates in all three languages', () => {
  const report = {
    year: 2026,
    period: '2026-09',
    loan_emi: {
      totalMembers: 2,
      paidCount: 1,
      unpaidCount: 1,
      paid: [{ name: 'Asha', paymentStatus: 'paid', paidDate: '2026-09-10' }],
      unpaid: [{ name: 'Meena', paymentStatus: 'overdue', dueDate: '2026-09-15' }],
    },
  }
  assert.match(formatPaymentCompliance(report, 'en'), /Meena \(overdue; due 2026-09-15\)/)
  assert.match(formatPaymentCompliance(report, 'hi'), /Meena \(देय तिथि निकल गई; देय 2026-09-15\)/)
  assert.match(formatPaymentCompliance(report, 'mr'), /Meena \(मुदत संपली; देय 2026-09-15\)/)
})

test('reports that reminders are delivered to the in-app notification center', () => {
  const result = formatPaymentReminderResult({
    inAppCreated: 2,
    recipients: [{ name: 'Komal' }, { name: 'Isha' }],
  })

  assert.match(result, /In-app reminder notifications were created for 2 members: Komal, Isha/)
})
