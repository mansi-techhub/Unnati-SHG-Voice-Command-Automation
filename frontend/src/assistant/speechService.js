import { api } from '../services/api.js'

const recognitionLocales = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }

export function getRecognitionLocale(language) {
  return recognitionLocales[language] || recognitionLocales.en
}

export async function createSpeechRecognition(language, onResult, onError, onEnd) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw new Error('Audio recording is not supported in this browser')
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  let recorder
  try {
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ].find((type) => window.MediaRecorder.isTypeSupported(type))
    recorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop())
    throw error
  }
  let closed = false
  let cancelled = false
  let durationTimer
  let uploadController

  function finish() {
    if (closed) return
    closed = true
    clearTimeout(durationTimer)
    stream.getTracks().forEach((track) => track.stop())
    onEnd()
  }

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size) audioChunks.push(event.data)
  })
  const audioChunks = []
  recorder.addEventListener('stop', async () => {
    try {
      if (cancelled) return
      if (audioChunks.length === 0) {
        onError('no-speech')
        return
      }
      const recording = new Blob(audioChunks, { type: recorder.mimeType || audioChunks[0].type })
      const formData = new FormData()
      formData.append('audio', recording, `recording.${recording.type.split('/')[1]?.split(';')[0] || 'webm'}`)
      formData.append('language', language)
      uploadController = new AbortController()
      const result = await api('/speech/transcribe', {
        method: 'POST',
        body: formData,
        signal: uploadController.signal,
      })
      if (!cancelled) onResult(result.text)
    } catch (error) {
      if (!cancelled) onError(error)
    } finally {
      finish()
    }
  })

  return {
    start() {
      recorder.start(250)
      durationTimer = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 30000)
    },
    stop() {
      clearTimeout(durationTimer)
      if (recorder.state === 'recording') recorder.stop()
      else finish()
    },
    cancel() {
      cancelled = true
      uploadController?.abort()
      clearTimeout(durationTimer)
      if (recorder.state === 'recording') recorder.stop()
      else finish()
    },
  }
}
