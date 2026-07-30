/**
 * Links members to the institution account they belong to.
 *
 * `affiliation` is free text a member types ("The University of Twente."), so it
 * cannot be joined on directly. `affiliation_key` holds the normalised form and
 * is what an institution profile matches its members on. Kept as a plain indexed
 * column rather than a foreign key: members type an employer, they do not pick
 * one from a list, and the institution may well sign up after its researchers.
 *
 * Self-contained on purpose. A migration is a frozen record of one change, so it
 * must not import application modules — renaming an export months later would
 * break this file for every database still migrating up. The normaliser below is
 * therefore a copy of utils/helpers.normalizeAffiliation as it stood here.
 *
 * Also written to be re-runnable: MySQL auto-commits DDL, so a failure part-way
 * through leaves the column behind while Knex records nothing. Re-running must
 * pick up where it stopped instead of dying on "duplicate column".
 */
const INDEX_NAME = 'users_affiliation_key_idx';

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
  if (!(await knex.schema.hasColumn('users', 'affiliation_key'))) {
    await knex.schema.alterTable('users', (t) => {
      t.string('affiliation_key', 190)
        .nullable()
        .after('affiliation')
        .comment('Normalised affiliation for member lookups');
    });
  }

  if (!(await hasIndex(knex, 'users', INDEX_NAME))) {
    await knex.schema.alterTable('users', (t) => {
      t.index(['affiliation_key'], INDEX_NAME);
    });
  }

  // Backfill runs every time: it is the step most likely to have been cut short,
  // and rewriting a key to the same value costs nothing.
  // 20260730000005 recomputes these authoritatively once institution_key exists,
  // so this only needs the plain affiliation form.
  const rows = await knex('users').whereNotNull('affiliation').select('id', 'affiliation');
  for (const row of rows) {
    const key = normalize(row.affiliation);
    if (!key) continue;
    // eslint-disable-next-line no-await-in-loop
    await knex('users').where({ id: row.id }).update({ affiliation_key: key });
  }
};

exports.down = async function down(knex) {
  if (await hasIndex(knex, 'users', INDEX_NAME)) {
    await knex.schema.alterTable('users', (t) => t.dropIndex(['affiliation_key'], INDEX_NAME));
  }
  if (await knex.schema.hasColumn('users', 'affiliation_key')) {
    await knex.schema.alterTable('users', (t) => t.dropColumn('affiliation_key'));
  }
};
