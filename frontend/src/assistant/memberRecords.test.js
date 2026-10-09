import test from 'node:test'
import assert from 'node:assert/strict'
import { countMemberRecords } from './memberRecords.js'

test('counts a member’s records across SHG collections by member id and populated name', () => {
  const counts = countMemberRecords(
    { _id: 'member-1', name: 'Lata Kale' },
    {
      savings: [{ memberId: 'member-1' }, { member: 'Other Member' }],
      loans: [{ member: { _id: 'member-1' } }],
      loanApplications: [{ member: 'member-1' }],
      paymentCollections: [{ memberName: 'Lata Kale' }],
      transactions: [{ member: 'lata kale' }, { member: 'Other Member' }],
      meetings: [{ attendance: [{ member: { _id: 'member-1' } }, { memberName: 'Someone Else' }] }],
    },
  )
  assert.deepEqual(counts, {
    savings: 1,
    loans: 1,
    applications: 1,
    payments: 1,
    transactions: 1,
    attendance: 1,
    total: 6,
  })
})
