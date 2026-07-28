/**
 * CMS (SCR-004..008, SCR-037 — CHIP-033..035), moderation (SCR-035, SCR-036 —
 * CHIP-031, CHIP-037, CHIP-052), audit trail and site settings.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('news_posts', (t) => {
    t.increments('id').primary();
    t.string('slug', 200).notNullable().unique();
    t.string('title', 250).notNullable();
    t.string('excerpt', 500).nullable();
    t.text('body', 'mediumtext').nullable();
    t.string('category', 64).nullable().comment('Announcement | Guide | Event');
    t.string('cover_image_path', 500).nullable();
    t.integer('author_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.enu('status', ['draft', 'published', 'archived'], { useNative: false }).notNullable().defaultTo('draft');
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.integer('view_count').notNullable().defaultTo(0);
    t.timestamp('published_at').nullable();
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();
    t.index(['status', 'published_at']);
  });

  await knex.schema.raw('ALTER TABLE `news_posts` ADD FULLTEXT INDEX `news_ft` (`title`, `excerpt`, `body`)');

  // Static pages: about, how-it-works, privacy, terms, licenses-explained.
  await knex.schema.createTable('pages', (t) => {
    t.increments('id').primary();
    t.string('slug', 120).notNullable().unique();
    t.string('title', 250).notNullable();
    t.text('body', 'mediumtext').nullable();
    t.json('sections').nullable().comment('Structured blocks for richer marketing pages');
    t.string('meta_title', 250).nullable();
    t.string('meta_description', 500).nullable();
    t.enu('status', ['draft', 'published', 'archived'], { useNative: false })
      .notNullable()
      .defaultTo('published');
    t.boolean('is_system').notNullable().defaultTo(false).comment('Cannot be deleted from the CMS');
    t.integer('updated_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('site_settings', (t) => {
    t.increments('id').primary();
    t.string('key', 120).notNullable().unique();
    t.json('value').nullable();
    t.string('group', 64).nullable();
    t.string('description', 255).nullable();
    t.boolean('is_public').notNullable().defaultTo(false).comment('Exposed on the public config endpoint');
    t.integer('updated_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('reports', (t) => {
    t.increments('id').primary();
    t.integer('reporter_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('entity_type', 40).notNullable().comment('design | design_comment | forum_topic | forum_post | message | user');
    t.integer('entity_id').unsigned().notNullable();
    t.string('reason', 64).notNullable().comment('spam | abuse | licence | off-topic | other');
    t.text('details').nullable();
    t.enu('status', ['open', 'reviewing', 'resolved', 'dismissed'], { useNative: false })
      .notNullable()
      .defaultTo('open');
    t.integer('handled_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('handled_at').nullable();
    t.string('resolution', 64).nullable().comment('hidden | removed | warned | suspended | no-action');
    t.text('resolution_note').nullable();
    t.timestamps(true, true);

    t.index(['status', 'created_at']);
    t.index(['entity_type', 'entity_id']);
  });

  await knex.schema.createTable('moderation_actions', (t) => {
    t.increments('id').primary();
    t.integer('moderator_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('report_id').unsigned().nullable().references('id').inTable('reports').onDelete('SET NULL');
    t.string('entity_type', 40).notNullable();
    t.integer('entity_id').unsigned().notNullable();
    t.string('action', 64).notNullable().comment('approve | reject | hide | remove | restore | lock | pin | suspend | ban');
    t.text('note').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['entity_type', 'entity_id']);
    t.index(['moderator_id', 'created_at']);
  });

  // Append-only trail for privileged actions.
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 100).notNullable();
    t.string('entity_type', 40).nullable();
    t.integer('entity_id').unsigned().nullable();
    t.json('changes').nullable().comment('{ before, after }');
    t.string('ip_address', 45).nullable();
    t.string('user_agent', 255).nullable();
    t.string('request_id', 64).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at']);
    t.index(['entity_type', 'entity_id']);
    t.index(['action']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('moderation_actions');
  await knex.schema.dropTableIfExists('reports');
  await knex.schema.dropTableIfExists('site_settings');
  await knex.schema.dropTableIfExists('pages');
  await knex.schema.dropTableIfExists('news_posts');
};
