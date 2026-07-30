/**
 * Identity: roles, users, sessions, one-time tokens, badges, expertise, settings.
 * Delivers CHIP-001..004, CHIP-036, CHIP-051, CHIP-052.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary();
    t.string('name', 32).notNullable().unique();
    t.string('label', 64).notNullable();
    t.integer('level').notNullable().defaultTo(0).comment('Privilege ordering; higher wins');
    t.text('description').nullable();
    t.json('permissions').nullable().comment('Optional per-role overrides on top of config/permissions.js');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.uuid('uuid').notNullable().unique();
    t.string('name', 120).notNullable();
    t.string('handle', 40).notNullable().unique().comment('Public @handle used in /u/:handle');
    t.string('email', 190).notNullable().unique();
    t.string('password_hash', 255).nullable();
    t.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('RESTRICT');
    t.string('affiliation', 190).nullable().comment('Institute / company');
    t.string('account_type', 32).nullable().comment('student | researcher | institution | other');
    t.string('country', 80).nullable();
    t.string('website', 255).nullable();
    t.string('orcid', 32).nullable();
    t.text('bio').nullable();
    t.string('avatar_path', 500).nullable();
    t.enu('status', ['pending', 'active', 'suspended', 'banned'], {
      useNative: false,
      enumName: 'user_status',
    })
      .notNullable()
      .defaultTo('pending');
    t.timestamp('email_verified_at').nullable();
    t.integer('reputation').notNullable().defaultTo(0);
    t.integer('upload_count').notNullable().defaultTo(0);
    t.integer('download_count').notNullable().defaultTo(0);
    t.timestamp('last_login_at').nullable();
    t.string('last_login_ip', 45).nullable();
    t.integer('failed_login_attempts').notNullable().defaultTo(0);
    // datetime, not timestamp: these hold future points in time and must not be
    // subject to MySQL's legacy auto-update rule or the 2038 range limit.
    t.datetime('locked_until').nullable();
    t.string('suspension_reason', 255).nullable();
    t.datetime('suspended_until').nullable();
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();

    t.index(['status']);
    t.index(['role_id']);
    t.index(['deleted_at']);
    t.index(['created_at']);
  });

  await knex.schema.raw('ALTER TABLE `users` ADD FULLTEXT INDEX `users_search_ft` (`name`, `handle`, `affiliation`)');

  await knex.schema.createTable('user_settings', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.boolean('email_notifications').notNullable().defaultTo(true);
    t.boolean('notify_design_comments').notNullable().defaultTo(true);
    t.boolean('notify_forum_replies').notNullable().defaultTo(true);
    t.boolean('notify_mentions').notNullable().defaultTo(true);
    t.boolean('notify_messages').notNullable().defaultTo(true);
    t.boolean('notify_newsletter').notNullable().defaultTo(false);
    t.boolean('profile_public').notNullable().defaultTo(true);
    t.boolean('show_email').notNullable().defaultTo(false);
    t.string('locale', 10).notNullable().defaultTo('en');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('user_expertise', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('term', 80).notNullable();
    t.unique(['user_id', 'term']);
  });

  await knex.schema.createTable('badges', (t) => {
    t.increments('id').primary();
    t.string('slug', 64).notNullable().unique();
    t.string('name', 100).notNullable();
    t.string('description', 255).nullable();
    t.string('icon', 64).nullable();
    t.string('tone', 24).notNullable().defaultTo('green').comment('UI StatusBadge tone');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('user_badges', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('badge_id').unsigned().notNullable().references('id').inTable('badges').onDelete('CASCADE');
    t.integer('awarded_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('awarded_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['user_id', 'badge_id']);
  });

  // Refresh sessions: only the SHA-256 hash is stored, so the table is useless if leaked.
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.increments('id').primary();
    t.uuid('session_id').notNullable().unique();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash', 64).notNullable().index();
    t.string('user_agent', 255).nullable();
    t.string('ip_address', 45).nullable();
    // MySQL silently adds DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    // to the first NOT NULL TIMESTAMP column of a table, which would reset the
    // expiry on every revoke. datetime has no such behaviour.
    t.datetime('expires_at').notNullable();
    t.timestamp('revoked_at').nullable();
    t.string('revoked_reason', 64).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'revoked_at']);
    t.index(['expires_at']);
  });

  await knex.schema.createTable('user_tokens', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('type', ['email_verification', 'password_reset'], { useNative: false }).notNullable();
    t.string('token_hash', 64).notNullable().index();
    t.datetime('expires_at').notNullable();
    t.timestamp('used_at').nullable();
    t.string('ip_address', 45).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'type']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('user_tokens');
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('user_badges');
  await knex.schema.dropTableIfExists('badges');
  await knex.schema.dropTableIfExists('user_expertise');
  await knex.schema.dropTableIfExists('user_settings');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('roles');
};
