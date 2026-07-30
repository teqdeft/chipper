/**
 * Account types were renamed to the signup vocabulary the product actually uses:
 * academic → researcher, industry → institution (student/other unchanged).
 */
exports.up = async function up(knex) {
  await knex('users').where({ account_type: 'academic' }).update({ account_type: 'researcher' });
  await knex('users').where({ account_type: 'industry' }).update({ account_type: 'institution' });
};

exports.down = async function down(knex) {
  await knex('users').where({ account_type: 'researcher' }).update({ account_type: 'academic' });
  await knex('users').where({ account_type: 'institution' }).update({ account_type: 'industry' });
};
