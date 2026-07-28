/**
 * API v1 router — the single place every module is mounted.
 *
 * Screen coverage:
 *   /auth          SCR-009..013, SCR-015
 *   /users         SCR-014, SCR-015, SCR-016
 *   /taxonomies    filter + wizard option lists (SCR-017, SCR-021)
 *   /designs       SCR-017..023
 *   /forum         SCR-024..028
 *   /messages      SCR-029, SCR-030
 *   /notifications SCR-031
 *   /admin         SCR-032..038
 *   /commercial    SCR-039 (behind FEATURE_COMMERCIAL)
 *   /content       SCR-001..008
 *   /reports       CHIP-052 flagging
 */
const express = require('express');
const config = require('../config');
const ApiResponse = require('../utils/ApiResponse');

const router = express.Router();

const routes = [
  { path: '/auth', handler: require('../modules/auth/auth.routes') },
  { path: '/users', handler: require('../modules/users/user.routes') },
  { path: '/taxonomies', handler: require('../modules/taxonomy/taxonomy.routes') },
  { path: '/designs', handler: require('../modules/designs/design.routes') },
  { path: '/forum', handler: require('../modules/forum/forum.routes') },
  { path: '/messages', handler: require('../modules/messages/message.routes') },
  { path: '/notifications', handler: require('../modules/notifications/notification.routes') },
  { path: '/reports', handler: require('../modules/moderation/moderation.routes') },
  { path: '/content', handler: require('../modules/content/content.routes') },
  { path: '/admin', handler: require('../modules/admin/admin.routes') },
  { path: '/commercial', handler: require('../modules/commercial/commercial.routes') },
];

routes.forEach(({ path, handler }) => router.use(path, handler));

/** Service descriptor — handy for smoke tests and for the frontend to verify the base URL. */
router.get('/', (req, res) =>
  ApiResponse.success(res, {
    data: {
      name: `${config.app.name} API`,
      version: 'v1',
      environment: config.env,
      endpoints: routes.map((r) => `${config.app.apiPrefix}${r.path}`),
      documentation: `${config.app.url}/docs`,
    },
    message: 'Chipper API v1',
  }),
);

module.exports = router;
