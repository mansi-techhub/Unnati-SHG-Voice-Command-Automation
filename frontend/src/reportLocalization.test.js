import test from 'node:test'
import assert from 'node:assert/strict'
import { localizeReportValue } from './reportLocalization.js'

test('localizes report titles and summary row labels without changing English or unknown data', () => {
  assert.equal(localizeReportValue('Monthly savings', 'hi'), 'मासिक बचत')
  assert.equal(localizeReportValue('Members report', 'mr'), 'सदस्य अहवाल')
  assert.equal(localizeReportValue('Total savings', 'hi'), 'कुल बचत')
  assert.equal(localizeReportValue('Income', 'mr'), 'उत्पन्न')
  assert.equal(localizeReportValue('Monthly savings', 'en'), 'Monthly savings')
  assert.equal(localizeReportValue('Asha Patil', 'hi'), 'Asha Patil')
})
