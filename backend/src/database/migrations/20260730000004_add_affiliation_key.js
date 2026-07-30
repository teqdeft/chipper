/**
 * Links members to the institution account they belong to.
 *
 * `affiliation` is free text a member types ("The University of Twente."), so it
 * cannot be joined on directly. `affiliation_key` holds the normalised form of
 * that text (see utils/helpers.normalizeAffiliation) and is what an institution
 * profile matches its members on. Kept as a plain indexed column rather than a
 * foreign key: members type an employer, they do not pick one from a list, and
 * the institution may well sign up *after* its researchers did.
 */
const { affiliationKeyForRow } = require('../../modules/users/affiliation');

exports.up = async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('affiliation_key', 190).nullable().after('affiliation').comment('Normalised affiliation for member lookups');
    t.index(['affiliation_key'], 'users_affiliation_key_idx');
  });

  // Backfill: normalisation lives in JS, so this cannot be a single UPDATE.
  // Institution accounts are included even without an affiliation of their own —
  // their key comes from their name.
  const rows = await knex('users').select('id', 'name', 'affiliation', 'account_type');
  for (const row of rows) {
    const key = affiliationKeyForRow(row);
    if (!key) continue;
    // eslint-disable-next-line no-await-in-loop
    await knex('users').where({ id: row.id }).update({ affiliation_key: key });
  }
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropIndex(['affiliation_key'], 'users_affiliation_key_idx');
    t.dropColumn('affiliation_key');
  });
};
