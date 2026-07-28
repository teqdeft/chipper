const fs = require('fs');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const designService = require('./design.service');
const designRepository = require('./design.repository');
const serializer = require('./design.serializer');

const contextOf = (req) => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  requestId: req.id,
  purpose: req.query?.purpose,
});

module.exports = {
  /** SCR-017 */
  browse: asyncHandler(async (req, res) => {
    const { items, pagination, facets } = await designService.browse(req.query, req.user);
    return ApiResponse.paginated(res, {
      items,
      pagination,
      meta: facets ? { facets } : undefined,
      message: 'Designs',
    });
  }),

  /** SCR-018 */
  detail: asyncHandler(async (req, res) => {
    const design = await designService.getDetail(req.params.identifier, {
      versionLabel: req.query.version,
      viewer: req.user,
      context: contextOf(req),
    });
    return ApiResponse.success(res, { data: { design }, message: 'Design detail' });
  }),

  versions: asyncHandler(async (req, res) => {
    const design = await designService.assertVisible(req.params.identifier, req.user);
    const includeDrafts =
      req.user && (Number(design.owner_id) === Number(req.user.id) || ['admin', 'moderator'].includes(req.user.role));
    const versions = await designRepository.listVersions(design.id, { includeDrafts });
    return ApiResponse.success(res, {
      data: versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        note: v.version_note,
        license: v.license_code,
        downloads: Number(v.download_count) || 0,
        publishedAt: v.published_at,
        createdAt: v.created_at,
      })),
      message: 'Versions',
    });
  }),

  /** SCR-019 — data the in-browser 3D viewer needs. */
  viewer: asyncHandler(async (req, res) => {
    const design = await designService.assertVisible(req.params.identifier, req.user);
    const version = req.query.version
      ? await designRepository.findVersion(design.id, req.query.version)
      : await designRepository.findVersion(design.id, design.current_version_id);
    if (!version) throw ApiError.notFound('Version not found');

    const files = await designRepository.listFiles(version.id);
    const viewable = files.filter((f) => ['stl', '3mf', 'obj'].includes((f.extension || '').toLowerCase()));

    return ApiResponse.success(res, {
      data: {
        design: { id: design.uuid, title: design.title, version: version.version },
        // Formats the browser can render today; the rest are download-only.
        viewableFiles: viewable.map(serializer.toFile),
        allFiles: files.map(serializer.toFile),
        supportedFormats: ['stl', '3mf', 'obj'],
      },
      message: 'Viewer payload',
    });
  }),

  related: asyncHandler(async (req, res) => {
    const items = await designService.related(req.params.identifier, req.user);
    return ApiResponse.success(res, { data: items, message: 'Related designs' });
  }),

  /** SCR-021 */
  create: asyncHandler(async (req, res) => {
    const design = await designService.create(req.body, req.user, contextOf(req));
    return ApiResponse.created(res, { data: { design }, message: 'Design created as a draft' });
  }),

  /** SCR-023 */
  update: asyncHandler(async (req, res) => {
    const design = await designService.update(req.params.identifier, req.body, req.user, contextOf(req));
    return ApiResponse.success(res, { data: { design }, message: 'Design updated' });
  }),

  createVersion: asyncHandler(async (req, res) => {
    const version = await designService.createVersion(req.params.identifier, req.body, req.user, contextOf(req));
    return ApiResponse.created(res, { data: { version }, message: 'New version created' });
  }),

  publish: asyncHandler(async (req, res) => {
    const result = await designService.publish(req.params.identifier, req.body, req.user, contextOf(req));
    return ApiResponse.success(res, { data: result, message: result.message });
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await designService.remove(req.params.identifier, req.user, contextOf(req));
    return ApiResponse.success(res, { data: result, message: 'Design removed' });
  }),

  /** SCR-022 */
  listMine: asyncHandler(async (req, res) => {
    const { items, pagination } = await designService.listMine(req.query, req.user);
    return ApiResponse.paginated(res, { items, pagination, message: 'Your designs' });
  }),

  // ── Files ────────────────────────────────────────────────────────────────
  addFiles: asyncHandler(async (req, res) => {
    const files = await designService.addFiles(
      req.params.identifier,
      { ...req.body, files: req.files },
      req.user,
      contextOf(req),
    );
    return ApiResponse.created(res, { data: { files }, message: 'Files uploaded' });
  }),

  removeFile: asyncHandler(async (req, res) => {
    const result = await designService.removeFile(
      req.params.identifier,
      req.params.fileId,
      req.user,
      contextOf(req),
    );
    return ApiResponse.success(res, { data: result, message: 'File removed' });
  }),

  /**
   * SCR-020 — download gate. The download is recorded against the signed-in user
   * before a single byte is streamed.
   */
  download: asyncHandler(async (req, res) => {
    const { absolutePath, fileName, mimeType, sizeBytes } = await designService.prepareDownload(
      req.params.identifier,
      {
        fileId: req.query.fileId,
        versionLabel: req.query.version,
        acceptLicense: req.query.acceptLicense,
      },
      req.user,
      contextOf(req),
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', sizeBytes);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );

    const stream = fs.createReadStream(absolutePath);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });
    stream.pipe(res);
  }),

  /** Download metadata without transferring the file — powers the gate screen. */
  downloadInfo: asyncHandler(async (req, res) => {
    const design = await designService.assertVisible(req.params.identifier, req.user);
    const version = await designRepository.findVersion(design.id, design.current_version_id);
    const files = version ? await designRepository.listFiles(version.id) : [];

    return ApiResponse.success(res, {
      data: {
        design: { id: design.uuid, slug: design.slug, title: design.title },
        version: version ? { id: version.id, version: version.version } : null,
        license: version?.license_code
          ? { code: version.license_code, name: version.license_name, url: version.license_url }
          : null,
        howToCite: version?.how_to_cite || null,
        files: files.map(serializer.toFile),
        requiresLogin: true,
        isAuthenticated: Boolean(req.user),
      },
      message: 'Download information',
    });
  }),

  // ── Engagement ───────────────────────────────────────────────────────────
  toggleStar: asyncHandler(async (req, res) => {
    const result = await designService.toggleStar(req.params.identifier, req.user);
    return ApiResponse.success(res, { data: result, message: result.starred ? 'Design starred' : 'Star removed' });
  }),

  setOwnership: asyncHandler(async (req, res) => {
    const result = await designService.setOwnership(req.params.identifier, req.body, req.user);
    return ApiResponse.success(res, { data: result, message: 'Thanks — your acknowledgement was saved' });
  }),

  listOwnerships: asyncHandler(async (req, res) => {
    const items = await designService.listOwnerships(req.params.identifier, req.user);
    return ApiResponse.success(res, { data: items, message: '"I have one" acknowledgements' });
  }),

  // ── Comments ─────────────────────────────────────────────────────────────
  listComments: asyncHandler(async (req, res) => {
    const { items, pagination } = await designService.listComments(req.params.identifier, req.query, req.user);
    return ApiResponse.paginated(res, { items, pagination, message: 'Comments' });
  }),

  addComment: asyncHandler(async (req, res) => {
    const comment = await designService.addComment(req.params.identifier, req.body, req.user);
    return ApiResponse.created(res, { data: { comment }, message: 'Comment posted' });
  }),

  updateComment: asyncHandler(async (req, res) => {
    const comment = await designService.updateComment(req.params.commentId, req.body, req.user);
    return ApiResponse.success(res, { data: { comment }, message: 'Comment updated' });
  }),

  deleteComment: asyncHandler(async (req, res) => {
    const result = await designService.deleteComment(req.params.commentId, req.user);
    return ApiResponse.success(res, { data: result, message: 'Comment removed' });
  }),
};
