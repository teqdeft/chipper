const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./taxonomy.service');

const simple = (loader, message) =>
  asyncHandler(async (req, res) => ApiResponse.success(res, { data: await loader(req), message }));

module.exports = {
  all: simple(() => service.all(), 'Taxonomies'),
  componentTypes: simple(() => service.componentTypes(), 'Component types'),
  resourceTypes: simple(() => service.resourceTypes(), 'Resource types'),
  organs: simple(() => service.organs(), 'Organ models'),
  materials: simple(() => service.materials(), 'Materials'),
  fabricationMethods: simple(() => service.fabricationMethods(), 'Fabrication methods'),
  modelTypes: simple(() => service.modelTypes(), 'Model types'),
  licenses: simple(() => service.licenses(), 'Licences'),
  tags: simple((req) => service.popularTags(req.query.limit), 'Tags'),

  workingPrinciples: asyncHandler(async (req, res) => {
    const componentTypeId = await service.resolveId('component_types', req.query.componentType);
    const data = await service.workingPrinciples(componentTypeId);
    return ApiResponse.success(res, { data, message: 'Working principles' });
  }),

  /** Field schema for one component type — the wizard's dynamic step. */
  componentTypeFields: asyncHandler(async (req, res) => {
    const componentTypeId = await service.resolveId('component_types', req.params.componentType);
    const fields = await service.fieldsForComponentType(componentTypeId);
    return ApiResponse.success(res, {
      data: fields.map((f) => ({
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
      message: 'Component type fields',
    });
  }),
};
