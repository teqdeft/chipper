/**
 * Controlled vocabularies (ISO 22916-aligned).
 *
 * `component_type_fields` is the important one: it declares which extra metadata
 * fields each component type requires (accuracy + unit for sensors, model type
 * and tested organs for organ chips, flow-rate range for pumps, volume and
 * compartments for reservoirs …). The design service reads it to validate the
 * JSON stored in design_versions.type_specific, so new component types can be
 * added by inserting rows — no code change, no migration.
 *
 * Delivers CHIP-008..015, CHIP-012, CHIP-019..022.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('component_types', (t) => {
    t.increments('id').primary();
    t.string('slug', 64).notNullable().unique();
    t.string('name', 100).notNullable();
    t.string('description', 255).nullable();
    t.string('icon', 64).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('resource_types', (t) => {
    t.increments('id').primary();
    t.string('slug', 64).notNullable().unique();
    t.string('name', 100).notNullable().comment('SOP, Product, 3D model');
    t.string('description', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('organs', (t) => {
    t.increments('id').primary();
    t.string('slug', 64).notNullable().unique();
    t.string('name', 80).notNullable();
    t.string('note', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('materials', (t) => {
    t.increments('id').primary();
    t.string('slug', 64).notNullable().unique();
    t.string('name', 80).notNullable();
    t.string('note', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('fabrication_methods', (t) => {
    t.increments('id').primary();
    t.string('slug', 64).notNullable().unique();
    t.string('name', 80).notNullable();
    t.string('note', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('model_types', (t) => {
    t.increments('id').primary();
    t.string('slug', 64).notNullable().unique();
    t.string('name', 80).notNullable().comment('monolayer / organoid / spheroid / organ-on-chip / ALI');
    t.string('note', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // Working principles depend on the component type (per the metadata spec).
  await knex.schema.createTable('working_principles', (t) => {
    t.increments('id').primary();
    t.integer('component_type_id').unsigned().nullable()
      .references('id').inTable('component_types').onDelete('CASCADE');
    t.string('slug', 64).notNullable();
    t.string('name', 100).notNullable();
    t.string('note', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.unique(['component_type_id', 'slug']);
  });

  await knex.schema.createTable('licenses', (t) => {
    t.increments('id').primary();
    t.string('code', 40).notNullable().unique().comment('CC BY 4.0, MIT, GPL-3.0, none, custom');
    t.string('name', 150).notNullable();
    t.string('family', 32).nullable().comment('cc | mit | gpl | none | custom');
    t.string('url', 255).nullable();
    t.text('summary').nullable();
    t.text('full_text').nullable();
    t.boolean('requires_attribution').notNullable().defaultTo(true);
    t.boolean('allows_commercial').notNullable().defaultTo(true);
    t.boolean('share_alike').notNullable().defaultTo(false);
    t.boolean('is_custom').notNullable().defaultTo(false);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('tags', (t) => {
    t.increments('id').primary();
    t.string('slug', 80).notNullable().unique();
    t.string('name', 80).notNullable();
    t.integer('usage_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index(['usage_count']);
  });

  /**
   * Declarative schema for component-type-dependent metadata.
   * data_type drives both validation and the field widget the frontend renders.
   */
  await knex.schema.createTable('component_type_fields', (t) => {
    t.increments('id').primary();
    t.integer('component_type_id').unsigned().notNullable()
      .references('id').inTable('component_types').onDelete('CASCADE');
    t.string('field_key', 64).notNullable();
    t.string('label', 120).notNullable();
    t.string('hint', 255).nullable();
    t.enu('data_type', ['string', 'text', 'number', 'range', 'boolean', 'select', 'multiselect', 'reference'], {
      useNative: false,
    })
      .notNullable()
      .defaultTo('string');
    t.string('unit', 32).nullable().comment('Default unit, e.g. µL/min, kPa, °C');
    t.json('options').nullable().comment('Select options, or {table,valueKey} for reference fields');
    t.decimal('min_value', 18, 6).nullable();
    t.decimal('max_value', 18, 6).nullable();
    t.boolean('is_required').notNullable().defaultTo(false);
    t.boolean('is_filterable').notNullable().defaultTo(false);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.unique(['component_type_id', 'field_key']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('component_type_fields');
  await knex.schema.dropTableIfExists('tags');
  await knex.schema.dropTableIfExists('licenses');
  await knex.schema.dropTableIfExists('working_principles');
  await knex.schema.dropTableIfExists('model_types');
  await knex.schema.dropTableIfExists('fabrication_methods');
  await knex.schema.dropTableIfExists('materials');
  await knex.schema.dropTableIfExists('organs');
  await knex.schema.dropTableIfExists('resource_types');
  await knex.schema.dropTableIfExists('component_types');
};
