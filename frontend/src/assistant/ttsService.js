import { api } from '../services/api.js'

let currentAudio = null
let currentAudioUrl = null
let currentSource = null
let currentUtterance = null
let audioContext = null
let synthesisRequestId = 0
const browserSpeechLocales = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }

export function prepareSpokenResponse() {
  if (typeof window === 'undefined' || !window.AudioContext) return Promise.resolve(false)
  try {
    audioContext ||= new window.AudioContext()
    return audioContext.state === 'suspended'
      ? audioContext.resume().then(() => true).catch(() => false)
      : Promise.resolve(true)
  } catch {
    return Promise.resolve(false)
  }
}

export async function speakResponse(text, language, { onStart = () => {}, onEnd = () => {}, onError = () => {} } = {}) {
  const requestId = ++synthesisRequestId
  cancelCurrentAudio()
  try {
    const result = await api('/speech/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text, language }),
    })
    if (requestId !== synthesisRequestId) return false
    const bytes = Uint8Array.from(atob(result.audio), (character) => character.charCodeAt(0))
    if (await prepareSpokenResponse()) {
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
      if (requestId !== synthesisRequestId) return false
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      currentSource = source
      source.addEventListener('ended', () => {
        if (requestId !== synthesisRequestId) return
        currentSource = null
        source.disconnect()
        cancelCurrentAudio()
        onEnd()
      }, { once: true })
      onStart()
      source.start()
      return true
    }
    return await playGeminiAudio(bytes, result.mimeType, requestId, {
      text, language, onStart, onEnd, onError,
    })
  } catch (error) {
    if (requestId === synthesisRequestId) {
      cancelCurrentAudio()
      const fallbackStarted = speakWithBrowserVoice(text, language, requestId, { onStart, onEnd, onError })
      if (!fallbackStarted) onError(error)
      return fallbackStarted
    }
    return false
  }
}

async function playGeminiAudio(bytes, mimeType, requestId, { text, language, onStart, onEnd, onError }) {
  try {
    currentAudioUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }))
    const audio = new Audio(currentAudioUrl)
    currentAudio = audio
    audio.addEventListener('ended', () => {
      if (requestId !== synthesisRequestId) return
      cancelCurrentAudio()
      onEnd()
    }, { once: true })
    audio.addEventListener('error', () => {
      if (requestId !== synthesisRequestId) return
      cancelCurrentAudio()
      if (!speakWithBrowserVoice(text, language, requestId, { onStart, onEnd, onError })) {
        onError(new Error('The browser could not play the generated Gemini audio.'))
      }
    }, { once: true })
    onStart()
    await audio.play()
    return true
  } catch (error) {
    cancelCurrentAudio()
    if (speakWithBrowserVoice(text, language, requestId, { onStart, onEnd, onError })) return true
    onError(error)
    return false
  }
}

function speakWithBrowserVoice(text, language, requestId, { onStart, onEnd, onError }) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    return false
  }
  try {
    const utterance = new window.SpeechSynthesisUtterance(text)
    const locale = browserSpeechLocales[language] || browserSpeechLocales.en
    utterance.lang = locale
    const voices = window.speechSynthesis.getVoices()
    const localeVoice = voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase())
      || voices.find((voice) => voice.lang.toLowerCase().startsWith(`${language}-`))
    const indianFallbackVoice = language === 'mr'
      ? voices.find((voice) => voice.lang.toLowerCase() === 'hi-in')
        || voices.find((voice) => voice.lang.toLowerCase().startsWith('hi-'))
      : null
    utterance.voice = localeVoice || indianFallbackVoice || null
    utterance.onstart = () => {
      if (requestId === synthesisRequestId) onStart()
    }
    utterance.onend = () => {
      if (requestId !== synthesisRequestId) return
      currentUtterance = null
      onEnd()
    }
    utterance.onerror = (event) => {
      if (requestId !== synthesisRequestId) return
      currentUtterance = null
      onError(new Error(event.error || 'The browser could not read the response aloud.'))
    }
    currentUtterance = utterance
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    currentUtterance = null
    return false
  }
}

function cancelCurrentAudio() {
  currentSource?.stop()
  currentSource?.disconnect()
  currentSource = null
  currentAudio?.pause()
  currentAudio = null
  if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl)
  currentAudioUrl = null
  if (currentUtterance && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  currentUtterance = null
}

export function cancelSpokenResponse() {
  synthesisRequestId += 1
  cancelCurrentAudio()
}
