import test from 'node:test'
import assert from 'node:assert/strict'
import { isMemberMessageRequest } from './messageCommands.js'

test('recognizes direct-message requests in English, Hindi, and Marathi', () => {
  assert.equal(isMemberMessageRequest('send a message to a member'), true)
  assert.equal(isMemberMessageRequest('send message to Komal'), true)
  assert.equal(isMemberMessageRequest('सदस्य को संदेश भेजें'), true)
  assert.equal(isMemberMessageRequest('सदस्याला संदेश पाठवा'), true)
})

test('does not treat payment reminders as general member messages', () => {
  assert.equal(isMemberMessageRequest('send reminder message to members who have not paid'), false)
  assert.equal(isMemberMessageRequest('unpaid savings reminder'), false)
  assert.equal(isMemberMessageRequest('बचत भुगतान की याद दिलाने का संदेश भेजें'), false)
})
