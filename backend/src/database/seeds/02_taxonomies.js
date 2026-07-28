/**
 * Controlled vocabularies.
 *
 * Values come from the Chipper design-system content file and the metadata
 * specification: component types, resource types, organs, materials, fabrication
 * methods, model types, working principles, licences, and the component-type
 * dependent field definitions.
 */
const { COMPONENT_TYPE } = require('../../config/constants');

const COMPONENT_TYPES = [
  { slug: COMPONENT_TYPE.ORGAN_CHIP, name: 'Organ chip', description: 'Two-channel barrier models and beyond — the tissue lives here.', sort_order: 1 },
  { slug: COMPONENT_TYPE.FLOW_SENSOR, name: 'Flow sensor', description: 'Inline sensing that keeps perfusion honest across a run.', sort_order: 2 },
  { slug: COMPONENT_TYPE.PRESSURE_SENSOR, name: 'Pressure sensor', description: 'Inline pressure measurement.', sort_order: 3 },
  { slug: COMPONENT_TYPE.PUMP, name: 'Pump', description: 'Micro-pumps that drive flow without a benchtop of tubing.', sort_order: 4 },
  { slug: COMPONENT_TYPE.RESERVOIR, name: 'Reservoir', description: 'Media reservoirs and compartments.', sort_order: 5 },
  { slug: COMPONENT_TYPE.FCB, name: 'FCB', description: 'Fluidic circuit board that ties the platform together.', sort_order: 6 },
  { slug: COMPONENT_TYPE.OTHER_MICROFLUIDIC_CHIP, name: 'Other microfluidic chip', description: 'Microfluidic chips outside the named categories.', sort_order: 7 },
  { slug: COMPONENT_TYPE.OTHER, name: 'Other', description: 'Anything else in the MPS stack.', sort_order: 8 },
];

const RESOURCE_TYPES = [
  { slug: '3d-model', name: '3D model', description: 'Fabrication-ready geometry.', sort_order: 1 },
  { slug: 'sop', name: 'SOP', description: 'Standard operating procedure.', sort_order: 2 },
  { slug: 'product', name: 'Product', description: 'A commercially available component.', sort_order: 3 },
];

const ORGANS = [
  { slug: 'lung', name: 'Lung', note: 'Alveolar barrier, air–liquid interface', sort_order: 1 },
  { slug: 'liver', name: 'Liver', note: 'Sinusoid and metabolic models', sort_order: 2 },
  { slug: 'gut', name: 'Gut', note: 'Epithelial barrier under flow', sort_order: 3 },
  { slug: 'skin', name: 'Skin', note: 'Dermal and epidermal layers', sort_order: 4 },
  { slug: 'lymph', name: 'Lymph', note: 'Immune and lymphatic tissue', sort_order: 5 },
  { slug: 'pancreas', name: 'Pancreas', note: 'Islet and endocrine function', sort_order: 6 },
  { slug: 'kidney', name: 'Kidney', note: 'Proximal tubule and filtration models', sort_order: 7 },
  { slug: 'heart', name: 'Heart', note: 'Cardiac tissue and contractility', sort_order: 8 },
  { slug: 'brain', name: 'Brain', note: 'Neural and blood–brain barrier models', sort_order: 9 },
  { slug: 'other', name: 'Other', note: 'Not listed above', sort_order: 99 },
];

const MATERIALS = [
  { slug: 'pdms', name: 'PDMS', note: 'Soft, gas-permeable, the field default', sort_order: 1 },
  { slug: 'pmma', name: 'PMMA', note: 'Rigid, optically clear thermoplastic', sort_order: 2 },
  { slug: 'coc', name: 'COC', note: 'Low-autofluorescence cyclic olefin', sort_order: 3 },
  { slug: 'glass', name: 'Glass', note: 'Inert, high optical quality', sort_order: 4 },
  { slug: 'ps', name: 'Polystyrene', note: 'Standard cell-culture plastic', sort_order: 5 },
  { slug: 'resin', name: 'Resin', note: 'Photopolymer for SLA printing', sort_order: 6 },
  { slug: 'other', name: 'Other', note: 'Not listed above', sort_order: 99 },
];

const FABRICATION_METHODS = [
  { slug: 'soft-lithography', name: 'Soft lithography', note: 'Moulded microchannels at high fidelity', sort_order: 1 },
  { slug: 'micromachining', name: 'Micromachining', note: 'Directly cut features in rigid stock', sort_order: 2 },
  { slug: 'sla', name: 'SLA', note: 'Resin printing for complex geometries', sort_order: 3 },
  { slug: 'injection-moulding', name: 'Injection moulding', note: 'Scaled thermoplastic production', sort_order: 4 },
  { slug: 'laser-cutting', name: 'Laser cutting', note: 'Layered sheet fabrication', sort_order: 5 },
  { slug: 'hot-embossing', name: 'Hot embossing', note: 'Thermoformed microstructures', sort_order: 6 },
  { slug: 'other', name: 'Other', note: 'Not listed above', sort_order: 99 },
];

const MODEL_TYPES = [
  { slug: 'monolayer', name: 'Monolayer', sort_order: 1 },
  { slug: 'organoid', name: 'Organoid', sort_order: 2 },
  { slug: 'spheroid', name: 'Spheroid', sort_order: 3 },
  { slug: 'organ-on-chip', name: 'Organ-on-chip', sort_order: 4 },
  { slug: 'ali', name: 'ALI (air–liquid interface)', sort_order: 5 },
];

const LICENSES = [
  { code: 'CC BY 4.0', name: 'Creative Commons Attribution 4.0', family: 'cc', url: 'https://creativecommons.org/licenses/by/4.0/', summary: 'Reuse and adapt freely, including commercially, as long as you credit the maker.', requires_attribution: true, allows_commercial: true, share_alike: false, sort_order: 1 },
  { code: 'CC BY-SA 4.0', name: 'Creative Commons Attribution-ShareAlike 4.0', family: 'cc', url: 'https://creativecommons.org/licenses/by-sa/4.0/', summary: 'Same as CC BY, but derivatives must carry the same licence.', requires_attribution: true, allows_commercial: true, share_alike: true, sort_order: 2 },
  { code: 'CC BY-NC 4.0', name: 'Creative Commons Attribution-NonCommercial 4.0', family: 'cc', url: 'https://creativecommons.org/licenses/by-nc/4.0/', summary: 'Reuse with credit, non-commercial use only.', requires_attribution: true, allows_commercial: false, share_alike: false, sort_order: 3 },
  { code: 'CC0 1.0', name: 'Creative Commons Zero (public domain)', family: 'cc', url: 'https://creativecommons.org/publicdomain/zero/1.0/', summary: 'No rights reserved — attribution appreciated but not required.', requires_attribution: false, allows_commercial: true, share_alike: false, sort_order: 4 },
  { code: 'MIT', name: 'MIT License', family: 'mit', url: 'https://opensource.org/licenses/MIT', summary: 'Permissive: do anything, keep the notice.', requires_attribution: true, allows_commercial: true, share_alike: false, sort_order: 5 },
  { code: 'GPL-3.0', name: 'GNU General Public License v3.0', family: 'gpl', url: 'https://www.gnu.org/licenses/gpl-3.0.en.html', summary: 'Copyleft: derivatives must stay open under the same terms.', requires_attribution: true, allows_commercial: true, share_alike: true, sort_order: 6 },
  { code: 'none', name: 'No licence (all rights reserved)', family: 'none', summary: 'Viewing only. Contact the maker before any reuse.', requires_attribution: true, allows_commercial: false, share_alike: false, sort_order: 7 },
  { code: 'custom', name: 'Custom licence', family: 'custom', summary: 'Terms supplied by the maker on the design page.', is_custom: true, requires_attribution: true, allows_commercial: false, share_alike: false, sort_order: 8 },
];

/** Working principles, scoped to the component type they belong to. */
const WORKING_PRINCIPLES = {
  [COMPONENT_TYPE.FLOW_SENSOR]: [
    { slug: 'thermal', name: 'Thermal (calorimetric)' },
    { slug: 'coriolis', name: 'Coriolis' },
    { slug: 'differential-pressure', name: 'Differential pressure' },
    { slug: 'ultrasonic', name: 'Ultrasonic' },
    { slug: 'optical', name: 'Optical' },
  ],
  [COMPONENT_TYPE.PRESSURE_SENSOR]: [
    { slug: 'piezoresistive', name: 'Piezoresistive' },
    { slug: 'capacitive', name: 'Capacitive' },
    { slug: 'optical', name: 'Optical' },
    { slug: 'membrane-deflection', name: 'Membrane deflection' },
  ],
  [COMPONENT_TYPE.PUMP]: [
    { slug: 'peristaltic', name: 'Peristaltic' },
    { slug: 'syringe', name: 'Syringe' },
    { slug: 'pressure-driven', name: 'Pressure-driven' },
    { slug: 'diaphragm', name: 'Diaphragm' },
    { slug: 'gravity-driven', name: 'Gravity-driven' },
    { slug: 'rocker', name: 'Rocker / tilting' },
  ],
};

/**
 * Component-type-dependent metadata field definitions.
 * These drive dynamic validation of design_versions.type_specific and the
 * "Type fields" step of the upload wizard.
 */
const TYPE_FIELDS = {
  [COMPONENT_TYPE.ORGAN_CHIP]: [
    { field_key: 'model_type', label: 'Model type', data_type: 'select', is_required: true, is_filterable: true, sort_order: 1, options: { source: 'model_types' }, hint: 'monolayer / organoid / spheroid / organ-on-chip / ALI' },
    { field_key: 'channel_count', label: 'Number of channels', data_type: 'number', min_value: 1, max_value: 64, sort_order: 2 },
    { field_key: 'membrane', label: 'Membrane', data_type: 'string', sort_order: 3, hint: 'Material and pore size, if applicable' },
    { field_key: 'culture_area', label: 'Culture area', data_type: 'number', unit: 'mm²', sort_order: 4 },
  ],
  [COMPONENT_TYPE.FLOW_SENSOR]: [
    { field_key: 'accuracy', label: 'Accuracy', data_type: 'number', unit: '%', is_required: true, sort_order: 1 },
    { field_key: 'stability', label: 'Stability (resolution)', data_type: 'number', unit: 'µL/min', is_required: true, sort_order: 2 },
    { field_key: 'working_principle', label: 'Working principle', data_type: 'select', is_required: true, is_filterable: true, sort_order: 3, options: { source: 'working_principles' } },
    { field_key: 'lod', label: 'Limit of detection (LoD)', data_type: 'number', unit: 'µL/min', sort_order: 4 },
    { field_key: 'measuring_range', label: 'Measuring range', data_type: 'range', unit: 'µL/min', sort_order: 5 },
  ],
  [COMPONENT_TYPE.PRESSURE_SENSOR]: [
    { field_key: 'accuracy', label: 'Accuracy', data_type: 'number', unit: '%', is_required: true, sort_order: 1 },
    { field_key: 'stability', label: 'Stability (resolution)', data_type: 'number', unit: 'kPa', is_required: true, sort_order: 2 },
    { field_key: 'working_principle', label: 'Working principle', data_type: 'select', is_required: true, is_filterable: true, sort_order: 3, options: { source: 'working_principles' } },
    { field_key: 'lod', label: 'Limit of detection (LoD)', data_type: 'number', unit: 'kPa', sort_order: 4 },
    { field_key: 'measuring_range', label: 'Measuring range', data_type: 'range', unit: 'kPa', sort_order: 5 },
  ],
  [COMPONENT_TYPE.PUMP]: [
    { field_key: 'flow_rate_range', label: 'Flow rate range', data_type: 'range', unit: 'µL/min', is_required: true, sort_order: 1 },
    { field_key: 'stability', label: 'Stability', data_type: 'number', unit: '%', sort_order: 2 },
    { field_key: 'working_principle', label: 'Working principle', data_type: 'select', is_required: true, is_filterable: true, sort_order: 3, options: { source: 'working_principles' } },
    { field_key: 'max_pressure', label: 'Maximum pressure', data_type: 'number', unit: 'kPa', sort_order: 4 },
    { field_key: 'channel_count', label: 'Number of channels', data_type: 'number', min_value: 1, max_value: 64, sort_order: 5 },
  ],
  [COMPONENT_TYPE.RESERVOIR]: [
    { field_key: 'volume', label: 'Volume', data_type: 'number', unit: 'mL', is_required: true, sort_order: 1 },
    { field_key: 'compartments', label: 'Number of compartments', data_type: 'number', min_value: 1, max_value: 96, is_required: true, sort_order: 2 },
    { field_key: 'sealing', label: 'Sealing', data_type: 'string', sort_order: 3 },
  ],
  [COMPONENT_TYPE.FCB]: [
    { field_key: 'port_count', label: 'Number of ports', data_type: 'number', min_value: 1, max_value: 256, sort_order: 1 },
    { field_key: 'connection_standard', label: 'Connection standard', data_type: 'string', sort_order: 2, hint: 'e.g. ISO 22916 port grid' },
    { field_key: 'integrated_components', label: 'Integrated components', data_type: 'text', sort_order: 3 },
  ],
  [COMPONENT_TYPE.OTHER_MICROFLUIDIC_CHIP]: [
    { field_key: 'application', label: 'Application', data_type: 'string', sort_order: 1 },
    { field_key: 'channel_count', label: 'Number of channels', data_type: 'number', min_value: 1, max_value: 256, sort_order: 2 },
  ],
  [COMPONENT_TYPE.OTHER]: [],
};

async function upsert(knex, table, rows, conflictKey = 'slug', mergeKeys = ['name']) {
  if (!rows.length) return;
  await knex(table).insert(rows).onConflict(conflictKey).merge(mergeKeys);
}

exports.seed = async function seed(knex) {
  await upsert(knex, 'component_types', COMPONENT_TYPES, 'slug', ['name', 'description', 'sort_order']);
  await upsert(knex, 'resource_types', RESOURCE_TYPES, 'slug', ['name', 'description', 'sort_order']);
  await upsert(knex, 'organs', ORGANS, 'slug', ['name', 'note', 'sort_order']);
  await upsert(knex, 'materials', MATERIALS, 'slug', ['name', 'note', 'sort_order']);
  await upsert(knex, 'fabrication_methods', FABRICATION_METHODS, 'slug', ['name', 'note', 'sort_order']);
  await upsert(knex, 'model_types', MODEL_TYPES, 'slug', ['name', 'sort_order']);
  await knex('licenses')
    .insert(LICENSES)
    .onConflict('code')
    .merge(['name', 'family', 'url', 'summary', 'requires_attribution', 'allows_commercial', 'share_alike', 'sort_order']);

  const componentTypes = await knex('component_types').select('id', 'slug');
  const idBySlug = Object.fromEntries(componentTypes.map((c) => [c.slug, c.id]));

  const principles = Object.entries(WORKING_PRINCIPLES).flatMap(([typeSlug, list]) =>
    list.map((p, index) => ({
      component_type_id: idBySlug[typeSlug],
      slug: p.slug,
      name: p.name,
      sort_order: index + 1,
    })),
  );
  if (principles.length) {
    await knex('working_principles').insert(principles).onConflict(['component_type_id', 'slug']).merge(['name', 'sort_order']);
  }

  const fields = Object.entries(TYPE_FIELDS).flatMap(([typeSlug, list]) =>
    list.map((f) => ({
      component_type_id: idBySlug[typeSlug],
      field_key: f.field_key,
      label: f.label,
      hint: f.hint || null,
      data_type: f.data_type,
      unit: f.unit || null,
      options: f.options ? JSON.stringify(f.options) : null,
      min_value: f.min_value ?? null,
      max_value: f.max_value ?? null,
      is_required: Boolean(f.is_required),
      is_filterable: Boolean(f.is_filterable),
      sort_order: f.sort_order || 0,
    })),
  );
  if (fields.length) {
    await knex('component_type_fields')
      .insert(fields)
      .onConflict(['component_type_id', 'field_key'])
      .merge(['label', 'hint', 'data_type', 'unit', 'options', 'min_value', 'max_value', 'is_required', 'is_filterable', 'sort_order']);
  }
};
