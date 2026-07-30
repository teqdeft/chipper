/**
 * "Other" was dropped from the signup options — every account now declares
 * itself a student, a researcher or an institution. Existing rows are folded
 * into `institution`, the closest match for the staff and company accounts that
 * carried "other".
 */
exports.up = async function up(knex) {
  await knex('users').where({ account_type: 'other' }).update({ account_type: 'institution' });
};

exports.down = async function down() {
  // Irreversible: the original value is not recoverable once folded in.
};
