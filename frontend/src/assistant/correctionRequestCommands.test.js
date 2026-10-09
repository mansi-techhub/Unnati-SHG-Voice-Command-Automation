import test from 'node:test'
import assert from 'node:assert/strict'
import { isCorrectionRequest, parseCorrectionCategory } from './correctionRequestCommands.js'

test('recognizes correction request commands in English, Hindi, and Marathi', () => {
  assert.equal(isCorrectionRequest('send edit req'), true)
  assert.equal(isCorrectionRequest('submit a correction request'), true)
  assert.equal(isCorrectionRequest('सुधार अनुरोध भेजें'), true)
  assert.equal(isCorrectionRequest('दुरुस्ती विनंती पाठवा'), true)
})

test('maps correction form categories in supported languages', () => {
  assert.equal(parseCorrectionCategory('Savings'), 'savings')
  assert.equal(parseCorrectionCategory('ऋण'), 'loan')
  assert.equal(parseCorrectionCategory('हजेरी'), 'attendance')
  assert.equal(parseCorrectionCategory('passbook'), 'passbook')
  assert.equal(parseCorrectionCategory('unknown'), null)
})
