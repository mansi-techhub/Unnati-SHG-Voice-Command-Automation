const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '../../uploads/documents');
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = new Map([
  ['application/pdf', '.pdf'],
  ['text/csv', '.csv'],
  ['application/vnd.ms-excel', '.csv'],
  ['application/csv', '.csv'],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = allowedTypes.get(file.mimetype) || path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) return callback(new Error('Only PDF and CSV files are allowed.'));
    callback(null, true);
  },
});
