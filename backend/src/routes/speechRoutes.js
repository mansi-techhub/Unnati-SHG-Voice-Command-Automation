const express = require('express');
const multer = require('multer');
const controller = require('../controllers/speechController');
const { protect } = require('../middleware/auth');

const router = express.Router();
const acceptedAudioTypes = new Set([
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
]);
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!acceptedAudioTypes.has(file.mimetype.split(';')[0])) {
      return callback(new Error('Unsupported audio format'));
    }
    callback(null, true);
  },
});

function parseAudio(req, res, next) {
  uploadAudio.single('audio')(req, res, (error) => {
    if (!error) return next();
    const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message });
  });
}

router.use(protect);
router.post('/transcribe', parseAudio, controller.transcribe);
router.post('/synthesize', controller.synthesize);
router.post('/assistant', controller.respond);

module.exports = router;
