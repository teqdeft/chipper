/**
 * Roles and badges. Idempotent: safe to re-run on an existing database.
 */
const { ROLES, ROLE_LEVEL } = require('../../config/constants');
const { permissionsForRole } = require('../../config/permissions');

const ROLE_ROWS = [
  { name: ROLES.USER, label: 'User', description: 'Browse, download, comment, post, message and publish designs.' },
  { name: ROLES.UPLOADER, label: 'Uploader', description: 'Same as user — the role every verified signup receives.' },
  { name: ROLES.COMMERCIAL, label: 'Commercial', description: 'Company account able to manage listings.' },
  { name: ROLES.MODERATOR, label: 'Moderator', description: 'Reviews flagged content and moderates the community.' },
  { name: ROLES.ADMIN, label: 'Admin', description: 'Full platform administration.' },
];

const BADGES = [
  { slug: 'verified-maker', name: 'Verified maker', description: 'Identity and affiliation confirmed by Chipper.', tone: 'green', sort_order: 1 },
  { slug: 'iso-contributor', name: 'ISO contributor', description: 'Contributed to ISO 22916 metadata alignment.', tone: 'periwinkle', sort_order: 2 },
  { slug: 'early-adopter', name: 'Early adopter', description: 'Joined in the first wave of labs.', tone: 'coral', sort_order: 3 },
  { slug: 'first-upload', name: 'First upload', description: 'Published a first design to the library.', tone: 'green', sort_order: 4 },
  { slug: 'top-contributor', name: 'Top contributor', description: 'Among the most reused makers on the platform.', tone: 'coral', sort_order: 5 },
  { slug: 'helpful-answer', name: 'Helpful answer', description: 'Answer accepted in the community forum.', tone: 'green', sort_order: 6 },
];

exports.seed = async function seed(knex) {
  const roles = ROLE_ROWS.map((role) => ({
    ...role,
    level: ROLE_LEVEL[role.name],
    permissions: JSON.stringify(permissionsForRole(role.name)),
  }));

  await knex('roles').insert(roles).onConflict('name').merge(['label', 'level', 'description', 'permissions']);
  await knex('badges').insert(BADGES).onConflict('slug').merge(['name', 'description', 'tone', 'sort_order']);
};
