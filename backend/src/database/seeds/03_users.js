/**
 * Platform users.
 *
 * The admin account is always created (credentials come from env so production
 * can set a real password). Demo members mirror src/lib/mock/index.ts in the
 * frontend so the UI keeps working when it is switched from mocks to the API.
 * Demo accounts are skipped in production.
 */
const config = require('../../config');
const { hashPassword } = require('../../utils/password');
const { uuid } = require('../../utils/helpers');
const { ROLES, USER_STATUS } = require('../../config/constants');

const DEMO_USERS = [
  {
    name: 'Dr. M. van der Berg',
    handle: 'm.vanderberg',
    email: 'm.vanderberg@utwente.nl',
    role: ROLES.UPLOADER,
    affiliation: 'University of Twente',
    account_type: 'researcher',
    country: 'Netherlands',
    bio: 'Building open alveolar barrier models for MPS research.',
    reputation: 840,
    expertise: ['Lung', 'PDMS', 'Soft lithography'],
    badges: ['verified-maker', 'iso-contributor'],
  },
  {
    name: 'A. Chen',
    handle: 'a.chen',
    email: 'a.chen@tno.nl',
    role: ROLES.UPLOADER,
    affiliation: 'TNO',
    account_type: 'researcher',
    country: 'Netherlands',
    bio: 'Perfusion systems and inline sensing.',
    reputation: 210,
    expertise: ['Liver', 'Sensors'],
    badges: ['early-adopter'],
  },
  {
    name: 'J. Moderator',
    handle: 'j.moderator',
    email: 'moderator@chipper.org',
    role: ROLES.MODERATOR,
    affiliation: 'Chipper',
    account_type: 'institution',
    bio: 'Keeps the community calm and the metadata honest.',
    reputation: 120,
    expertise: [],
    badges: [],
  },
  // A plain member: browses, downloads, comments and posts, but cannot upload —
  // the account to test the Uploader+ screens against (SCR-021..023).
  {
    name: 'S. Patel',
    handle: 's.patel',
    email: 'user@chipper.org',
    role: ROLES.USER,
    affiliation: 'Leiden University',
    account_type: 'student',
    country: 'Netherlands',
    bio: 'PhD student reading up on barrier models.',
    reputation: 15,
    expertise: ['Gut'],
    badges: [],
  },
  // Company account for the commercial module (SCR-039, behind FEATURE_COMMERCIAL).
  {
    name: 'Micro Systems BV',
    handle: 'microsystems',
    email: 'seller@chipper.org',
    role: ROLES.COMMERCIAL,
    affiliation: 'Micro Systems BV',
    account_type: 'institution',
    country: 'Netherlands',
    bio: 'Supplier of microfluidic components and fluidic circuit boards.',
    reputation: 40,
    expertise: ['Sensors', 'FCB'],
    badges: [],
  },
];

exports.seed = async function seed(knex) {
  const roles = await knex('roles').select('id', 'name');
  const roleId = Object.fromEntries(roles.map((r) => [r.name, r.id]));
  const badges = await knex('badges').select('id', 'slug');
  const badgeId = Object.fromEntries(badges.map((b) => [b.slug, b.id]));

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@chipper.org').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Chipper@2026';

  const existingAdmin = await knex('users').where({ email: adminEmail }).first();
  if (!existingAdmin) {
    const [adminId] = await knex('users').insert({
      uuid: uuid(),
      name: process.env.SEED_ADMIN_NAME || 'Chipper Admin',
      handle: 'admin',
      email: adminEmail,
      password_hash: await hashPassword(adminPassword),
      role_id: roleId[ROLES.ADMIN],
      affiliation: 'Chipper',
      status: USER_STATUS.ACTIVE,
      email_verified_at: knex.fn.now(),
    });
    await knex('user_settings').insert({ user_id: adminId });

    // eslint-disable-next-line no-console
    console.log(`  ✓ admin account created: ${adminEmail} / ${adminPassword}`);
    if (config.isProduction) {
      // eslint-disable-next-line no-console
      console.warn('  ! Change the admin password immediately after the first login.');
    }
  }

  if (config.isProduction) return;

  const demoPassword = await hashPassword(process.env.SEED_DEMO_PASSWORD || 'Chipper@2026');

  for (const demo of DEMO_USERS) {
    const existing = await knex('users').where({ email: demo.email }).first();
    if (existing) continue;

    const [userId] = await knex('users').insert({
      uuid: uuid(),
      name: demo.name,
      handle: demo.handle,
      email: demo.email,
      password_hash: demoPassword,
      role_id: roleId[demo.role],
      affiliation: demo.affiliation,
      account_type: demo.account_type,
      country: demo.country || null,
      bio: demo.bio,
      status: USER_STATUS.ACTIVE,
      email_verified_at: knex.fn.now(),
      reputation: demo.reputation,
    });

    await knex('user_settings').insert({ user_id: userId });

    if (demo.expertise.length) {
      await knex('user_expertise').insert(demo.expertise.map((term) => ({ user_id: userId, term })));
    }
    if (demo.badges.length) {
      await knex('user_badges').insert(
        demo.badges.filter((slug) => badgeId[slug]).map((slug) => ({ user_id: userId, badge_id: badgeId[slug] })),
      );
    }
  }
};
