const asyncHandler = require('../utils/asyncHandler');
const { transcribeAudio, synthesizeSpeech, respondToAssistant } = require('../services/geminiSpeechService');

function handleSpeechError(res, error, operation) {
  if (error.code === 'GEMINI_NOT_CONFIGURED') {
    return res.status(503).json({ message: 'Gemini API is not configured on the server' });
  }
  if (error.code === 'INVALID_SPEECH_LANGUAGE') {
    return res.status(400).json({ message: error.message });
  }
  console.error(`Gemini speech ${operation} failed:`, error.message);
  let providerError;
  try {
    providerError = JSON.parse(error.message).error;
  } catch {
    providerError = null;
  }
  if (providerError?.code === 429) {
    return res.status(503).json({ message: 'Gemini request limit reached. Please wait a moment and try again.' });
  }
  if (providerError?.code === 503) {
    return res.status(503).json({ message: 'Gemini is temporarily busy. Please try again in a moment.' });
  }
  return res.status(502).json({ message: 'Gemini speech processing is temporarily unavailable' });
}

exports.transcribe = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Audio recording is required' });
  if (!['en', 'hi', 'mr'].includes(req.body.language)) {
    return res.status(400).json({ message: 'Unsupported speech language' });
  }

  try {
    const result = await transcribeAudio({
      audio: req.file.buffer,
      mimeType: req.file.mimetype.split(';')[0],
      language: req.body.language,
    });
    return res.json(result);
  } catch (error) {
    return handleSpeechError(res, error, 'transcription');
  }
});

exports.synthesize = asyncHandler(async (req, res) => {
  const { text, language } = req.body;
  if (typeof text !== 'string' || !text.trim() || text.length > 5000) {
    return res.status(400).json({ message: 'Speech text must contain 1 to 5000 characters' });
  }
  if (!['en', 'hi', 'mr'].includes(language)) {
    return res.status(400).json({ message: 'Unsupported speech language' });
  }

  try {
    const result = await synthesizeSpeech({ text: text.trim(), language });
    return res.json(result);
  } catch (error) {
    return handleSpeechError(res, error, 'synthesis');
  }
});

exports.respond = asyncHandler(async (req, res) => {
  const { text, language, modules, history } = req.body;
  if (typeof text !== 'string' || !text.trim() || text.length > 1000) {
    return res.status(400).json({ message: 'Assistant message must contain 1 to 1000 characters' });
  }
  if (!['en', 'hi', 'mr'].includes(language)) {
    return res.status(400).json({ message: 'Unsupported assistant language' });
  }
  if (modules !== undefined && (!Array.isArray(modules) || modules.length > 80)) {
    return res.status(400).json({ message: 'Invalid assistant module list' });
  }
  if (history !== undefined && (!Array.isArray(history) || history.length > 10
    || history.some((turn) => !turn || !['user', 'assistant'].includes(turn.role)
      || typeof turn.text !== 'string' || turn.text.length > 500))) {
    return res.status(400).json({ message: 'Invalid assistant conversation history' });
  }

  try {
    const result = await respondToAssistant({
      text: text.trim(),
      language,
      role: req.user.role,
      modules: modules || [],
      history: history || [],
    });
    return res.json(result);
  } catch (error) {
    return handleSpeechError(res, error, 'assistant response');
  }
});
