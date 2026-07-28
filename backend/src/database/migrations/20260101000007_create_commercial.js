/**
 * Commercial module (SCR-039 — CHIP-007, CHIP-027, CHIP-028).
 *
 * Marked "Open / Later" in the screen inventory: the schema ships now so the
 * data model is stable, and the routes stay behind FEATURE_COMMERCIAL until the
 * client answers Q2. Nothing else in the API depends on these tables.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('seller_profiles', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.string('company_name', 190).notNullable();
    t.string('slug', 190).notNullable().unique();
    t.text('description').nullable();
    t.string('logo_path', 500).nullable();
    t.string('website', 255).nullable();
    t.string('contact_email', 190).nullable();
    t.string('contact_phone', 40).nullable();
    t.string('vat_number', 60).nullable();
    t.boolean('is_verified').notNullable().defaultTo(false);
    t.enu('status', ['pending', 'active', 'suspended'], { useNative: false }).notNullable().defaultTo('pending');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('listings', (t) => {
    t.increments('id').primary();
    t.uuid('uuid').notNullable().unique();
    t.integer('seller_id').unsigned().notNullable()
      .references('id').inTable('seller_profiles').onDelete('CASCADE');
    t.integer('design_id').unsigned().nullable().references('id').inTable('designs').onDelete('SET NULL');
    t.string('title', 200).notNullable();
    t.text('description').nullable();
    t.decimal('price', 12, 2).nullable();
    t.string('currency', 3).notNullable().defaultTo('EUR');
    t.enu('cta_type', ['buy', 'contact', 'quote'], { useNative: false }).notNullable().defaultTo('contact');
    t.string('cta_url', 500).nullable();
    t.string('lead_time', 80).nullable();
    t.enu('status', ['draft', 'active', 'paused', 'archived'], { useNative: false })
      .notNullable()
      .defaultTo('draft');
    t.integer('view_count').notNullable().defaultTo(0);
    t.integer('click_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index(['seller_id', 'status']);
    t.index(['design_id']);
  });

  await knex.schema.createTable('listing_events', (t) => {
    t.increments('id').primary();
    t.integer('listing_id').unsigned().notNullable().references('id').inTable('listings').onDelete('CASCADE');
    t.enu('type', ['view', 'click', 'contact'], { useNative: false }).notNullable();
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('ip_hash', 64).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['listing_id', 'type', 'created_at']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('listing_events');
  await knex.schema.dropTableIfExists('listings');
  await knex.schema.dropTableIfExists('seller_profiles');
};
