import test from 'node:test'
import assert from 'node:assert/strict'
import { getRecognitionLocale } from './speechService.js'

test('uses the existing English, Hindi, and Marathi recognition locales', () => {
  assert.equal(getRecognitionLocale('en'), 'en-IN')
  assert.equal(getRecognitionLocale('hi'), 'hi-IN')
  assert.equal(getRecognitionLocale('mr'), 'mr-IN')
  assert.equal(getRecognitionLocale('unknown'), 'en-IN')
})
