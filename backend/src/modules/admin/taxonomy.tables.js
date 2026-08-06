/**
 * What an admin may edit in each controlled vocabulary.
 *
 * The tables do not share one shape — component/resource types keep their blurb
 * in `description`, the rest in `note`, licences in `summary`, and the two
 * component-type-dependent lists hang off a parent id. Rather than branch on the
 * table name in half a dozen places, every difference is declared here once and
 * the service drives off it. Mirrors the create_taxonomies migration; the
 * validator reuses it as the allowlist of manageable tables.
 *
 *   key       identifier column — what the URL and the upsert match on
 *   nameCol   human-readable label column
 *   noteCol   free-text column, or null when the table has none
 *   scope     parent column, for the lists that belong to one component type
 *   columns   every column the upsert is allowed to write
 *   remove    'flag' flips is_active · 'delete' removes the row outright
 */
const TAXONOMY_TABLES = {
  component_types: {
    label: 'Component types',
    key: 'slug',
    nameCol: 'name',
    noteCol: 'description',
    remove: 'flag',
    columns: ['slug', 'name', 'description', 'icon', 'sort_order', 'is_active'],
  },
  resource_types: {
    label: 'Resource types',
    key: 'slug',
    nameCol: 'name',
    noteCol: 'description',
    remove: 'flag',
    columns: ['slug', 'name', 'description', 'sort_order', 'is_active'],
  },
  organs: {
    label: 'Organs',
    key: 'slug',
    nameCol: 'name',
    noteCol: 'note',
    remove: 'flag',
    columns: ['slug', 'name', 'note', 'sort_order', 'is_active'],
  },
  materials: {
    label: 'Materials',
    key: 'slug',
    nameCol: 'name',
    noteCol: 'note',
    remove: 'flag',
    columns: ['slug', 'name', 'note', 'sort_order', 'is_active'],
  },
  fabrication_methods: {
    label: 'Fabrication methods',
    key: 'slug',
    nameCol: 'name',
    noteCol: 'note',
    remove: 'flag',
    columns: ['slug', 'name', 'note', 'sort_order', 'is_active'],
  },
  model_types: {
    label: 'Model types',
    key: 'slug',
    nameCol: 'name',
    noteCol: 'note',
    remove: 'flag',
    columns: ['slug', 'name', 'note', 'sort_order', 'is_active'],
  },
  licenses: {
    label: 'Licenses',
    key: 'code',
    nameCol: 'name',
    noteCol: 'summary',
    remove: 'flag',
    columns: [
      'code', 'name', 'family', 'url', 'summary',
      'requires_attribution', 'allows_commercial', 'share_alike', 'sort_order', 'is_active',
    ],
  },
  working_principles: {
    label: 'Working principles',
    key: 'slug',
    nameCol: 'name',
    noteCol: 'note',
    // Nullable: a principle with no component type applies to every one of them.
    scope: 'component_type_id',
    scopeRequired: false,
    remove: 'flag',
    columns: ['component_type_id', 'slug', 'name', 'note', 'sort_order', 'is_active'],
  },
  component_type_fields: {
    label: 'Component type fields',
    key: 'field_key',
    nameCol: 'label',
    noteCol: 'hint',
    scope: 'component_type_id',
    scopeRequired: true,
    remove: 'flag',
    columns: [
      'component_type_id', 'field_key', 'label', 'hint', 'data_type', 'unit', 'options',
      'min_value', 'max_value', 'is_required', 'is_filterable', 'sort_order', 'is_active',
    ],
  },
  tags: {
    label: 'Tags',
    key: 'slug',
    nameCol: 'name',
    noteCol: null,
    // Tags carry no is_active flag, and a design or topic may still point at one,
    // so removal is a real delete guarded by a usage check.
    remove: 'delete',
    columns: ['slug', 'name'],
  },
};

const TAXONOMY_TABLE_NAMES = Object.keys(TAXONOMY_TABLES);

/** Data types `component_type_fields.data_type` accepts. */
const FIELD_DATA_TYPES = ['string', 'text', 'number', 'range', 'boolean', 'select', 'multiselect', 'reference'];

module.exports = { TAXONOMY_TABLES, TAXONOMY_TABLE_NAMES, FIELD_DATA_TYPES };
