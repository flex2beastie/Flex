const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const CATEGORIES = [
  'Conspiracy',
  'Government & Transparency',
  'Free Energy',
  'History',
  'Science',
  'Other',
];

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/epub+zip',
  'application/x-mobipocket-ebook',
  'text/plain',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 20);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Unsupported file type.'));
    }
    cb(null, true);
  },
});

const listStmt = db.prepare(`
  SELECT media.*, users.display_name AS uploader_name
  FROM media JOIN users ON users.id = media.uploader_id
  WHERE (@mediaType = '' OR media.media_type = @mediaType)
    AND (@category = '' OR media.category = @category)
    AND (@q = '' OR media.title LIKE @qLike OR media.author_or_creator LIKE @qLike OR media.description LIKE @qLike)
  ORDER BY
    CASE WHEN @sort = 'popular' THEN media.download_count END DESC,
    CASE WHEN @sort = 'oldest' THEN media.created_at END ASC,
    CASE WHEN @sort = 'newest' OR @sort = '' THEN media.created_at END DESC
`);

const getByIdStmt = db.prepare(`
  SELECT media.*, users.display_name AS uploader_name
  FROM media JOIN users ON users.id = media.uploader_id
  WHERE media.id = ?
`);

const insertMediaStmt = db.prepare(`
  INSERT INTO media
    (uploader_id, title, author_or_creator, description, media_type, category,
     stored_filename, original_filename, mime_type, file_size, rights_confirmed)
  VALUES
    (@uploaderId, @title, @authorOrCreator, @description, @mediaType, @category,
     @storedFilename, @originalFilename, @mimeType, @fileSize, @rightsConfirmed)
`);

const incrementDownloadStmt = db.prepare(
  'UPDATE media SET download_count = download_count + 1 WHERE id = ?'
);

router.get('/', (req, res) => {
  const mediaType = ['book', 'video'].includes(req.query.type) ? req.query.type : '';
  const category = CATEGORIES.includes(req.query.category) ? req.query.category : '';
  const q = (req.query.q || '').trim();
  const sort = ['newest', 'oldest', 'popular'].includes(req.query.sort) ? req.query.sort : 'newest';

  const items = listStmt.all({
    mediaType,
    category,
    q,
    qLike: `%${q}%`,
    sort,
  });

  res.render('index', {
    items,
    categories: CATEGORIES,
    filters: { mediaType, category, q, sort },
  });
});

router.get('/upload', requireAuth, (req, res) => {
  res.render('upload', { error: null, categories: CATEGORIES, form: {} });
});

router.post('/upload', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).render('upload', {
        error: err.message || 'Upload failed.',
        categories: CATEGORIES,
        form: req.body,
      });
    }

    const { title, authorOrCreator, description, mediaType, category, rightsConfirmed } = req.body;

    if (!req.file) {
      return res.status(400).render('upload', {
        error: 'Please choose a file to upload.',
        categories: CATEGORIES,
        form: req.body,
      });
    }

    if (!title || !['book', 'video'].includes(mediaType) || !CATEGORIES.includes(category)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).render('upload', {
        error: 'Please fill out the title, type, and category.',
        categories: CATEGORIES,
        form: req.body,
      });
    }

    if (rightsConfirmed !== 'on') {
      fs.unlink(req.file.path, () => {});
      return res.status(400).render('upload', {
        error: 'You must confirm you have the right to share this file before uploading.',
        categories: CATEGORIES,
        form: req.body,
      });
    }

    const info = insertMediaStmt.run({
      uploaderId: req.user.id,
      title: title.trim(),
      authorOrCreator: (authorOrCreator || '').trim(),
      description: (description || '').trim(),
      mediaType,
      category,
      storedFilename: req.file.filename,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      rightsConfirmed: 1,
    });

    res.redirect(`/media/${info.lastInsertRowid}`);
  });
});

router.get('/media/:id', (req, res) => {
  const item = getByIdStmt.get(req.params.id);
  if (!item) return res.status(404).render('404');
  res.render('detail', { item });
});

router.get('/media/:id/download', (req, res) => {
  const item = getByIdStmt.get(req.params.id);
  if (!item) return res.status(404).render('404');

  const filePath = path.join(UPLOAD_DIR, item.stored_filename);
  if (!fs.existsSync(filePath)) return res.status(404).render('404');

  incrementDownloadStmt.run(item.id);
  res.download(filePath, item.original_filename);
});

module.exports = router;
