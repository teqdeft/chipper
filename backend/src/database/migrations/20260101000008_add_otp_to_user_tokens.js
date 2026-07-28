/**
 * Email OTP support for registration verification and password reset.
 *
 * A request issues both a magic link (token_hash) and a numeric code (otp_hash)
 * on the same row, so the user can click the link or type the code — whichever
 * their mail client makes easier.
 *
 * Only hashes are stored. `attempts` caps brute-forcing: a 6-digit code is one
 * of a million, which is cheap to guess without a per-token limit.
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('user_tokens', (t) => {
    t.string('otp_hash', 64).nullable().after('token_hash');
    t.integer('attempts').notNullable().defaultTo(0).after('otp_hash');
    t.index(['user_id', 'type', 'otp_hash'], 'user_tokens_otp_lookup');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('user_tokens', (t) => {
    t.dropIndex(['user_id', 'type', 'otp_hash'], 'user_tokens_otp_lookup');
    t.dropColumn('attempts');
    t.dropColumn('otp_hash');
  });
};
