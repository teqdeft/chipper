const Joi = require('joi');
const c = require('../../validators/common.validator');
const {
  ROLES, USER_STATUS, DESIGN_STATUS, REPORT_STATUS, ENTITY_TYPE, COMMENT_STATUS, CONTENT_STATUS,
} = require('../../config/constants');
const { TAXONOMY_TABLE_NAMES, FIELD_DATA_TYPES } = require('./taxonomy.tables');

const taxonomyTable = Joi.string().valid(...TAXONOMY_TABLE_NAMES).required();

module.exports = {
  listUsers: {
    query: Joi.object({
      ...c.pagination,
      search: c.search,
      role: Joi.string().valid(...Object.values(ROLES)),
      status: Joi.string().valid(...Object.values(USER_STATUS)),
      verified: Joi.boolean(),
    }),
  },

  userId: { params: c.idParam() },

  changeRole: {
    params: c.idParam(),
    body: Joi.object({ role: Joi.string().valid(...Object.values(ROLES)).required() }),
  },

  changeStatus: {
    params: c.idParam(),
    body: Joi.object({
      status: Joi.string().valid(...Object.values(USER_STATUS)).required(),
      reason: Joi.string().trim().max(255).allow('', null),
      until: Joi.date().iso().allow(null),
    }),
  },

  awardBadge: {
    params: c.idParam(),
    body: Joi.object({ badge: c.slug.required() }),
  },

  listDesigns: {
    query: Joi.object({
      ...c.pagination,
      search: c.search,
      status: Joi.string().valid(...Object.values(DESIGN_STATUS)),
    }),
  },

  reviewDesign: {
    params: Joi.object({ identifier: Joi.string().trim().max(200).required() }),
    body: Joi.object({
      action: Joi.string().valid('approve', 'reject', 'archive', 'restore', 'unpublish').required(),
      note: Joi.string().trim().max(1000).allow('', null),
    }),
  },

  deleteDesign: {
    params: Joi.object({ identifier: Joi.string().trim().max(200).required() }),
    // The note is what the owner is told; there is no design page left to link.
    body: Joi.object({ note: Joi.string().trim().max(1000).allow('', null) }),
  },

  featureDesign: {
    params: Joi.object({ identifier: Joi.string().trim().max(200).required() }),
    body: Joi.object({ featured: Joi.boolean().required() }),
  },

  listReports: {
    query: Joi.object({
      ...c.pagination,
      status: Joi.string().valid(...Object.values(REPORT_STATUS)),
      entityType: Joi.string().valid(...Object.values(ENTITY_TYPE)),
      reason: Joi.string().trim().max(40),
    }),
  },

  resolveReport: {
    params: c.idParam(),
    body: Joi.object({
      action: Joi.string().valid('hide', 'remove', 'restore', 'warn', 'suspend', 'ban', 'no-action').required(),
      note: Joi.string().trim().max(1000).allow('', null),
    }),
  },

  moderateEntity: {
    body: Joi.object({
      entityType: Joi.string().valid(...Object.values(ENTITY_TYPE)).required(),
      entityId: c.id.required(),
      action: Joi.string().valid('hide', 'remove', 'restore').required(),
      note: Joi.string().trim().max(1000).allow('', null),
    }),
  },

  listComments: {
    query: Joi.object({
      ...c.pagination,
      status: Joi.string().valid(...Object.values(COMMENT_STATUS)),
      search: c.search,
    }),
  },

  newsBody: {
    body: Joi.object({
      title: Joi.string().trim().min(3).max(250).required(),
      slug: c.slug,
      excerpt: Joi.string().trim().max(500).allow('', null),
      body: Joi.string().trim().max(100000).allow('', null),
      category: Joi.string().trim().max(64).allow('', null),
      status: Joi.string().valid(...Object.values(CONTENT_STATUS)).default('draft'),
      featured: Joi.boolean().default(false),
      publishedAt: Joi.date().iso().allow(null),
    }),
  },

  newsUpdate: {
    params: Joi.object({ slug: Joi.string().trim().max(200).required() }),
    body: Joi.object({
      title: Joi.string().trim().min(3).max(250),
      excerpt: Joi.string().trim().max(500).allow('', null),
      body: Joi.string().trim().max(100000).allow('', null),
      category: Joi.string().trim().max(64).allow('', null),
      status: Joi.string().valid(...Object.values(CONTENT_STATUS)),
      featured: Joi.boolean(),
      publishedAt: Joi.date().iso().allow(null),
    }).min(1),
  },

  pageUpsert: {
    params: Joi.object({ slug: c.slug.required() }),
    body: Joi.object({
      title: Joi.string().trim().min(2).max(250),
      body: Joi.string().trim().max(200000).allow('', null),
      sections: Joi.array().items(Joi.object().unknown(true)).max(50),
      metaTitle: Joi.string().trim().max(250).allow('', null),
      metaDescription: Joi.string().trim().max(500).allow('', null),
      status: Joi.string().valid(...Object.values(CONTENT_STATUS)),
    }).min(1),
  },

  categoryCreate: {
    body: Joi.object({
      name: Joi.string().trim().min(2).max(120).required(),
      slug: c.slug,
      description: Joi.string().trim().max(500).allow('', null),
      icon: Joi.string().trim().max(64).allow('', null),
      color: Joi.string().trim().max(24).allow('', null),
      sortOrder: Joi.number().integer().min(0).default(0),
    }),
  },

  categoryUpdate: {
    params: Joi.object({ category: Joi.string().trim().max(80).required() }),
    body: Joi.object({
      name: Joi.string().trim().min(2).max(120),
      description: Joi.string().trim().max(500).allow('', null),
      icon: Joi.string().trim().max(64).allow('', null),
      color: Joi.string().trim().max(24).allow('', null),
      sortOrder: Joi.number().integer().min(0),
      locked: Joi.boolean(),
      active: Joi.boolean(),
    }).min(1),
  },

  categoryDelete: {
    params: Joi.object({ category: Joi.string().trim().max(80).required() }),
  },

  taxonomyList: {
    params: Joi.object({ table: taxonomyTable }),
    query: Joi.object({
      componentType: Joi.string().trim().max(64).allow(''),
      includeInactive: Joi.boolean().default(false),
      search: c.search,
      limit: Joi.number().integer().min(1).max(500),
    }),
  },

  taxonomyUpsert: {
    params: Joi.object({ table: taxonomyTable }),
    body: Joi.object({
      slug: c.slug,
      code: Joi.string().trim().max(40),
      fieldKey: Joi.string().trim().max(64),
      name: Joi.string().trim().min(1).max(150).required(),
      note: Joi.string().trim().max(255).allow('', null),
      description: Joi.string().trim().max(255).allow('', null),
      family: Joi.string().trim().max(32).allow('', null),
      url: Joi.string().uri().max(255).allow('', null),
      summary: Joi.string().trim().max(2000).allow('', null),
      requiresAttribution: Joi.boolean(),
      allowsCommercial: Joi.boolean(),
      shareAlike: Joi.boolean(),
      // Component-type-dependent lists (working principles, field definitions).
      componentType: Joi.string().trim().max(64).allow('', null),
      dataType: Joi.string().valid(...FIELD_DATA_TYPES),
      unit: Joi.string().trim().max(32).allow('', null),
      options: Joi.object({
        source: Joi.string().trim().max(64),
        values: Joi.array().items(Joi.string().trim().max(120)).max(100),
      }).allow(null),
      min: Joi.number().allow(null),
      max: Joi.number().allow(null),
      required: Joi.boolean(),
      filterable: Joi.boolean(),
      sortOrder: Joi.number().integer().min(0),
      active: Joi.boolean(),
      /** Turns the upsert into a checked create or update. */
      expect: Joi.string().valid('create', 'update'),
    }),
  },

  taxonomyDelete: {
    params: Joi.object({
      table: taxonomyTable,
      identifier: Joi.string().trim().max(80).required(),
    }),
    query: Joi.object({ componentType: Joi.string().trim().max(64).allow('') }),
  },

  setting: {
    params: Joi.object({ key: Joi.string().trim().max(120).required() }),
    body: Joi.object({ value: Joi.any().required() }),
  },

  auditLogs: {
    query: Joi.object({
      ...c.pagination,
      userId: c.id,
      action: Joi.string().trim().max(100),
      entityType: Joi.string().trim().max(40),
      entityId: c.id,
    }),
  },
};
