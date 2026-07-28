/**
 * Controlled vocabularies + the dynamic, component-type-dependent metadata schema.
 *
 * Two jobs:
 *  1. Serve the option lists the upload wizard and browse filters need
 *     (SCR-017, SCR-021 · CHIP-008..015, CHIP-019..022).
 *  2. Validate design_versions.type_specific against component_type_fields, so a
 *     flow sensor must declare accuracy/stability/working principle while an
 *     organ chip must declare a model type — without hard-coding either.
 *
 * The lists are small and change rarely, so they are cached in-process with a
 * short TTL and an explicit bust when an admin edits them.
 */
const { db } = require('../../database/connection');
const ApiError = require('../../utils/ApiError');
const { parseJson, slugify } = require('../../utils/helpers');

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

async function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await loader();
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

const listActive = (table, columns = ['id', 'slug', 'name', 'note', 'sort_order']) =>
  db(table).where('is_active', true).orderBy('sort_order').orderBy('name').select(columns);

const taxonomyService = {
  bustCache(key) {
    if (key) cache.delete(key);
    else cache.clear();
  },

  componentTypes: () =>
    cached('component_types', () =>
      listActive('component_types', ['id', 'slug', 'name', 'description', 'icon', 'sort_order']),
    ),

  resourceTypes: () =>
    cached('resource_types', () => listActive('resource_types', ['id', 'slug', 'name', 'description', 'sort_order'])),

  organs: () => cached('organs', () => listActive('organs')),
  materials: () => cached('materials', () => listActive('materials')),
  fabricationMethods: () => cached('fabrication_methods', () => listActive('fabrication_methods')),
  modelTypes: () => cached('model_types', () => listActive('model_types')),

  licenses: () =>
    cached('licenses', () =>
      db('licenses')
        .where('is_active', true)
        .orderBy('sort_order')
        .select(
          'id', 'code', 'name', 'family', 'url', 'summary',
          'requires_attribution', 'allows_commercial', 'share_alike', 'is_custom',
        ),
    ),

  /** Working principles, optionally narrowed to one component type. */
  async workingPrinciples(componentTypeId) {
    const all = await cached('working_principles', () =>
      db('working_principles')
        .leftJoin('component_types', 'working_principles.component_type_id', 'component_types.id')
        .where('working_principles.is_active', true)
        .orderBy('working_principles.sort_order')
        .select(
          'working_principles.id',
          'working_principles.slug',
          'working_principles.name',
          'working_principles.component_type_id',
          'component_types.slug as component_type_slug',
        ),
    );
    if (!componentTypeId) return all;
    return all.filter((p) => !p.component_type_id || Number(p.component_type_id) === Number(componentTypeId));
  },

  /** Popular keywords for the browse sidebar and tag inputs. */
  popularTags: (limit = 40) =>
    db('tags').orderBy('usage_count', 'desc').limit(limit).select('id', 'slug', 'name', 'usage_count'),

  /** Field definitions for a component type — drives the wizard's "Type fields" step. */
  async fieldsForComponentType(componentTypeId) {
    if (!componentTypeId) return [];
    const rows = await cached(`ctf:${componentTypeId}`, () =>
      db('component_type_fields')
        .where({ component_type_id: componentTypeId, is_active: true })
        .orderBy('sort_order')
        .select('*'),
    );
    return rows.map((row) => ({ ...row, options: parseJson(row.options, null) }));
  },

  /** Everything the upload wizard and browse filters need, in one round trip. */
  async all() {
    const [
      componentTypes, resourceTypes, organs, materials,
      fabricationMethods, modelTypes, licenses, workingPrinciples, tags,
    ] = await Promise.all([
      this.componentTypes(), this.resourceTypes(), this.organs(), this.materials(),
      this.fabricationMethods(), this.modelTypes(), this.licenses(), this.workingPrinciples(), this.popularTags(),
    ]);

    // Attach the dependent field schema so the client can render type-specific
    // steps without a second request per component type.
    const withFields = await Promise.all(
      componentTypes.map(async (type) => ({
        ...type,
        fields: (await this.fieldsForComponentType(type.id)).map((f) => ({
          key: f.field_key,
          label: f.label,
          hint: f.hint,
          dataType: f.data_type,
          unit: f.unit,
          options: f.options,
          min: f.min_value,
          max: f.max_value,
          required: Boolean(f.is_required),
          filterable: Boolean(f.is_filterable),
        })),
        workingPrinciples: workingPrinciples.filter(
          (p) => Number(p.component_type_id) === Number(type.id),
        ),
      })),
    );

    return {
      componentTypes: withFields,
      resourceTypes,
      organs,
      materials,
      fabricationMethods,
      modelTypes,
      licenses,
      tags,
      publishAs: [
        { value: 'person', label: 'Person' },
        { value: 'institute', label: 'Institute' },
        { value: 'person_from_institute', label: 'Person from institute' },
      ],
    };
  },

  /**
   * Validates a type_specific payload against the field definitions of a
   * component type. Returns the cleaned object; throws a 422 listing every
   * offending field.
   *
   * @param {number} componentTypeId
   * @param {object} payload
   * @param {{ strict?: boolean }} [options] strict=true enforces required fields
   */
  async validateTypeSpecific(componentTypeId, payload = {}, { strict = false } = {}) {
    const fields = await this.fieldsForComponentType(componentTypeId);
    if (!fields.length) return {};

    const errors = [];
    const clean = {};

    for (const field of fields) {
      const key = field.field_key;
      const raw = payload[key];
      const missing = raw === undefined || raw === null || raw === '';

      if (missing) {
        if (strict && field.is_required) {
          errors.push({ field: `typeSpecific.${key}`, message: `${field.label} is required` });
        }
        continue;
      }

      switch (field.data_type) {
        case 'number': {
          const num = Number(raw);
          if (!Number.isFinite(num)) {
            errors.push({ field: `typeSpecific.${key}`, message: `${field.label} must be a number` });
            break;
          }
          if (field.min_value !== null && num < Number(field.min_value)) {
            errors.push({ field: `typeSpecific.${key}`, message: `${field.label} must be at least ${field.min_value}` });
            break;
          }
          if (field.max_value !== null && num > Number(field.max_value)) {
            errors.push({ field: `typeSpecific.${key}`, message: `${field.label} must be at most ${field.max_value}` });
            break;
          }
          clean[key] = num;
          break;
        }

        case 'range': {
          // Accepts { min, max } or "0.5-12".
          let min;
          let max;
          if (typeof raw === 'object') {
            min = Number(raw.min);
            max = Number(raw.max);
          } else {
            [min, max] = String(raw).split(/[-–]/).map((v) => Number(v.trim()));
          }
          if (!Number.isFinite(min) || !Number.isFinite(max)) {
            errors.push({ field: `typeSpecific.${key}`, message: `${field.label} must be a range, e.g. { min, max }` });
            break;
          }
          if (min > max) {
            errors.push({ field: `typeSpecific.${key}`, message: `${field.label}: minimum cannot exceed maximum` });
            break;
          }
          clean[key] = { min, max, unit: field.unit || undefined };
          break;
        }

        case 'boolean':
          clean[key] = raw === true || raw === 'true' || raw === 1 || raw === '1';
          break;

        case 'select':
        case 'multiselect': {
          const allowed = await this.allowedOptionsFor(field, componentTypeId);
          const values = Array.isArray(raw) ? raw.map(String) : [String(raw)];
          const invalid = allowed.length ? values.filter((v) => !allowed.includes(slugify(v))) : [];
          if (invalid.length) {
            errors.push({
              field: `typeSpecific.${key}`,
              message: `${field.label} must be one of: ${allowed.join(', ')}`,
            });
            break;
          }
          clean[key] = field.data_type === 'multiselect' ? values.map(slugify) : slugify(values[0]);
          break;
        }

        case 'text':
          clean[key] = String(raw).slice(0, 5000);
          break;

        default:
          clean[key] = String(raw).slice(0, 500);
      }
    }

    if (errors.length) {
      throw ApiError.validation('Some component-specific fields are invalid', errors);
    }

    return clean;
  },

  /** Resolves the allowed values of a select field, following `options.source`. */
  async allowedOptionsFor(field, componentTypeId) {
    const options = field.options;
    if (!options) return [];
    if (Array.isArray(options)) return options.map((o) => slugify(typeof o === 'string' ? o : o.value));

    switch (options.source) {
      case 'model_types':
        return (await this.modelTypes()).map((m) => m.slug);
      case 'materials':
        return (await this.materials()).map((m) => m.slug);
      case 'organs':
        return (await this.organs()).map((o) => o.slug);
      case 'working_principles':
        return (await this.workingPrinciples(componentTypeId)).map((p) => p.slug);
      default:
        return Array.isArray(options.values) ? options.values.map(slugify) : [];
    }
  },

  /** Resolves a slug (or id) to a taxonomy row id — used when parsing filters. */
  async resolveId(table, value) {
    if (value === undefined || value === null || value === '') return null;
    if (Number.isFinite(Number(value))) return Number(value);
    const row = await db(table).where({ slug: slugify(value) }).first('id');
    return row ? row.id : null;
  },

  async resolveIds(table, values = []) {
    if (!values.length) return [];
    const numeric = values.filter((v) => Number.isFinite(Number(v))).map(Number);
    const slugs = values.filter((v) => !Number.isFinite(Number(v))).map((v) => slugify(v));
    const rows = slugs.length ? await db(table).whereIn('slug', slugs).pluck('id') : [];
    return [...new Set([...numeric, ...rows])];
  },

  /** Finds or creates tags by name and returns their ids (upload + forum tagging). */
  async upsertTags(names = [], trx) {
    const runner = trx || db;
    const unique = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))].slice(0, 20);
    const ids = [];

    for (const name of unique) {
      const slug = slugify(name);
      if (!slug) continue;
      let tag = await runner('tags').where({ slug }).first();
      if (!tag) {
        const [id] = await runner('tags').insert({ slug, name });
        tag = { id };
      }
      ids.push(tag.id);
    }
    return ids;
  },
};

module.exports = taxonomyService;
