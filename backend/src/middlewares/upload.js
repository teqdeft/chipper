/**
 * Multer file uploads.
 *
 * Security posture:
 *  - Storage root is configurable (UPLOAD_DIR) and partitioned per purpose
 *    (designs / images / avatars / attachments), then per YYYY/MM.
 *  - Files are stored as `<uploader-handle>-<original name>`, so who owns a
 *    file is readable off the disk. The client-supplied part survives only
 *    after `safeFileName` reduces it to a single path segment: directory
 *    separators, `..`, control characters and Windows-reserved names never
 *    survive, so the client name cannot escape the upload root. A remaining
 *    collision gets a numeric suffix.
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
  mtl: ['model/mtl', 'text/plain', 'application/octet-stream'],
  ply: ['model/ply', 'application/ply', 'application/octet-stream', 'text/plain'],
  glb: ['model/gltf-binary', 'application/octet-stream'],
  gltf: ['model/gltf+json', 'application/json', 'application/octet-stream', 'text/plain'],
  fbx: ['model/fbx', 'application/fbx', 'application/octet-stream'],
  dxf: ['image/vnd.dxf', 'application/dxf', 'application/octet-stream', 'text/plain'],
  dwg: ['image/vnd.dwg', 'application/acad', 'application/octet-stream'],
  // Photomask layout. Binary, with no registered media type of its own.
  gds: ['application/octet-stream', 'application/x-gdsii'],
  gdsii: ['application/octet-stream', 'application/x-gdsii'],
  gcode: ['text/x.gcode', 'text/plain', 'application/octet-stream'],
  // The same G-code under whatever extension the CAM tool happened to write.
  nc: ['text/x.gcode', 'text/plain', 'application/octet-stream'],
  tap: ['text/x.gcode', 'text/plain', 'application/octet-stream'],
  ngc: ['text/x.gcode', 'text/plain', 'application/octet-stream'],
  cnc: ['text/x.gcode', 'text/plain', 'application/octet-stream'],
  // A FreeCAD document is a zip around a BREP, so browsers report it either way.
  fcstd: ['application/octet-stream', 'application/zip', 'application/x-zip-compressed'],
  scad: ['text/plain', 'application/x-openscad', 'application/octet-stream'],
  tif: ['image/tiff', 'image/tif', 'application/octet-stream'],
  tiff: ['image/tiff', 'image/tif', 'application/octet-stream'],
  // Not accepted for designs — kept so re-enabling `zip` anywhere else still
  // gets a mime check rather than silently skipping one.
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
  // octet-stream covers the machines whose OS has no association registered.
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
  ],
  xls: ['application/vnd.ms-excel'],
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
  ],
};

const KIND_BY_EXTENSION = {
  stl: FILE_KIND.MODEL, step: FILE_KIND.MODEL, stp: FILE_KIND.MODEL, iges: FILE_KIND.MODEL,
  igs: FILE_KIND.MODEL, '3mf': FILE_KIND.MODEL, obj: FILE_KIND.MODEL, mtl: FILE_KIND.MODEL,
  ply: FILE_KIND.MODEL, glb: FILE_KIND.MODEL, gltf: FILE_KIND.MODEL, fbx: FILE_KIND.MODEL,
  dxf: FILE_KIND.MODEL, dwg: FILE_KIND.MODEL, gds: FILE_KIND.MODEL, gdsii: FILE_KIND.MODEL,
  fcstd: FILE_KIND.MODEL, scad: FILE_KIND.MODEL,
  gcode: FILE_KIND.MODEL, nc: FILE_KIND.MODEL, tap: FILE_KIND.MODEL,
  ngc: FILE_KIND.MODEL, cnc: FILE_KIND.MODEL,
  jpg: FILE_KIND.IMAGE, jpeg: FILE_KIND.IMAGE, png: FILE_KIND.IMAGE, webp: FILE_KIND.IMAGE,
  gif: FILE_KIND.IMAGE, svg: FILE_KIND.IMAGE, tif: FILE_KIND.IMAGE, tiff: FILE_KIND.IMAGE,
  pdf: FILE_KIND.DOCUMENT, doc: FILE_KIND.DOCUMENT, docx: FILE_KIND.DOCUMENT,
  xls: FILE_KIND.DOCUMENT, xlsx: FILE_KIND.DOCUMENT, txt: FILE_KIND.DOCUMENT, md: FILE_KIND.DOCUMENT,
  zip: FILE_KIND.ARCHIVE,
  json: FILE_KIND.DATA, csv: FILE_KIND.DATA,
};

/** @returns {string} lowercase extension without the dot. */
function extensionOf(filename) {
  return path.extname(filename || '').replace('.', '').toLowerCase();
}

/** Names Windows refuses as a file, whatever the extension. */
const RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/**
 * Reduces a client-supplied filename to one safe path segment, keeping it
 * recognisable to the person who uploaded it.
 *
 * Uploaders asked for their own names on disk, so this is the boundary that
 * makes that safe: `basename` drops any directory the client tried to smuggle
 * in, and the remaining rules kill the tricks that survive it — `..`,
 * separators, NUL and control bytes, trailing dots/spaces (Windows strips
 * those and can re-expose a blocked extension), and reserved device names.
 * Returns '' when nothing usable is left, so callers fall back to a uuid.
 */
function safeFileName(originalName, { maxLength = 120 } = {}) {
  const base = path.basename(String(originalName || '')).replace(/\\/g, '/').split('/').pop() || '';

  const ext = extensionOf(base);
  const suffix = ext ? `.${ext}` : '';

  let stem = ext ? base.slice(0, base.length - suffix.length) : base;

  stem = stem
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    // Leading dots would hide the file; a bare ".." must not survive.
    .replace(/^[.\s]+/, '')
    .replace(/[.\s]+$/, '')
    .trim();

  if (RESERVED_NAMES.has(stem.toLowerCase())) stem = `_${stem}`;
  if (stem.length > maxLength) stem = stem.slice(0, maxLength).trim();
  if (!stem) return '';

  return `${stem}${suffix}`;
}

/**
 * Slug identifying the uploader, prefixed onto every stored filename so the
 * owner of a file is readable straight off the disk — `m.vanderberg-Lung
 * chip.stl` rather than an anonymous `Lung chip.stl`.
 *
 * Handles are unique and already url-safe, which also means two people
 * uploading "chip.stl" no longer collide into a "(1)" suffix. Returns '' for an
 * unauthenticated request, though every upload route sits behind `authenticate`.
 */
function uploaderTag(user) {
  if (!user) return '';
  const raw = String(user.handle || user.name || (user.id ? `user-${user.id}` : '')).trim();

  return raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .slice(0, 40);
}

/**
 * First free name in `dir` for `desired`, as "file.stl", "file (1).stl", …
 * `taken` carries the names already claimed by earlier files in the same
 * request, which are streaming and may not be on disk yet.
 */
function uniqueFileName(dir, desired, taken = new Set()) {
  const ext = path.extname(desired);
  const stem = desired.slice(0, desired.length - ext.length);

  for (let n = 0; n < 1000; n += 1) {
    const candidate = n === 0 ? desired : `${stem} (${n})${ext}`;
    if (!taken.has(candidate.toLowerCase()) && !fs.existsSync(path.join(dir, candidate))) {
      return candidate;
    }
  }
  // Pathological case (1000 same-named files in one month) — fall back to a uuid.
  return `${stem}-${uuidv4()}${ext}`;
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
  // Absolute URL: a path-only value would resolve against the *frontend* origin
  // in the browser and 404 whenever the client is served from a different host.
  const base = /^https?:\/\//i.test(config.upload.publicPath)
    ? config.upload.publicPath
    : `${config.app.url}${config.upload.publicPath}`;

  // Uploads keep the name the user gave them, so a stored path can legitimately
  // contain characters that mean something else in a URL. A browser encodes
  // spaces on its own, but "chip#2.stl" would be read as a fragment and never
  // reach the server — encode per segment so the separators survive.
  const encoded = String(relative)
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  return `${base}/${encoded}`;
}

function buildStorage(folder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      try {
        const dir = destinationFor(folder);
        // Multer calls destination() then filename() for the same file, and
        // filename() is not told the directory — stash it so the uniqueness
        // check below can look inside the folder the file is heading for.
        req._uploadDir = dir;
        cb(null, dir);
      } catch (err) {
        cb(ApiError.internal(`Could not create the upload directory: ${err.message}`));
      }
    },
    filename(req, file, cb) {
      const ext = extensionOf(file.originalname);
      const dir = req._uploadDir || path.join(config.upload.root, folder);

      // Uploads keep the name the user gave them, sanitised to a single safe
      // segment. An unusable name (all separators, control bytes, empty) falls
      // back to a uuid rather than failing the upload.
      const safe = safeFileName(file.originalname) || `${Date.now()}-${uuidv4()}${ext ? `.${ext}` : ''}`;

      // Prefixed with the uploader so the file's owner is obvious on disk.
      const tag = uploaderTag(req.user);
      const named = tag ? `${tag}-${safe}` : safe;

      // Earlier files in this request are still streaming, so disk existence
      // alone would hand two of them the same name.
      req._takenUploadNames = req._takenUploadNames || new Set();
      const finalName = uniqueFileName(dir, named, req._takenUploadNames);
      req._takenUploadNames.add(finalName.toLowerCase());

      cb(null, finalName);
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

/**
 * Duplicates an already-stored file so a second DB row can own its own bytes.
 *
 * Carrying a file from one design version to the next cannot share a path: the
 * two rows are deleted independently, and `removeStoredFile` would take the
 * bytes out from under whichever version was not deleted. The copy lands in the
 * current YYYY/MM partition under a free name and is returned in the same shape
 * `describeFile` produces, so callers can spread it straight into a file row.
 *
 * Returns null when the source is gone from disk — a carried-forward file that
 * no longer exists should be skipped, not fail the whole version.
 */
async function copyStoredFile(relative, folder, { originalName } = {}) {
  if (!relative) return null;

  const source = path.join(config.upload.root, relative);
  if (!source.startsWith(config.upload.root) || !fs.existsSync(source)) return null;

  const dir = destinationFor(folder);
  const name = uniqueFileName(dir, path.basename(relative));
  const target = path.join(dir, name);

  await fs.promises.copyFile(source, target);

  return {
    stored_name: name,
    path: relativePath(target),
    // Kind is re-derived from the display name so it matches what an upload of
    // the same file would have recorded.
    kind: kindOf(originalName || relative),
  };
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
  copyStoredFile,
  describeFile,
  publicUrlFor,
  relativePath,
  extensionOf,
  kindOf,
  safeFileName,
  uniqueFileName,
  uploaderTag,
  BLOCKED_EXTENSIONS,
};
