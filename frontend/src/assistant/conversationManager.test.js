import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceConversation, getCurrentField, startConversation } from './conversationManager.js'

test('collects all member fields before allowing confirmation', () => {
  let flow = startConversation('ADD_MEMBER')
  assert.equal(getCurrentField(flow), 'name')
  flow = advanceConversation(flow, 'Asha Pawar')
  flow = advanceConversation(flow, '')
  flow = advanceConversation(flow, '')
  assert.equal(flow.status, 'COLLECTING_DATA')
  flow = advanceConversation(flow, '2025-06-01')
  assert.equal(flow.status, 'AWAITING_CONFIRMATION')
  assert.equal(flow.values.name, 'Asha Pawar')
})

test('collects a message recipient and message before asking for confirmation', () => {
  let flow = startConversation('SEND_MEMBER_MESSAGE')
  assert.equal(getCurrentField(flow), 'member')
  flow = advanceConversation(flow, 'member-1')
  assert.equal(getCurrentField(flow), 'message')
  flow = advanceConversation(flow, 'Please call me about your savings record.')
  assert.equal(flow.status, 'AWAITING_CONFIRMATION')
  assert.equal(flow.values.member, 'member-1')
})

test('collects correction category, optional record reference, and description before confirmation', () => {
  let flow = startConversation('SUBMIT_EDIT_REQUEST', { member: 'member-1' })
  assert.equal(getCurrentField(flow), 'category')
  flow = advanceConversation(flow, 'savings')
  assert.equal(getCurrentField(flow), 'reference')
  flow = advanceConversation(flow, '')
  assert.equal(getCurrentField(flow), 'description')
  flow = advanceConversation(flow, 'The September savings entry is missing.')
  assert.equal(flow.status, 'AWAITING_CONFIRMATION')
  assert.equal(flow.values.member, 'member-1')
  assert.equal(flow.values.category, 'savings')
  assert.equal(flow.values.reference, '')
})

test('collects goal details, including an optional due date, before confirmation', () => {
  let flow = startConversation('ADD_GOAL')
  assert.equal(getCurrentField(flow), 'title')
  flow = advanceConversation(flow, 'School supplies')
  assert.equal(getCurrentField(flow), 'targetAmount')
  flow = advanceConversation(flow, 25000)
  assert.equal(getCurrentField(flow), 'dueDate')
  flow = advanceConversation(flow, '')
  assert.equal(flow.status, 'AWAITING_CONFIRMATION')
  assert.equal(flow.values.targetAmount, 25000)
})

test('collects goal contribution details and requires confirmation before execution', () => {
  let flow = startConversation('ADD_GOAL_CONTRIBUTION', {
    goal: 'goal-1',
    goalName: 'School supplies',
    amount: 500,
  })
  assert.equal(getCurrentField(flow), 'note')
  flow = advanceConversation(flow, 'Monthly contribution')
  assert.equal(flow.status, 'AWAITING_CONFIRMATION')
  assert.equal(flow.values.goal, 'goal-1')
  assert.equal(flow.values.amount, 500)
  assert.equal(flow.values.note, 'Monthly contribution')
})

test('asks for the received date when monthly savings interpretation did not provide one', () => {
  const flow = startConversation('RECORD_SAVINGS', {
    member: 'member-1',
    memberName: 'Asha Pawar',
    amount: 500,
    month: '2026-06',
  })
  assert.equal(getCurrentField(flow), 'actualDate')
})

test('does not start unsupported write flows', () => {
  assert.equal(startConversation('EXECUTE_ARBITRARY_CODE'), null)
})

test('uses a resolved member and property to skip straight to the update value', () => {
  const flow = startConversation('UPDATE_MEMBER', {
    member: 'member-1', memberName: 'Asha Pawar', field: 'phone',
  })
  assert.equal(getCurrentField(flow), 'value')
})

test('a uniquely resolved delete target goes directly to explicit confirmation', () => {
  const flow = startConversation('DELETE_MEMBER', { member: 'member-1', memberName: 'Asha Pawar' })
  assert.equal(flow.status, 'AWAITING_CONFIRMATION')
})

test('asks who to delete when no member was named and requires confirmation after selection', () => {
  let flow = startConversation('DELETE_MEMBER')
  assert.equal(flow.status, 'COLLECTING_DATA')
  assert.equal(getCurrentField(flow), 'member')
  flow = advanceConversation(flow, 'member-1')
  assert.equal(flow.status, 'AWAITING_CONFIRMATION')
  assert.equal(flow.values.member, 'member-1')
})

test('skips already supplied values while collecting a setting that still needs choosing', () => {
  let flow = startConversation('UPDATE_SHG_SETTING', { value: 100 })
  assert.equal(getCurrentField(flow), 'field')
  flow = advanceConversation(flow, 'latePenaltyAmount')
  assert.equal(flow.status, 'AWAITING_CONFIRMATION')
  assert.deepEqual(flow.values, { value: 100, field: 'latePenaltyAmount' })
})
