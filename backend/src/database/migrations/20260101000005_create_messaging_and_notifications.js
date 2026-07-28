/**
 * Messaging (SCR-029, SCR-030 — CHIP-049) and Notifications (SCR-031 — CHIP-030).
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('conversations', (t) => {
    t.increments('id').primary();
    t.uuid('uuid').notNullable().unique();
    t.string('subject', 200).nullable();
    t.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.boolean('is_system').notNullable().defaultTo(false).comment('Platform/moderation conversations');
    t.integer('last_message_id').unsigned().nullable();
    t.timestamp('last_message_at').nullable();
    t.timestamps(true, true);
    t.index(['last_message_at']);
  });

  await knex.schema.createTable('conversation_participants', (t) => {
    t.increments('id').primary();
    t.integer('conversation_id').unsigned().notNullable()
      .references('id').inTable('conversations').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('unread_count').notNullable().defaultTo(0);
    t.timestamp('last_read_at').nullable();
    t.boolean('is_archived').notNullable().defaultTo(false);
    t.boolean('is_muted').notNullable().defaultTo(false);
    t.timestamp('left_at').nullable();
    t.timestamps(true, true);
    t.unique(['conversation_id', 'user_id']);
    t.index(['user_id', 'is_archived']);
  });

  await knex.schema.createTable('messages', (t) => {
    t.increments('id').primary();
    t.integer('conversation_id').unsigned().notNullable()
      .references('id').inTable('conversations').onDelete('CASCADE');
    t.integer('sender_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('body', 'mediumtext').notNullable();
    t.enu('status', ['visible', 'hidden', 'removed'], { useNative: false }).notNullable().defaultTo('visible');
    t.timestamp('edited_at').nullable();
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();
    t.index(['conversation_id', 'created_at']);
  });

  await knex.schema.alterTable('conversations', (t) => {
    t.foreign('last_message_id').references('id').inTable('messages').onDelete('SET NULL');
  });

  await knex.schema.createTable('message_attachments', (t) => {
    t.increments('id').primary();
    t.integer('message_id').unsigned().notNullable().references('id').inTable('messages').onDelete('CASCADE');
    t.string('original_name', 255).notNullable();
    t.string('stored_name', 255).notNullable();
    t.string('path', 500).notNullable();
    t.string('mime_type', 150).nullable();
    t.string('extension', 20).nullable();
    t.bigInteger('size_bytes').unsigned().notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['message_id']);
  });

  await knex.schema.createTable('notifications', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('actor_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('type', 64).notNullable();
    t.string('title', 200).notNullable();
    t.string('body', 500).nullable();
    t.string('link', 500).nullable().comment('Frontend route, e.g. /designs/d-alveolar-01');
    t.string('entity_type', 40).nullable();
    t.integer('entity_id').unsigned().nullable();
    t.json('data').nullable();
    t.timestamp('read_at').nullable();
    t.timestamp('emailed_at').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['user_id', 'read_at', 'created_at']);
    t.index(['type']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('message_attachments');
  await knex.schema.alterTable('conversations', (t) => {
    t.dropForeign('last_message_id');
  });
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('conversation_participants');
  await knex.schema.dropTableIfExists('conversations');
};
