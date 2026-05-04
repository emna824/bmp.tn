const fs = require('fs');
const path = require('path');
const multer = require('multer');

const AUDIO_DIRECTORY = path.join(__dirname, '..', 'uploads', 'messages', 'audio');

if (!fs.existsSync(AUDIO_DIRECTORY)) {
  fs.mkdirSync(AUDIO_DIRECTORY, { recursive: true });
}

function buildFilename(originalName) {
  const extension = path.extname(originalName || '').toLowerCase() || '.webm';
  const baseName = path
    .basename(originalName || 'voice-message', extension)
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName || 'voice-message'}${extension}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, AUDIO_DIRECTORY);
  },
  filename: (_req, file, callback) => {
    callback(null, buildFilename(file.originalname));
  },
});

function fileFilter(_req, file, callback) {
  const mimetype = String(file.mimetype || '').toLowerCase();

  if (
    mimetype.startsWith('audio/') ||
    ['video/webm', 'application/ogg', 'application/octet-stream'].includes(mimetype)
  ) {
    return callback(null, true);
  }

  return callback(new Error('Only audio files are allowed'));
}

const audioUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
});

module.exports = audioUpload;
