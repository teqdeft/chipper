/**
 * Multer file uploads.
 *
 * Security posture:
 *  - Storage root is configurable (UPLOAD_DIR) and partitioned per purpose
 *    (designs / images / avatars / attachments), then per YYYY/MM.
 *  - Filenames are generated server-side (uuid + safe extension). The client
 *    name is kept only as a DB column, never used to build a path, so
 *    `../../etc/passwd` and null-byte tricks cannot escape the upload root.
 *  - Extension whitelist AND mime whitelist must both pass.
 *  - Per-purpose byte limits plus a file-count cap.
 *  - Dangerous extensions are rejected outright even if whitelisted upstream.
 *
 * Usage:
 *   uploadDesignFiles.array('files', 20)
 *   uploadAvatar.single('avatar')
 */
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { FILE_KIND } = require('../config/constants');

/** Never accept these, whatever the configured whitelist says. */
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'dll', 'bat', 'cmd', 'com', 'cpl', 'msi', 'msp', 'scr', 'sh', 'bash',
  'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'jar', 'war', 'php', 'phtml', 'phar',
  'asp', 'aspx', 'jsp', 'py', 'rb', 'pl', 'so', 'dylib', 'app', 'deb', 'rpm', 'htaccess',
]);

const MIME_BY_EXTENSION = {
  stl: ['model/stl', 'application/sla', 'application/vnd.ms-pki.stl', 'application/octet-stream', 'text/plain'],
  step: ['model/step', 'application/step', 'application/STEP', 'application/octet-stream', 'text/plain'],
  stp: ['model/step', 'application/step', 'application/octet-stream', 'text/plain'],
  iges: ['model/iges', 'application/iges', 'application/octet-stream', 'text/plain'],
  igs: ['model/iges', 'application/iges', 'application/octet-stream', 'text/plain'],
  '3mf': ['model/3mf', 'application/vnd.ms-3mfdocument', 'application/octet-stream', 'application/zip'],
  obj: ['model/obj', 'text/plain', 'application/octet-stream'],
  dxf: ['image/vnd.dxf', 'application/dxf', 'application/octet-stream', 'text/plain'],
  dwg: ['image/vnd.dwg', 'application/acad', 'application/octet-stream'],
  gcode: ['text/x.gcode', 'text/plain', 'application/octet-stream'],
  zip: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  pdf: ['application/pdf'],
  json: ['application/json', 'text/plain'],
  csv: ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/x-markdown', 'text/plain'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  svg: ['image/svg+xml'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

const KIND_BY_EXTENSION = {
  stl: FILE_KIND.MODEL, step: FILE_KIND.MODEL, stp: FILE_KIND.MODEL, iges: FILE_KIND.MODEL,
  igs: FILE_KIND.MODEL, '3mf': FILE_KIND.MODEL, obj: FILE_KIND.MODEL, dxf: FILE_KIND.MODEL,
  dwg: FILE_KIND.MODEL, gcode: FILE_KIND.MODEL,
  jpg: FILE_KIND.IMAGE, jpeg: FILE_KIND.IMAGE, png: FILE_KIND.IMAGE, webp: FILE_KIND.IMAGE,
  gif: FILE_KIND.IMAGE, svg: FILE_KIND.IMAGE,
  pdf: FILE_KIND.DOCUMENT, doc: FILE_KIND.DOCUMENT, docx: FILE_KIND.DOCUMENT,
  xls: FILE_KIND.DOCUMENT, xlsx: FILE_KIND.DOCUMENT, txt: FILE_KIND.DOCUMENT, md: FILE_KIND.DOCUMENT,
  zip: FILE_KIND.ARCHIVE,
  json: FILE_KIND.DATA, csv: FILE_KIND.DATA,
};

/** @returns {string} lowercase extension without the dot. */
function extensionOf(filename) {
  return path.extname(filename || '').replace('.', '').toLowerCase();
}

/** Maps an extension to the storage/DB bucket used across the API. */
function kindOf(filename) {
  return KIND_BY_EXTENSION[extensionOf(filename)] || FILE_KIND.OTHER;
}

/** Absolute directory for a purpose, partitioned by year/month to keep dirs small. */
function destinationFor(folder) {
  const now = new Date();
  const dir = path.join(
    config.upload.root,
    folder,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Relative POSIX path stored in the DB — safe to append to UPLOAD_PUBLIC_PATH. */
function relativePath(absolutePath) {
  return path.relative(config.upload.root, absolutePath).split(path.sep).join('/');
}

function publicUrlFor(relative) {
  if (!relative) return null;
  return `${config.upload.publicPath}/${String(relative).replace(/^\/+/, '')}`;
}

function buildStorage(folder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      try {
        cb(null, destinationFor(folder));
      } catch (err) {
        cb(ApiError.internal(`Could not create the upload directory: ${err.message}`));
      }
    },
    filename(req, file, cb) {
      const ext = extensionOf(file.originalname);
      // Server-generated name: client input never reaches the filesystem path.
      cb(null, `${Date.now()}-${uuidv4()}${ext ? `.${ext}` : ''}`);
    },
  });
}

function buildFileFilter(allowedExtensions, { checkMime = true } = {}) {
  const allowed = new Set(allowedExtensions);
  return (req, file, cb) => {
    const ext = extensionOf(file.originalname);

    if (!ext) {
      return cb(ApiError.badRequest('Files must have an extension', { code: 'FILE_EXTENSION_MISSING' }));
    }
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return cb(
        ApiError.badRequest(`Executable files (.${ext}) are not allowed`, { code: 'FILE_TYPE_BLOCKED' }),
      );
    }
    if (!allowed.has(ext)) {
      return cb(
        ApiError.badRequest(
          `Unsupported file type ".${ext}". Allowed: ${[...allowed].join(', ')}`,
          { code: 'FILE_TYPE_NOT_ALLOWED', details: { extension: ext, allowed: [...allowed] } },
        ),
      );
    }
    if (checkMime) {
      const expected = MIME_BY_EXTENSION[ext];
      const mime = (file.mimetype || '').toLowerCase();
      if (expected && !expected.includes(mime)) {
        return cb(
          ApiError.badRequest(`File "${file.originalname}" does not match its declared type`, {
            code: 'FILE_MIME_MISMATCH',
            details: { extension: ext, mimetype: mime, expected },
          }),
        );
      }
    }
    return cb(null, true);
  };
}

function createUploader({ folder, extensions, maxSize, maxFiles = config.upload.maxFiles, checkMime = true }) {
  return multer({
    storage: buildStorage(folder),
    fileFilter: buildFileFilter(extensions, { checkMime }),
    limits: {
      fileSize: maxSize,
      files: maxFiles,
      fields: 60,
      fieldSize: 1024 * 1024,
      parts: maxFiles + 60,
    },
  });
}

const { folders } = config.upload;

/** Design geometry + docs (STL/STEP/ZIP/PDF …). */
const uploadDesignFiles = createUploader({
  folder: folders.designs,
  extensions: [...new Set([...config.upload.designExtensions, ...config.upload.imageExtensions])],
  maxSize: config.upload.maxFileSize,
});

/** Gallery images for a design or news post. */
const uploadImages = createUploader({
  folder: folders.images,
  extensions: config.upload.imageExtensions,
  maxSize: config.upload.maxImageSize,
});

/** Profile picture — single file, tighter cap. */
const uploadAvatar = createUploader({
  folder: folders.avatars,
  extensions: config.upload.imageExtensions.filter((e) => e !== 'svg'),
  maxSize: config.upload.maxAvatarSize,
  maxFiles: 1,
});

/** Message attachments (documents + images). */
const uploadAttachments = createUploader({
  folder: folders.attachments,
  extensions: [...new Set([...config.upload.documentExtensions, ...config.upload.imageExtensions])],
  maxSize: config.upload.maxAttachmentSize,
  maxFiles: 5,
});

/** Related documents: SOPs, CNC programs. */
const uploadDocuments = createUploader({
  folder: folders.documents,
  extensions: config.upload.documentExtensions,
  maxSize: config.upload.maxAttachmentSize,
});

/** Removes files already written to disk when the surrounding transaction fails. */
async function cleanupFiles(files = []) {
  const list = Array.isArray(files) ? files : [files];
  await Promise.all(
    list.filter(Boolean).map(
      (file) =>
        new Promise((resolve) => {
          fs.unlink(file.path, () => resolve());
        }),
    ),
  );
}

/** Deletes a stored file by its DB-relative path. Never throws. */
async function removeStoredFile(relative) {
  if (!relative) return;
  const absolute = path.join(config.upload.root, relative);
  // Defence in depth: refuse to unlink anything outside the upload root.
  if (!absolute.startsWith(config.upload.root)) return;
  await new Promise((resolve) => fs.unlink(absolute, () => resolve()));
}

/** Normalises a Multer file into the shape the file repositories persist. */
function describeFile(file) {
  return {
    original_name: file.originalname,
    stored_name: file.filename,
    path: relativePath(file.path),
    mime_type: file.mimetype,
    extension: extensionOf(file.originalname),
    size_bytes: file.size,
    kind: kindOf(file.originalname),
  };
}

module.exports = {
  uploadDesignFiles,
  uploadImages,
  uploadAvatar,
  uploadAttachments,
  uploadDocuments,
  createUploader,
  cleanupFiles,
  removeStoredFile,
  describeFile,
  publicUrlFor,
  relativePath,
  extensionOf,
  kindOf,
  BLOCKED_EXTENSIONS,
};
