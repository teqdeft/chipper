const Joi = require('joi');
const c = require('../../validators/common.validator');
const { DESIGN_STATUS, PUBLISH_AS, COMPONENT_TYPE } = require('../../config/constants');

const identifier = Joi.string().trim().max(200).required();
const rangeSchema = Joi.object({
  min: Joi.number().allow(null),
  max: Joi.number().allow(null),
  unit: Joi.string().trim().max(16).allow('', null),
});

const operatingParameters = Joi.object({
  temperature: rangeSchema,
  pressure: rangeSchema,
  flowRate: rangeSchema,
});

const creditSchema = Joi.object({
  name: Joi.string().trim().max(190).required(),
  affiliation: Joi.string().trim().max(190).allow('', null),
  role: Joi.string().trim().max(120).allow('', null),
  url: Joi.string().uri().max(255).allow('', null),
  userId: c.id.allow(null),
});

const publishedWorkSchema = Joi.object({
  title: Joi.string().trim().max(300).required(),
  authors: Joi.string().trim().max(500).allow('', null),
  publication: Joi.string().trim().max(255).allow('', null),
  year: Joi.number().integer().min(1900).max(2100).allow(null),
  doi: Joi.string().trim().max(120).allow('', null),
  url: Joi.string().uri().max(500).allow('', null),
});

const relatedDocumentSchema = Joi.object({
  title: Joi.string().trim().max(255).required(),
  documentType: Joi.string().trim().max(64).allow('', null),
  url: Joi.string().uri().max(500).allow('', null),
  description: Joi.string().trim().max(500).allow('', null),
  relatedDesignId: c.id.allow(null),
  fileId: c.id.allow(null),
});

/**
 * Shared metadata body — `required` toggles the create/update difference.
 *
 * What "required" covers is the set a design cannot be catalogued without:
 * a name, a one-line summary, a description, what the thing *is* (component +
 * resource type), who is publishing it, what it was made of and how, and the
 * licence a downloader is agreeing to. Everything else stays optional so an
 * uploader is not blocked on data they may not have.
 *
 * A PATCH sends only what changed, so nothing is required there — but a field
 * that IS sent may not be blanked back out; `.required()` inside the update
 * variant is expressed as "not empty" via the same `str()` helpers below.
 */
const metadataBody = (required = false) => {
  const str = (max) => Joi.string().trim().max(max);
  /** Mandatory on create, and non-empty if present on update. */
  const core = (schema, message) => (required ? schema.required().messages({ 'any.required': message, 'string.empty': message }) : schema);

  return Joi.object({
    title: core(str(200).min(3), 'A design name is required'),
    summary: core(str(500).min(10), 'A short summary is required — it is what people read on browse cards'),
    description: core(str(50000).min(20), 'A description is required'),

    componentType: core(Joi.string().trim().max(64), 'Choose a component type'),
    resourceType: core(Joi.string().trim().max(64), 'Choose a resource type'),

    publishAs: core(Joi.string().valid(...Object.values(PUBLISH_AS)), 'Choose who this is published as'),
    /**
     * Only meaningful — and only mandatory — when publishing under an institute.
     *
     * The `is` schema must be `.required()`: without it Joi also matches an
     * absent `publishAs`, which would make a PATCH that only touches the title
     * demand an institute name.
     */
    instituteName: Joi.when('publishAs', {
      is: Joi.string().valid(PUBLISH_AS.INSTITUTE, PUBLISH_AS.PERSON_FROM_INSTITUTE).required(),
      then: str(190).required().messages({
        'any.required': 'Name the institute you are publishing under',
        'string.empty': 'Name the institute you are publishing under',
      }),
      otherwise: str(190).allow('', null),
    }),

    // An organ chip that names no organ is not searchable by the one filter
    // people actually use, so it is mandatory for that type only.
    organs: Joi.when('componentType', {
      is: Joi.string().valid(COMPONENT_TYPE.ORGAN_CHIP).required(),
      then: Joi.alternatives()
        .try(Joi.array().items(Joi.string().trim().max(64)).min(1), Joi.string().trim().min(1))
        .required()
        .messages({
          'any.required': 'Select at least one tested organ',
          'alternatives.match': 'Select at least one tested organ',
        }),
      otherwise: Joi.alternatives().try(
        Joi.array().items(Joi.string().trim().max(64)),
        Joi.string().trim().allow(''),
      ),
    }),
    testedMaterial: core(Joi.string().trim().max(64), 'Choose the tested material'),
    testedFabricationMethod: core(Joi.string().trim().max(64), 'Choose the tested fabrication method'),

    license: core(Joi.string().trim().max(40), 'Choose a licence'),
    // A "Custom" licence is only a licence once its terms are written down.
    customLicenseText: Joi.when('license', {
      is: Joi.string().trim().insensitive().valid('custom').required(),
      then: str(10000).required().messages({
        'any.required': 'Custom licences need their terms written out',
        'string.empty': 'Custom licences need their terms written out',
      }),
      otherwise: str(10000).allow('', null),
    }),
    howToCite: str(2000).allow('', null),
    creditsNote: str(2000).allow('', null),

    // "How to use this chip"
    clipString: str(255).allow('', null),
    maxHeightMm: Joi.number().min(0).max(1000).allow(null),
    clampingZoneHeightMm: Joi.number().min(0).max(1000).allow(null),
    exclusionZones: str(2000).allow('', null),
    clampingStrategy: str(2000).allow('', null),
    operatingParameters,

    iso22916: Joi.boolean(),
    iso22916Note: str(2000).allow('', null),

    // Component-type-dependent block, validated against component_type_fields.
    typeSpecific: Joi.object().unknown(true),

    tags: Joi.array().items(Joi.string().trim().max(60)).max(20),
    credits: Joi.array().items(creditSchema).max(30),
    publishedWorks: Joi.array().items(publishedWorkSchema).max(50),
    relatedDocuments: Joi.array().items(relatedDocumentSchema).max(50),

    version: Joi.string().trim().max(20),
    versionNote: str(500).allow('', null),
    versionBump: Joi.string().valid('major', 'minor'),
  });
};

module.exports = {
  browse: {
    query: Joi.object({
      ...c.pagination,
      search: c.search,
      componentType: c.csvArray,
      resourceType: c.csvArray,
      organ: c.csvArray,
      material: c.csvArray,
      fabricationMethod: c.csvArray,
      license: c.csvArray,
      tag: c.csvArray,
      status: c.csvArray,
      author: c.handle,
      iso22916: Joi.boolean(),
      featured: Joi.boolean(),
      minRating: Joi.number().min(0).max(5),
      mine: Joi.boolean().default(false),
      facets: Joi.boolean().default(false),
      sortBy: Joi.string().valid(
        'created_at', 'updated_at', 'published_at', 'title',
        'download_count', 'star_count', 'view_count', 'average_rating',
      ),
    }),
  },

  detail: {
    params: Joi.object({ identifier }),
    query: Joi.object({ version: Joi.string().trim().max(20) }),
  },

  create: { body: metadataBody(true) },

  update: {
    params: Joi.object({ identifier }),
    body: metadataBody(false).min(1),
  },

  createVersion: {
    params: Joi.object({ identifier }),
    body: Joi.object({
      version: Joi.string().trim().max(20),
      bump: Joi.string().valid('major', 'minor').default('minor'),
      note: Joi.string().trim().max(500).allow('', null),
      copyMetadata: Joi.boolean().default(true),
      // Files are carried forward by default so a version bump does not mean
      // re-uploading everything that did not change.
      copyFiles: Joi.boolean().default(true),
    }),
  },

  publish: {
    params: Joi.object({ identifier }),
    body: Joi.object({
      versionId: c.id,
      note: Joi.string().trim().max(500).allow('', null),
    }),
  },

  remove: { params: Joi.object({ identifier }) },

  addFiles: {
    params: Joi.object({ identifier }),
    body: Joi.object({
      versionId: c.id,
      primaryIndex: Joi.number().integer().min(0),
      // Up to three gallery covers. `coverIndex` is the older single-cover
      // parameter and still works; the service takes whichever was sent.
      coverIndex: Joi.number().integer().min(0),
      coverIndexes: c.csvNumbers,
    }),
  },

  removeFile: {
    params: Joi.object({ identifier, fileId: Joi.alternatives().try(c.id, c.uuid).required() }),
  },

  download: {
    params: Joi.object({ identifier }),
    query: Joi.object({
      fileId: Joi.alternatives().try(c.id, c.uuid),
      version: Joi.string().trim().max(20),
      acceptLicense: Joi.boolean().default(true),
      purpose: Joi.string().trim().max(255).allow('', null),
    }),
  },

  star: { params: Joi.object({ identifier }) },

  ownership: {
    params: Joi.object({ identifier }),
    body: Joi.object({
      hasOne: Joi.boolean().default(true),
      rating: Joi.number().integer().min(1).max(5).allow(null),
      note: Joi.string().trim().max(500).allow('', null),
    }),
  },

  listComments: {
    params: Joi.object({ identifier }),
    query: Joi.object({ ...c.pagination }),
  },

  addComment: {
    params: Joi.object({ identifier }),
    body: Joi.object({
      body: Joi.string().trim().min(2).max(5000).required(),
      parentId: c.id.allow(null),
    }),
  },

  updateComment: {
    params: Joi.object({ commentId: c.id.required() }),
    body: Joi.object({ body: Joi.string().trim().min(2).max(5000).required() }),
  },

  deleteComment: { params: Joi.object({ commentId: c.id.required() }) },

  listMine: {
    query: Joi.object({
      ...c.pagination,
      search: c.search,
      status: c.csvArray,
    }),
  },

  versions: { params: Joi.object({ identifier }) },

  statuses: Object.values(DESIGN_STATUS),
};
