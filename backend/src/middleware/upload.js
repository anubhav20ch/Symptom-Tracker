const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendError } = require('../utils/apiError');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// SEC-15: `fileFilter` above only checks the client-supplied Content-Type
// header, which a client can set to anything regardless of the file's
// actual bytes. This checks the file's magic-byte signature after multer
// has written it to disk, and deletes it and rejects the request if the
// content doesn't match any allowed type -- so a renamed/relabeled
// malicious file can't ride in on a spoofed mimetype.
const SIGNATURES = [
  { bytes: [0xff, 0xd8, 0xff], label: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], label: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38], label: 'image/gif' }, // GIF87a / GIF89a share this prefix
  { bytes: [0x25, 0x50, 0x44, 0x46], label: 'application/pdf' } // "%PDF"
  // WEBP ("RIFF....WEBP") is checked separately below since the signature
  // isn't a single contiguous prefix.
];

function matchesSignature(buffer) {
  if (SIGNATURES.some(({ bytes }) => bytes.every((b, i) => buffer[i] === b))) {
    return true;
  }
  // RIFF container with a WEBP four-byte tag at offset 8.
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }
  return false;
}

function verifyFileSignature(req, res, next) {
  if (!req.file) return next();

  const fd = fs.openSync(req.file.path, 'r');
  const header = Buffer.alloc(12);
  fs.readSync(fd, header, 0, 12, 0);
  fs.closeSync(fd);

  if (!matchesSignature(header)) {
    fs.unlink(req.file.path, () => {});
    return sendError(
      res,
      400,
      'The uploaded file does not match an allowed file type (JPEG, PNG, WEBP, GIF, or PDF).',
      {
        code: 'INVALID_FILE_SIGNATURE'
      }
    );
  }
  next();
}

module.exports = upload;
module.exports.verifyFileSignature = verifyFileSignature;
