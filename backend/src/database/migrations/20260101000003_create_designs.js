/**
 * Design library — the core domain (SCR-017..023).
 *
 * Version tracking, as required by the metadata spec ("all data needs to be
 * version-tracked"):
 *   designs          — stable identity, ownership, counters, current pointer
 *   design_versions  — a full metadata snapshot per version (v1.0, v1.1, v2.0…)
 *   *_files / *_organs / *_credits / *_works / *_documents — hang off a VERSION
 *
 * Publishing v3 therefore leaves v1 downloadable with its own numbers intact.
 * Universal fields live in columns; component-type-dependent fields live in
 * design_versions.type_specific (JSON), validated against component_type_fields.
 *
 * Delivers CHIP-008..017, CHIP-019..029.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('designs', (t) => {
    t.increments('id').primary();
    t.uuid('uuid').notNullable().unique().comment('Public, non-enumerable id');
    t.string('slug', 200).notNullable().unique();
    t.integer('owner_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('component_type_id').unsigned().nullable()
      .references('id').inTable('component_types').onDelete('SET NULL');
    t.integer('resource_type_id').unsigned().nullable()
      .references('id').inTable('resource_types').onDelete('SET NULL');

    t.string('title', 200).notNullable();
    t.string('summary', 500).nullable().comment('One or two sentences for browse cards');

    t.enu('status', ['draft', 'pending', 'published', 'rejected', 'archived'], { useNative: false })
      .notNullable()
      .defaultTo('draft');

    // "Publish as": person, institute, or person from institute.
    t.enu('publish_as', ['person', 'institute', 'person_from_institute'], { useNative: false })
      .notNullable()
      .defaultTo('person');
    t.string('institute_name', 190).nullable();

    t.integer('current_version_id').unsigned().nullable().comment('FK added after design_versions exists');
    t.boolean('is_iso22916').notNullable().defaultTo(false);
    t.boolean('is_featured').notNullable().defaultTo(false);

    // Denormalised counters — browse/sort must not aggregate on every request.
    t.integer('view_count').notNullable().defaultTo(0);
    t.integer('download_count').notNullable().defaultTo(0);
    t.integer('star_count').notNullable().defaultTo(0);
    t.integer('comment_count').notNullable().defaultTo(0);
    t.integer('ownership_count').notNullable().defaultTo(0).comment('"I have one" acknowledgements');
    t.decimal('average_rating', 3, 2).notNullable().defaultTo(0);
    t.integer('rating_count').notNullable().defaultTo(0);

    t.timestamp('published_at').nullable();
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();

    t.index(['status', 'published_at']);
    t.index(['owner_id', 'status']);
    t.index(['component_type_id']);
    t.index(['is_featured', 'status']);
    t.index(['deleted_at']);
    t.index(['download_count']);
    t.index(['star_count']);
  });

  await knex.schema.raw(
    'ALTER TABLE `designs` ADD FULLTEXT INDEX `designs_search_ft` (`title`, `summary`)',
  );

  await knex.schema.createTable('design_versions', (t) => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable().references('id').inTable('designs').onDelete('CASCADE');
    t.string('version', 20).notNullable().comment('v1.0, v1.1, v2.0');
    t.integer('version_number').notNullable().defaultTo(1).comment('Monotonic ordering key');
    t.string('version_note', 500).nullable().comment('What changed in this version');
    t.enu('status', ['draft', 'pending', 'published', 'rejected', 'archived'], { useNative: false })
      .notNullable()
      .defaultTo('draft');

    // ── Universal metadata (version-tracked snapshot) ─────────────────────
    t.string('title', 200).nullable();
    t.string('summary', 500).nullable();
    t.text('description', 'mediumtext').nullable();
    t.integer('component_type_id').unsigned().nullable()
      .references('id').inTable('component_types').onDelete('SET NULL');
    t.integer('resource_type_id').unsigned().nullable()
      .references('id').inTable('resource_types').onDelete('SET NULL');
    t.integer('license_id').unsigned().nullable()
      .references('id').inTable('licenses').onDelete('SET NULL');
    t.text('custom_license_text').nullable();
    t.text('how_to_cite').nullable();
    t.text('credits_note').nullable().comment('Who should we thank for the existence of this chip?');

    // Tested material / fabrication method
    t.integer('tested_material_id').unsigned().nullable()
      .references('id').inTable('materials').onDelete('SET NULL');
    t.integer('tested_fabrication_method_id').unsigned().nullable()
      .references('id').inTable('fabrication_methods').onDelete('SET NULL');

    // ── "How to use this chip" (ISO 22916) ────────────────────────────────
    t.string('clip_string', 255).nullable();
    t.decimal('max_height_mm', 10, 3).nullable();
    t.decimal('clamping_zone_height_mm', 10, 3).nullable();
    t.text('exclusion_zones').nullable();
    t.text('clamping_strategy').nullable();

    t.decimal('operating_temp_min', 10, 3).nullable();
    t.decimal('operating_temp_max', 10, 3).nullable();
    t.string('operating_temp_unit', 16).nullable().defaultTo('°C');
    t.decimal('operating_pressure_min', 12, 4).nullable();
    t.decimal('operating_pressure_max', 12, 4).nullable();
    t.string('operating_pressure_unit', 16).nullable().defaultTo('kPa');
    t.decimal('operating_flow_min', 12, 4).nullable();
    t.decimal('operating_flow_max', 12, 4).nullable();
    t.string('operating_flow_unit', 16).nullable().defaultTo('µL/min');

    t.boolean('is_iso22916').notNullable().defaultTo(false);
    t.text('iso22916_note').nullable();

    /**
     * Component-type-dependent metadata, validated against component_type_fields:
     *  flow/pressure sensor -> { accuracy, accuracy_unit, stability, stability_unit,
     *                            working_principle, lod, lod_unit }
     *  organ chip           -> { model_type }  (tested organs are relational)
     *  pump                 -> { flow_rate_min, flow_rate_max, flow_rate_unit,
     *                            stability, working_principle }
     *  reservoir            -> { volume, volume_unit, compartments }
     */
    t.json('type_specific').nullable();

    t.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('download_count').notNullable().defaultTo(0);
    t.timestamp('published_at').nullable();
    t.timestamps(true, true);

    t.unique(['design_id', 'version']);
    t.index(['design_id', 'version_number']);
    t.index(['status']);
    t.index(['license_id']);
    t.index(['tested_material_id']);
  });

  await knex.schema.alterTable('designs', (t) => {
    t.foreign('current_version_id').references('id').inTable('design_versions').onDelete('SET NULL');
  });

  await knex.schema.createTable('design_files', (t) => {
    t.increments('id').primary();
    t.uuid('uuid').notNullable().unique();
    t.integer('design_id').unsigned().notNullable().references('id').inTable('designs').onDelete('CASCADE');
    t.integer('design_version_id').unsigned().notNullable()
      .references('id').inTable('design_versions').onDelete('CASCADE');
    t.string('original_name', 255).notNullable().comment('Client-supplied name — display only, never a path');
    t.string('stored_name', 255).notNullable();
    t.string('path', 500).notNullable().comment('Relative to UPLOAD_DIR');
    t.string('mime_type', 150).nullable();
    t.string('extension', 20).nullable();
    t.bigInteger('size_bytes').unsigned().notNullable().defaultTo(0);
    t.enu('kind', ['model', 'document', 'image', 'archive', 'data', 'other'], { useNative: false })
      .notNullable()
      .defaultTo('other');
    t.string('checksum', 128).nullable();
    t.boolean('is_primary').notNullable().defaultTo(false).comment('Main geometry file for the 3D viewer');
    t.boolean('is_cover').notNullable().defaultTo(false).comment('Gallery cover image');
    t.integer('download_count').notNullable().defaultTo(0);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.integer('uploaded_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);

    t.index(['design_version_id', 'kind']);
    t.index(['design_id']);
  });

  // Tested organs — organ chips can declare several (gut, lung, skin…).
  await knex.schema.createTable('design_version_organs', (t) => {
    t.increments('id').primary();
    t.integer('design_version_id').unsigned().notNullable()
      .references('id').inTable('design_versions').onDelete('CASCADE');
    t.integer('organ_id').unsigned().notNullable().references('id').inTable('organs').onDelete('CASCADE');
    t.unique(['design_version_id', 'organ_id']);
  });

  await knex.schema.createTable('design_tags', (t) => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable().references('id').inTable('designs').onDelete('CASCADE');
    t.integer('tag_id').unsigned().notNullable().references('id').inTable('tags').onDelete('CASCADE');
    t.unique(['design_id', 'tag_id']);
  });

  // Credits: who should we thank for the existence of this chip?
  await knex.schema.createTable('design_credits', (t) => {
    t.increments('id').primary();
    t.integer('design_version_id').unsigned().notNullable()
      .references('id').inTable('design_versions').onDelete('CASCADE');
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('name', 190).notNullable();
    t.string('affiliation', 190).nullable();
    t.string('role', 120).nullable().comment('Designer, fabricator, funder…');
    t.string('url', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.index(['design_version_id']);
  });

  // Published work — where this design is cited.
  await knex.schema.createTable('design_published_works', (t) => {
    t.increments('id').primary();
    t.integer('design_version_id').unsigned().notNullable()
      .references('id').inTable('design_versions').onDelete('CASCADE');
    t.string('title', 300).notNullable();
    t.string('authors', 500).nullable();
    t.string('publication', 255).nullable();
    t.integer('year').nullable();
    t.string('doi', 120).nullable();
    t.string('url', 500).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.index(['design_version_id']);
  });

  // Related documents — SOPs, CNC programs; either an uploaded file or a link.
  await knex.schema.createTable('design_related_documents', (t) => {
    t.increments('id').primary();
    t.integer('design_version_id').unsigned().notNullable()
      .references('id').inTable('design_versions').onDelete('CASCADE');
    t.integer('file_id').unsigned().nullable().references('id').inTable('design_files').onDelete('SET NULL');
    t.integer('related_design_id').unsigned().nullable()
      .references('id').inTable('designs').onDelete('SET NULL');
    t.string('title', 255).notNullable();
    t.string('document_type', 64).nullable().comment('SOP | CNC program | datasheet | other');
    t.string('url', 500).nullable();
    t.string('description', 500).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.index(['design_version_id']);
  });

  await knex.schema.createTable('design_comments', (t) => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable().references('id').inTable('designs').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('parent_id').unsigned().nullable().references('id').inTable('design_comments').onDelete('CASCADE');
    t.text('body').notNullable();
    t.enu('status', ['visible', 'hidden', 'removed'], { useNative: false }).notNullable().defaultTo('visible');
    t.integer('moderated_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('moderation_note', 255).nullable();
    t.timestamp('edited_at').nullable();
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();
    t.index(['design_id', 'status', 'created_at']);
    t.index(['user_id']);
  });

  await knex.schema.createTable('design_stars', (t) => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable().references('id').inTable('designs').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['design_id', 'user_id']);
  });

  // "I have one" acknowledgements + rating (from the metadata spec).
  await knex.schema.createTable('design_ownerships', (t) => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable().references('id').inTable('designs').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.tinyint('rating').unsigned().nullable().comment('1-5, optional');
    t.string('note', 500).nullable();
    t.timestamps(true, true);
    t.unique(['design_id', 'user_id']);
    t.index(['design_id', 'rating']);
  });

  // Download gate: every download identifies a user (security-critical, CHIP-025).
  await knex.schema.createTable('design_downloads', (t) => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable().references('id').inTable('designs').onDelete('CASCADE');
    t.integer('design_version_id').unsigned().nullable()
      .references('id').inTable('design_versions').onDelete('SET NULL');
    t.integer('file_id').unsigned().nullable().references('id').inTable('design_files').onDelete('SET NULL');
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('ip_address', 45).nullable();
    t.string('user_agent', 255).nullable();
    t.string('purpose', 255).nullable().comment('Optional "what will you use it for"');
    t.boolean('license_accepted').notNullable().defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['design_id', 'created_at']);
    t.index(['user_id', 'created_at']);
  });

  await knex.schema.createTable('design_views', (t) => {
    t.increments('id').primary();
    t.integer('design_id').unsigned().notNullable().references('id').inTable('designs').onDelete('CASCADE');
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('ip_hash', 64).nullable().comment('Hashed — dedupes views without storing raw IPs');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['design_id', 'created_at']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('design_views');
  await knex.schema.dropTableIfExists('design_downloads');
  await knex.schema.dropTableIfExists('design_ownerships');
  await knex.schema.dropTableIfExists('design_stars');
  await knex.schema.dropTableIfExists('design_comments');
  await knex.schema.dropTableIfExists('design_related_documents');
  await knex.schema.dropTableIfExists('design_published_works');
  await knex.schema.dropTableIfExists('design_credits');
  await knex.schema.dropTableIfExists('design_tags');
  await knex.schema.dropTableIfExists('design_version_organs');

  // Break the circular FK before dropping the tables it joins.
  await knex.schema.alterTable('designs', (t) => {
    t.dropForeign('current_version_id');
  });
  await knex.schema.dropTableIfExists('design_files');
  await knex.schema.dropTableIfExists('design_versions');
  await knex.schema.dropTableIfExists('designs');
};
