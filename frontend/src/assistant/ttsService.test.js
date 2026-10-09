import test from 'node:test'
import assert from 'node:assert/strict'
import { cancelSpokenResponse, speakResponse } from './ttsService.js'

test('cancels a pending Gemini spoken response without requiring a browser audio device', () => {
  assert.doesNotThrow(() => cancelSpokenResponse())
})

test('reads the response with the browser voice when Gemini TTS is unavailable', async () => {
  const originalWindow = globalThis.window
  const originalFetch = globalThis.fetch
  const originalLocalStorage = globalThis.localStorage
  let spokenUtterance
  let onStartCount = 0
  let onEndCount = 0
  let onErrorCount = 0

  class MockUtterance {
    constructor(text) {
      this.text = text
    }
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      SpeechSynthesisUtterance: MockUtterance,
      speechSynthesis: {
        getVoices: () => [{ lang: 'en-IN', name: 'Indian English' }],
        speak: (utterance) => { spokenUtterance = utterance },
        cancel: () => {},
      },
    },
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => 'test-token' },
  })
  globalThis.fetch = async () => ({
    ok: false,
    json: async () => ({ message: 'Gemini request limit reached' }),
  })

  try {
    const started = await speakResponse('The member was added.', 'en', {
      onStart: () => { onStartCount += 1 },
      onEnd: () => { onEndCount += 1 },
      onError: () => { onErrorCount += 1 },
    })

    assert.equal(started, true)
    assert.equal(spokenUtterance.text, 'The member was added.')
    assert.equal(spokenUtterance.lang, 'en-IN')
    spokenUtterance.onstart()
    spokenUtterance.onend()
    assert.equal(onStartCount, 1)
    assert.equal(onEndCount, 1)
    assert.equal(onErrorCount, 0)
  } finally {
    cancelSpokenResponse()
    if (originalWindow === undefined) delete globalThis.window
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
    if (originalLocalStorage === undefined) delete globalThis.localStorage
    else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLocalStorage })
    globalThis.fetch = originalFetch
  }
})

test('uses an installed Indian Hindi voice instead of a foreign default for Marathi fallback', async () => {
  const originalWindow = globalThis.window
  const originalFetch = globalThis.fetch
  const originalLocalStorage = globalThis.localStorage
  let spokenUtterance
  const hindiVoice = { lang: 'hi-IN', name: 'Indian Hindi' }

  class MockUtterance {
    constructor(text) {
      this.text = text
    }
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      SpeechSynthesisUtterance: MockUtterance,
      speechSynthesis: {
        getVoices: () => [{ lang: 'en-US', name: 'US English' }, hindiVoice],
        speak: (utterance) => { spokenUtterance = utterance },
        cancel: () => {},
      },
    },
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => 'test-token' },
  })
  globalThis.fetch = async () => ({
    ok: false,
    json: async () => ({ message: 'Gemini request limit reached' }),
  })

  try {
    const started = await speakResponse('नमस्कार, कशी मदत करू?', 'mr')
    assert.equal(started, true)
    assert.equal(spokenUtterance.lang, 'mr-IN')
    assert.equal(spokenUtterance.voice, hindiVoice)
  } finally {
    cancelSpokenResponse()
    if (originalWindow === undefined) delete globalThis.window
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
    if (originalLocalStorage === undefined) delete globalThis.localStorage
    else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLocalStorage })
    globalThis.fetch = originalFetch
  }
})
