/**
 * Editorial content: static pages, forum categories, news posts, site settings.
 * Copy is taken from the frontend content file so the marketing pages render
 * identically once they read from the CMS.
 */
const { CONTENT_STATUS } = require('../../config/constants');

const PAGES = [
  {
    slug: 'about',
    title: 'About Chipper',
    body: [
      'Chipper is an open community for microphysiological systems. Researchers share organ-on-chip designs with their metadata, licence and 3D model, so others can inspect, cite and reuse them.',
      'A microphysiological system recreates the functional unit of a human organ on a transparent microfluidic chip. Living cells are cultured inside micron-scale channels under controlled flow and mechanical cues.',
      'The platform is built with the University of Twente and TNO, and grown by the labs that upload to it. People first. No sponsors.',
    ].join('\n\n'),
    is_system: true,
  },
  {
    slug: 'how-it-works',
    title: 'How it works',
    body: [
      'Inspect — open the 3D preview, read the metadata, check the licence and the ISO 22916 status. Trust before download.',
      'Cite — every design carries its maker and its version, so it can be cited the way any other result would be.',
      'Reuse — download the geometry, adapt it to your run, and keep the provenance chain intact for the next lab.',
      'Publish — share what you build. Attach your metadata and licence, confirm compliance, and the loop starts again.',
    ].join('\n\n'),
    is_system: true,
  },
  {
    slug: 'privacy',
    title: 'Privacy policy',
    body: 'Placeholder privacy policy. The client supplies the final text before launch.',
    is_system: true,
  },
  {
    slug: 'terms',
    title: 'Terms & conditions',
    body: 'Placeholder terms and conditions. The client supplies the final text before launch.',
    is_system: true,
  },
  {
    slug: 'licenses',
    title: 'Licences explained',
    body: 'Open licences keep provenance intact. Each design declares its licence up front so reuse is a decision, not a risk. See the licence list endpoint for the full catalogue and how to cite each one.',
    is_system: true,
  },
];

const FORUM_CATEGORIES = [
  { slug: 'getting-started', name: 'Getting started', description: 'New to Chipper or to MPS? Start here.', sort_order: 1 },
  { slug: 'fabrication', name: 'Fabrication', description: 'Bonding, moulding, machining and printing.', sort_order: 2 },
  { slug: 'metadata-licences', name: 'Metadata & licences', description: 'ISO 22916, citation, licensing and provenance.', sort_order: 3 },
  { slug: 'troubleshooting', name: 'Troubleshooting', description: 'When a run does not behave.', sort_order: 4 },
  { slug: 'announcements', name: 'Announcements', description: 'Platform news from the Chipper team.', sort_order: 5 },
];

const NEWS = [
  {
    slug: 'playground-opens',
    title: 'Chipper Open Playground is live',
    excerpt: 'Researchers can now inspect, cite and reuse open organ-on-chip designs with provenance intact.',
    body: [
      'Today we open the Chipper Playground to the MPS community. Every design carries its maker, licence, metadata and version history in plain sight.',
      'Browse the library, download what you need under the stated licence, and upload what you build so the next lab can stand on your work.',
    ].join('\n\n'),
    category: 'Announcement',
    published_at: '2026-06-01 09:00:00',
  },
  {
    slug: 'iso-22916-guide',
    title: 'How we map designs to ISO 22916',
    excerpt: 'A short guide for uploaders on component types, units and compliance checkboxes.',
    body: [
      'ISO 22916 gives the field a shared vocabulary for microphysiological systems. Chipper asks uploaders to declare component type and key operating parameters so reuse stays honest.',
      'This guide walks through the metadata fields and what "compliant" means on the platform today.',
    ].join('\n\n'),
    category: 'Guide',
    published_at: '2026-05-20 09:00:00',
  },
  {
    slug: 'mps-world-summit',
    title: 'See you at MPS World Summit',
    excerpt: 'Meet the team, share feedback, and walk through the upload flow in person.',
    body: 'We will be on site with demos of the design library and upload wizard. Bring questions about licensing, citation and versioning.',
    category: 'Event',
    published_at: '2026-05-05 09:00:00',
  },
];

const SETTINGS = [
  { key: 'site.name', value: 'Chipper', group: 'general', is_public: true },
  { key: 'site.tagline', value: 'Share what you build', group: 'general', is_public: true },
  { key: 'site.description', value: 'An open community for microphysiological systems.', group: 'general', is_public: true },
  { key: 'uploads.review_required', value: true, group: 'designs', description: 'New designs enter a moderation queue before publishing.' },
  { key: 'downloads.require_login', value: true, group: 'designs', description: 'Download gate — every download identifies a user.' },
  { key: 'forum.allow_guest_read', value: true, group: 'forum', is_public: true },
  { key: 'registration.open', value: true, group: 'auth', is_public: true },
];

exports.seed = async function seed(knex) {
  const admin = await knex('users')
    .join('roles', 'users.role_id', 'roles.id')
    .where('roles.name', 'admin')
    .select('users.id')
    .first();
  const authorId = admin ? admin.id : null;

  await knex('pages')
    .insert(PAGES.map((p) => ({ ...p, status: CONTENT_STATUS.PUBLISHED, updated_by: authorId })))
    .onConflict('slug')
    .merge(['title', 'body', 'status']);

  await knex('forum_categories')
    .insert(FORUM_CATEGORIES)
    .onConflict('slug')
    .merge(['name', 'description', 'sort_order']);

  await knex('news_posts')
    .insert(
      NEWS.map((n) => ({
        ...n,
        author_id: authorId,
        status: CONTENT_STATUS.PUBLISHED,
      })),
    )
    .onConflict('slug')
    .merge(['title', 'excerpt', 'body', 'category', 'status', 'published_at']);

  await knex('site_settings')
    .insert(
      SETTINGS.map((s) => ({
        key: s.key,
        value: JSON.stringify(s.value),
        group: s.group,
        description: s.description || null,
        is_public: Boolean(s.is_public),
        updated_by: authorId,
      })),
    )
    .onConflict('key')
    .merge(['value', 'group', 'description', 'is_public']);
};
