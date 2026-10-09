import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getLocalDateKey,
  isAttendanceMarkRequest,
  parseAttendanceStatuses,
} from './attendanceCommands.js'

const members = [
  { _id: 'asha', name: 'Asha Patil' },
  { _id: 'komal', name: 'Mrs Komal Deokar' },
  { _id: 'lata', name: 'Lata Kale' },
]

test('recognizes requests to mark attendance without matching attendance questions', () => {
  assert.equal(isAttendanceMarkRequest("I want to mark today's attendance"), true)
  assert.equal(isAttendanceMarkRequest('उपस्थिति दर्ज करें'), true)
  assert.equal(isAttendanceMarkRequest('show my attendance'), false)
})

test('marks everyone present except a uniquely named member', () => {
  assert.deepEqual(parseAttendanceStatuses('mark all present except Komal', members), {
    statuses: { asha: 'Present', komal: 'Absent', lata: 'Present' },
  })
})

test('rejects a partial name that matches multiple roster members', () => {
  const duplicated = [
    { _id: 'komal-1', name: 'Komal Deokar' },
    { _id: 'komal-2', name: 'Komal Patil' },
  ]
  assert.deepEqual(
    parseAttendanceStatuses('mark all present except Komal', duplicated),
    { error: 'ambiguous-member' },
  )
})

test('marks explicitly named members and defaults everyone else to absent', () => {
  assert.deepEqual(parseAttendanceStatuses('Asha present, Lata present, Komal absent', members), {
    statuses: { asha: 'Present', komal: 'Absent', lata: 'Present' },
  })
})

test('does not silently accept an unmatched exception or status command', () => {
  assert.deepEqual(parseAttendanceStatuses('all present except Unknown', members), { error: 'unmatched-exception' })
  assert.deepEqual(parseAttendanceStatuses('mark attendance', members), { error: 'unrecognized' })
})

test('formats the local calendar date without a UTC day shift', () => {
  assert.equal(getLocalDateKey(new Date(2026, 8, 30, 23, 30)), '2026-09-30')
})
