/**
 * User serialisers.
 *
 * The database row never reaches the client directly — password_hash, login
 * counters and lock state must not leak, and the frontend expects camelCase keys
 * matching its MockUser type (handle, name, affiliation, role, bio, badges,
 * expertise, uploads, reputation).
 */
const { publicUrlFor } = require('../../middlewares/upload');

/** Fields any visitor may see (SCR-016 · public profile). */
function toPublicUser(user, { badges = [], expertise = [], settings } = {}) {
  if (!user) return null;
  return {
    id: user.id,
    uuid: user.uuid,
    handle: user.handle,
    name: user.name,
    affiliation: user.affiliation || null,
    accountType: user.account_type || null,
    country: user.country || null,
    website: user.website || null,
    orcid: user.orcid || null,
    bio: user.bio || null,
    avatarUrl: publicUrlFor(user.avatar_path),
    role: user.role,
    status: user.status,
    reputation: Number(user.reputation) || 0,
    uploads: Number(user.upload_count) || 0,
    badges: badges.map((b) => (typeof b === 'string' ? b : b.name)),
    badgeDetails: badges
      .filter((b) => typeof b !== 'string')
      .map((b) => ({
        slug: b.slug,
        name: b.name,
        description: b.description || null,
        tone: b.tone || 'ink',
        awardedAt: b.awarded_at || null,
      })),
    expertise,
    // Email is exposed only when the member opted in.
    ...(settings && settings.show_email ? { email: user.email } : {}),
    joinedAt: user.created_at,
  };
}

/** Everything the owner sees about their own account (SCR-014, SCR-015). */
function toPrivateUser(user, extras = {}) {
  const base = toPublicUser(user, extras);
  if (!base) return null;
  return {
    ...base,
    email: user.email,
    emailVerified: Boolean(user.email_verified_at),
    emailVerifiedAt: user.email_verified_at || null,
    downloads: Number(user.download_count) || 0,
    lastLoginAt: user.last_login_at || null,
    settings: extras.settings ? toSettings(extras.settings) : undefined,
    permissions: extras.permissions,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/** Row shape for admin tables (SCR-033). */
function toAdminUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    handle: user.handle,
    email: user.email,
    role: user.role,
    status: user.status,
    affiliation: user.affiliation || null,
    emailVerified: Boolean(user.email_verified_at),
    reputation: Number(user.reputation) || 0,
    uploads: Number(user.upload_count) || 0,
    lastLoginAt: user.last_login_at || null,
    createdAt: user.created_at,
    avatarUrl: publicUrlFor(user.avatar_path),
  };
}

/**
 * Compact row for the member list on an institution's profile — enough to
 * render a card and link to the full page, nothing more.
 */
function toMemberCard(user) {
  if (!user) return null;
  return {
    id: user.id,
    uuid: user.uuid,
    handle: user.handle,
    name: user.name,
    accountType: user.account_type || null,
    affiliation: user.affiliation || null,
    avatarUrl: publicUrlFor(user.avatar_path),
    uploads: Number(user.upload_count) || 0,
    reputation: Number(user.reputation) || 0,
  };
}

/** The institution a member is affiliated with, when it holds an account here. */
function toInstitutionRef(row) {
  if (!row) return null;
  return {
    name: row.name,
    handle: row.handle,
    avatarUrl: publicUrlFor(row.avatar_path),
  };
}

/** Compact author block embedded in designs, comments, posts and messages. */
function toAuthorRef(row, prefix = 'author_') {
  if (!row || !row[`${prefix}id`]) return null;
  return {
    id: row[`${prefix}id`],
    name: row[`${prefix}name`],
    handle: row[`${prefix}handle`],
    affiliation: row[`${prefix}affiliation`] || null,
    avatarUrl: publicUrlFor(row[`${prefix}avatar_path`]),
  };
}

function toSettings(settings) {
  if (!settings) return null;
  return {
    emailNotifications: Boolean(settings.email_notifications),
    notifyDesignComments: Boolean(settings.notify_design_comments),
    notifyForumReplies: Boolean(settings.notify_forum_replies),
    notifyMentions: Boolean(settings.notify_mentions),
    notifyMessages: Boolean(settings.notify_messages),
    notifyNewsletter: Boolean(settings.notify_newsletter),
    profilePublic: Boolean(settings.profile_public),
    showEmail: Boolean(settings.show_email),
    locale: settings.locale || 'en',
  };
}

module.exports = {
  toPublicUser,
  toPrivateUser,
  toAdminUser,
  toAuthorRef,
  toMemberCard,
  toInstitutionRef,
  toSettings,
};
