/**
 * Forum (SCR-024..028, SCR-038) — CHIP-039..047.
 * Categories → topics → posts, with votes, accepted answers, tags,
 * subscriptions and pin/lock controls.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('forum_categories', (t) => {
    t.increments('id').primary();
    t.string('slug', 80).notNullable().unique();
    t.string('name', 120).notNullable();
    t.string('description', 500).nullable();
    t.string('icon', 64).nullable();
    t.string('color', 24).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_locked').notNullable().defaultTo(false).comment('Read-only category');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('topic_count').notNullable().defaultTo(0);
    t.integer('post_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('forum_topics', (t) => {
    t.increments('id').primary();
    t.uuid('uuid').notNullable().unique();
    t.string('slug', 220).notNullable().unique();
    t.integer('category_id').unsigned().notNullable()
      .references('id').inTable('forum_categories').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title', 250).notNullable();
    t.text('excerpt', 'text').nullable().comment('Denormalised first-post preview for lists');
    t.enu('type', ['question', 'discussion', 'announcement'], { useNative: false })
      .notNullable()
      .defaultTo('discussion');
    t.enu('status', ['open', 'solved', 'locked'], { useNative: false }).notNullable().defaultTo('open');
    t.boolean('is_pinned').notNullable().defaultTo(false);
    t.integer('view_count').notNullable().defaultTo(0);
    t.integer('reply_count').notNullable().defaultTo(0);
    t.integer('accepted_post_id').unsigned().nullable().comment('FK added after forum_posts exists');
    t.integer('last_post_id').unsigned().nullable();
    t.integer('last_post_user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('last_post_at').nullable();
    t.integer('design_id').unsigned().nullable().references('id').inTable('designs').onDelete('SET NULL')
      .comment('Optional: a thread attached to a design');
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();

    t.index(['category_id', 'is_pinned', 'last_post_at']);
    t.index(['user_id']);
    t.index(['status']);
    t.index(['deleted_at']);
  });

  await knex.schema.raw('ALTER TABLE `forum_topics` ADD FULLTEXT INDEX `forum_topics_ft` (`title`, `excerpt`)');

  await knex.schema.createTable('forum_posts', (t) => {
    t.increments('id').primary();
    t.integer('topic_id').unsigned().notNullable().references('id').inTable('forum_topics').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('parent_id').unsigned().nullable().references('id').inTable('forum_posts').onDelete('CASCADE')
      .comment('Set for quoted/threaded replies');
    t.text('body', 'mediumtext').notNullable();
    t.boolean('is_first_post').notNullable().defaultTo(false);
    t.boolean('is_accepted').notNullable().defaultTo(false);
    t.integer('vote_score').notNullable().defaultTo(0);
    t.integer('upvotes').notNullable().defaultTo(0);
    t.integer('downvotes').notNullable().defaultTo(0);
    t.enu('status', ['visible', 'hidden', 'removed'], { useNative: false }).notNullable().defaultTo('visible');
    t.integer('moderated_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('edited_at').nullable();
    t.integer('edited_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();

    t.index(['topic_id', 'status', 'created_at']);
    t.index(['user_id']);
  });

  await knex.schema.raw('ALTER TABLE `forum_posts` ADD FULLTEXT INDEX `forum_posts_ft` (`body`)');

  await knex.schema.alterTable('forum_topics', (t) => {
    t.foreign('accepted_post_id').references('id').inTable('forum_posts').onDelete('SET NULL');
    t.foreign('last_post_id').references('id').inTable('forum_posts').onDelete('SET NULL');
  });

  await knex.schema.createTable('forum_post_votes', (t) => {
    t.increments('id').primary();
    t.integer('post_id').unsigned().notNullable().references('id').inTable('forum_posts').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.tinyint('value').notNullable().comment('1 or -1');
    t.timestamps(true, true);
    t.unique(['post_id', 'user_id']);
  });

  await knex.schema.createTable('forum_topic_tags', (t) => {
    t.increments('id').primary();
    t.integer('topic_id').unsigned().notNullable().references('id').inTable('forum_topics').onDelete('CASCADE');
    t.integer('tag_id').unsigned().notNullable().references('id').inTable('tags').onDelete('CASCADE');
    t.unique(['topic_id', 'tag_id']);
  });

  await knex.schema.createTable('forum_subscriptions', (t) => {
    t.increments('id').primary();
    t.integer('topic_id').unsigned().notNullable().references('id').inTable('forum_topics').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['topic_id', 'user_id']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('forum_subscriptions');
  await knex.schema.dropTableIfExists('forum_topic_tags');
  await knex.schema.dropTableIfExists('forum_post_votes');
  await knex.schema.alterTable('forum_topics', (t) => {
    t.dropForeign('accepted_post_id');
    t.dropForeign('last_post_id');
  });
  await knex.schema.dropTableIfExists('forum_posts');
  await knex.schema.dropTableIfExists('forum_topics');
  await knex.schema.dropTableIfExists('forum_categories');
};
