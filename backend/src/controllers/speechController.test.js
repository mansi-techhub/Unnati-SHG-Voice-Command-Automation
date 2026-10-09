const test = require('node:test');
const assert = require('node:assert/strict');
const { transcribeAudio, synthesizeSpeech, toWav } = require('../services/geminiSpeechService');

test('transcribes audio with Gemini in the selected supported language', async () => {
  let request;
  const result = await transcribeAudio({
    audio: Buffer.from('recorded-audio'),
    mimeType: 'audio/webm',
    language: 'mr',
    client: {
      models: {
        generateContent: async (params) => {
          request = params;
          return { text: 'मला सदस्य दाखवा' };
        },
      },
    },
  });

  assert.deepEqual(result, { text: 'मला सदस्य दाखवा' });
  assert.equal(request.model, 'gemini-3.1-flash-lite');
  assert.equal(request.contents[0].parts[0].inlineData.mimeType, 'audio/webm');
  assert.match(request.contents[0].parts[1].text, /Marathi/);
});

test('generates spoken response audio with Gemini and wraps PCM as WAV', async () => {
  const pcm = Buffer.from([1, 2, 3, 4]);
  let request;
  const result = await synthesizeSpeech({
    text: 'नमस्कार',
    language: 'mr',
    client: {
      models: {
        generateContent: async (params) => {
          request = params;
          return { candidates: [{ content: { parts: [{ inlineData: { data: pcm.toString('base64') } }] } }] };
        },
      },
    },
  });

  const wav = Buffer.from(result.audio, 'base64');
  assert.equal(request.model, 'gemini-2.5-flash-preview-tts');
  assert.deepEqual(request.config.responseModalities, ['AUDIO']);
  assert.equal(request.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore');
  assert.match(request.contents[0].parts[0].text, /natural native Indian Marathi accent/);
  assert.equal(result.mimeType, 'audio/wav');
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.deepEqual(wav.subarray(44), pcm);
});

test('creates a valid PCM WAV header for browser playback', () => {
  const wav = toWav(Buffer.from([0, 0]));
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), 2);
});

test('rejects unsupported languages before sending audio to Gemini', async () => {
  await assert.rejects(
    transcribeAudio({
      audio: Buffer.from('recorded-audio'),
      mimeType: 'audio/webm',
      language: 'fr',
      client: { models: { generateContent: () => assert.fail('Gemini must not be called') } },
    }),
    { code: 'INVALID_SPEECH_LANGUAGE' },
  );
});
