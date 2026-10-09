import test from 'node:test'
import assert from 'node:assert/strict'
import { searchGroupRecords } from './globalSearch.js'

const data = {
  members: [{ _id: 'member-1', name: 'Komal Patil', memberId: 'M-12', phone: '9990001111' }],
  loans: [{ _id: 'loan-1', loanId: 'LN-7', member: { name: 'Asha' }, purpose: 'Tailoring machine', amount: 5000 }],
  transactions: [{ _id: 'transaction-1', description: 'Monthly deposit', amount: 500, date: '2025-03-01' }],
  meetings: [{ _id: 'meeting-1', title: 'Monthly review', location: 'Village hall' }],
  notifications: [{ _id: 'notification-1', title: 'Payment reminder', message: 'Monthly deposit due' }],
  loanApplications: [{ _id: 'application-1', member: { name: 'Komal' }, status: 'pending' }],
}

test('searches records across modules and prioritizes title matches', () => {
  const results = searchGroupRecords(data, 'Komal')

  assert.deepEqual(results.map((result) => result.collection), ['loanApplications', 'members'])
  assert.equal(results[1].target, 'members')
  assert.equal(searchGroupRecords(data, 'Tailoring')[0].target, 'loans')
  assert.equal(searchGroupRecords(data, 'Village hall')[0].target, 'meetings')
})

test('returns no results for empty queries and limits result count', () => {
  assert.deepEqual(searchGroupRecords(data, '   '), [])
  assert.equal(searchGroupRecords(data, 'monthly', 'admin', 1).length, 1)
})

test('does not surface admin-only collections to member users', () => {
  const results = searchGroupRecords(data, 'Komal', 'member')

  assert.deepEqual(results.map((result) => result.collection), [])
})
