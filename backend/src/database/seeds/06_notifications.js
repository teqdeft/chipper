/**
 * Demo in-app notifications so SCR-031 is not empty after a fresh seed.
 */
const { NOTIFICATION_TYPE, ENTITY_TYPE } = require('../../config/constants');

exports.seed = async function seed(knex) {
  const users = await knex('users').select('id', 'handle');
  const byHandle = Object.fromEntries(users.map((u) => [u.handle, u.id]));

  const aChen = byHandle['a.chen'];
  const vanDerBerg = byHandle['m.vanderberg'];
  const patel = byHandle['s.patel'];
  if (!aChen || !vanDerBerg) return;

  await knex('notifications').del();

  const now = Date.now();
  const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000);

  const rows = [
    {
      user_id: aChen,
      actor_id: vanDerBerg,
      type: NOTIFICATION_TYPE.FORUM_REPLY,
      title: 'New reply in "PDMS bonding failures after plasma - checklist?"',
      body: 'Dr. M. van der Berg: Log chamber pressure and O₂ flow…',
      link: '/forum/t/pdms-bonding-failures-after-plasma-checklist',
      entity_type: ENTITY_TYPE.FORUM_TOPIC,
      created_at: hoursAgo(2),
    },
    {
      user_id: aChen,
      actor_id: vanDerBerg,
      type: NOTIFICATION_TYPE.DESIGN_STARRED,
      title: 'Dr. M. van der Berg starred your design',
      body: 'Lung-on-chip alveolar barrier scaffold',
      link: '/designs',
      entity_type: ENTITY_TYPE.DESIGN,
      created_at: hoursAgo(5),
    },
    {
      user_id: aChen,
      actor_id: null,
      type: NOTIFICATION_TYPE.DESIGN_APPROVED,
      title: 'Your design was approved',
      body: 'It is now live in the Chipper library.',
      link: '/my-designs',
      entity_type: ENTITY_TYPE.DESIGN,
      created_at: hoursAgo(20),
    },
    {
      user_id: aChen,
      actor_id: null,
      type: NOTIFICATION_TYPE.BADGE_EARNED,
      title: 'You earned the “Early adopter” badge',
      body: 'Thanks for joining Chipper in the early days.',
      link: '/settings/profile',
      entity_type: ENTITY_TYPE.USER,
      entity_id: aChen,
      created_at: hoursAgo(48),
      read_at: hoursAgo(40),
    },
    {
      user_id: aChen,
      actor_id: null,
      type: NOTIFICATION_TYPE.WELCOME,
      title: 'Welcome to Chipper',
      body: 'Your account is verified. Explore designs, join the forum, or upload your first chip.',
      link: '/designs',
      created_at: hoursAgo(72),
      read_at: hoursAgo(70),
    },
    {
      user_id: vanDerBerg,
      actor_id: aChen,
      type: NOTIFICATION_TYPE.DESIGN_COMMENT,
      title: 'A. Chen commented on your design',
      body: 'Have you tried a longer O₂ plasma step after pump-down?',
      link: '/designs',
      entity_type: ENTITY_TYPE.DESIGN,
      created_at: hoursAgo(3),
    },
    {
      user_id: vanDerBerg,
      actor_id: aChen,
      type: NOTIFICATION_TYPE.FORUM_ANSWER_ACCEPTED,
      title: 'Your answer was accepted',
      body: 'Best practice for citing a Chipper design in a paper?',
      link: '/forum/t/best-practice-for-citing-a-chipper-design-in-a-paper',
      entity_type: ENTITY_TYPE.FORUM_POST,
      created_at: hoursAgo(8),
    },
    {
      user_id: vanDerBerg,
      actor_id: patel || aChen,
      type: NOTIFICATION_TYPE.MESSAGE_RECEIVED,
      title: 'New message',
      body: 'Quick question about your fabrication notes…',
      link: '/messages',
      entity_type: ENTITY_TYPE.MESSAGE,
      created_at: hoursAgo(1),
    },
  ];

  await knex('notifications').insert(
    rows.map(({ read_at, entity_id, body, ...row }) => ({
      ...row,
      body: body || null,
      entity_id: entity_id || null,
      data: null,
      read_at: read_at || null,
    })),
  );
};
