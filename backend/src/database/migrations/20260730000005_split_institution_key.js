/**
 * Separates "the institution I named" from "what I am called as an institution".
 *
 * 20260730000004 derived an institution account's key from `affiliation || name`,
 * which let an account named "test1" that listed "CK University" as its own
 * affiliation claim every CK University member. Identity now comes from the name
 * alone, in its own column — see modules/users/affiliation.js.
 */
const { identityKeysForRow } = require('../../modules/users/affiliation');

exports.up = async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('institution_key', 190).nullable().after('affiliation_key').comment('Institution accounts: normalised own name');
    t.index(['institution_key'], 'users_institution_key_idx');
  });

  // Recomputes both columns: affiliation_key must also be rewritten, because
  // institution rows previously borrowed it for their identity.
  const rows = await knex('users').select('id', 'name', 'affiliation', 'account_type');
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    await knex('users').where({ id: row.id }).update(identityKeysForRow(row));
  }
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropIndex(['institution_key'], 'users_institution_key_idx');
    t.dropColumn('institution_key');
  });
};
