/**
 * How members and institution accounts find each other.
 *
 * There is no join table: a student types "University of Twente" into a free
 * text field, and the university may only sign up months later. So both sides
 * store a normalised string and matching is an index lookup.
 *
 * Two columns, because a row answers two different questions:
 *
 *   affiliation_key   "which institution did I name?"   — every account
 *   institution_key   "what am I called as one?"        — institution accounts
 *
 * An institution is identified by its NAME, never by its own `affiliation`
 * field. Collapsing the two lets an account called "test1" that happens to list
 * "CK University" as its affiliation take over every CK University member.
 * Keeping them apart also lets a department ("Faculty of Engineering",
 * affiliated with "CK University") hold its own members while still appearing
 * under its parent.
 */
const { normalizeAffiliation } = require('../../utils/helpers');
const { ACCOUNT_TYPE } = require('../../config/constants');

/**
 * The institution this account *belongs to*, for any account type.
 * @returns {string|null} value for `users.affiliation_key`.
 */
function affiliationKeyFor({ affiliation } = {}) {
  return normalizeAffiliation(affiliation);
}

/**
 * This account's own identity as an institution — null for people, so a person
 * can never be matched as somebody's institution.
 * @returns {string|null} value for `users.institution_key`.
 */
function institutionKeyFor({ accountType, name } = {}) {
  if (accountType !== ACCOUNT_TYPE.INSTITUTION) return null;
  return normalizeAffiliation(name);
}

/** Both keys at once, ready to spread into an insert or update. */
function identityKeysFor(user = {}) {
  return {
    affiliation_key: affiliationKeyFor(user),
    institution_key: institutionKeyFor(user),
  };
}

/** Same, reading a database row (snake_case columns). */
function identityKeysForRow(row = {}) {
  return identityKeysFor({
    accountType: row.account_type,
    affiliation: row.affiliation,
    name: row.name,
  });
}

module.exports = {
  affiliationKeyFor,
  institutionKeyFor,
  identityKeysFor,
  identityKeysForRow,
};
