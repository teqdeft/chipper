/**
 * Signups waiting on email confirmation.
 *
 * A registration is parked here instead of in `users`, so an address that was
 * never confirmed leaves no account behind: nothing to sign in as, nothing in
 * the member directory, and no half-real row for the rest of the app to reason
 * about. The user row is created only when the code is entered.
 *
 * Only hashes of the link token and the OTP are stored, and `attempts` caps
 * brute-forcing of the numeric code — same rules as `user_tokens`.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('pending_registrations', (t) => {
    t.increments('id').primary();
    t.string('email', 190).notNullable().unique();
    t.string('name', 120).notNullable();
    t.string('handle', 40).notNullable().comment('Reserved, but re-checked on confirmation');
    t.string('password_hash', 255).notNullable();
    t.string('affiliation', 190).nullable();
    t.string('account_type', 32).nullable().comment('student | researcher | institution');
    t.string('country', 80).nullable();
    t.boolean('newsletter').notNullable().defaultTo(false);
    t.string('token_hash', 64).notNullable().index();
    t.string('otp_hash', 64).nullable();
    t.integer('attempts').notNullable().defaultTo(0);
    // datetime, not timestamp: holds a future point in time, so it must escape
    // MySQL's legacy auto-update rule and the 2038 range limit.
    t.datetime('expires_at').notNullable();
    t.string('ip_address', 45).nullable();
    t.timestamps(true, true);

    t.index(['expires_at']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('pending_registrations');
};
