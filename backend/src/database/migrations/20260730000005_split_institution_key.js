/**
 * Separates "the institution I named" from "what I am called as an institution".
 *
 * 20260730000004 derived an institution account's key from `affiliation || name`,
 * which let an account named "test1" that listed "CK University" as its own
 * affiliation claim every CK University member. Identity now comes from the name
 * alone, in its own column:
 *
 *   affiliation_key   "which institution did I name?"   — every account
 *   institution_key   "what am I called as one?"        — institution accounts
 *
 * Self-contained and re-runnable for the same reasons as 20260730000004: a
 * migration must not import application modules that may be refactored later,
 * and MySQL auto-commits DDL so a part-way failure has to be recoverable.
 */
const INDEX_NAME = 'users_institution_key_idx';
const INSTITUTION = 'institution';

function normalize(input) {
  const key = String(input || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 190);
  return key || null;
}

async function hasIndex(knex, table, name) {
  const [rows] = await knex.raw('SHOW INDEX FROM ?? WHERE Key_name = ?', [table, name]);
  return (rows || []).length > 0;
}

exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn('users', 'institution_key'))) {
    await knex.schema.alterTable('users', (t) => {
      t.string('institution_key', 190)
        .nullable()
        .after('affiliation_key')
        .comment('Institution accounts: normalised own name');
    });
  }

  if (!(await hasIndex(knex, 'users', INDEX_NAME))) {
    await knex.schema.alterTable('users', (t) => {
      t.index(['institution_key'], INDEX_NAME);
    });
  }

  // Both columns are rewritten: affiliation_key too, because institution rows
  // previously borrowed it for their identity.
  const rows = await knex('users').select('id', 'name', 'affiliation', 'account_type');
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    await knex('users')
      .where({ id: row.id })
      .update({
        affiliation_key: normalize(row.affiliation),
        institution_key: row.account_type === INSTITUTION ? normalize(row.name) : null,
      });
  }
};

exports.down = async function down(knex) {
  if (await hasIndex(knex, 'users', INDEX_NAME)) {
    await knex.schema.alterTable('users', (t) => t.dropIndex(['institution_key'], INDEX_NAME));
  }
  if (await knex.schema.hasColumn('users', 'institution_key')) {
    await knex.schema.alterTable('users', (t) => t.dropColumn('institution_key'));
  }
};
