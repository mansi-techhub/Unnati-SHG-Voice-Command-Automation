import test from 'node:test'
import assert from 'node:assert/strict'
import { isSkipPhrase, isValidPhone, parseCorrection } from './inputValidation.js'

test('recognizes skip responses regardless of capitalization or final punctuation', () => {
  assert.equal(isSkipPhrase('Skip'), true)
  assert.equal(isSkipPhrase('SKIP.'), true)
  assert.equal(isSkipPhrase('वगळा'), true)
  assert.equal(isSkipPhrase('9823456789'), false)
})

test('accepts exactly 10 phone digits while allowing common separators', () => {
  assert.equal(isValidPhone('9823456789'), true)
  assert.equal(isValidPhone('982-345-6789'), true)
  assert.equal(isValidPhone('1234567'), false)
  assert.equal(isValidPhone('12345678901'), false)
  assert.equal(isValidPhone('abcdefghij'), false)
})

test('understands natural correction statements in English, Hindi, Marathi, and mixed language', () => {
  assert.deepEqual(parseCorrection('Actually, his name is Rohan.'), { field: 'name', value: 'Rohan' })
  assert.deepEqual(parseCorrection('दरअसल, उसका नाम रोहन है।'), { field: 'नाम', value: 'रोहन' })
  assert.deepEqual(parseCorrection('खरं तर, त्याचं नाव रोहन आहे.'), { field: 'नाव', value: 'रोहन' })
  assert.deepEqual(parseCorrection('Actually phone number to 9876543210'), { field: 'phone number', value: '9876543210' })
  assert.deepEqual(parseCorrection('Actually, penalty per day is 100 rupees.'), { field: 'penalty per day', value: '100 rupees' })
  assert.deepEqual(parseCorrection('Actually, amount to 750'), { field: 'amount', value: '750' })
  assert.deepEqual(parseCorrection('Actually, received date is 2026-06-30'), { field: 'received date', value: '2026-06-30' })
  assert.deepEqual(parseCorrection('खरं तर, नोंद मासिक बचत आहे'), { field: 'नोंद', value: 'मासिक बचत' })
  assert.equal(parseCorrection('Tell me about Rohan'), null)
})
