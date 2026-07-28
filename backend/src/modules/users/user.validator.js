const Joi = require('joi');
const c = require('../../validators/common.validator');

module.exports = {
  updateProfile: {
    body: Joi.object({
      name: Joi.string().trim().min(2).max(120),
      handle: c.handle,
      affiliation: Joi.string().trim().max(190).allow('', null),
      accountType: Joi.string().valid('academic', 'industry', 'student', 'other').allow('', null),
      country: Joi.string().trim().max(80).allow('', null),
      website: Joi.string().uri({ scheme: ['http', 'https'] }).max(255).allow('', null),
      orcid: Joi.string()
        .trim()
        .pattern(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)
        .allow('', null)
        .messages({ 'string.pattern.base': 'must look like 0000-0002-1825-0097' }),
      bio: Joi.string().trim().max(2000).allow('', null),
      expertise: Joi.array().items(Joi.string().trim().max(80)).max(20),
    }).min(1),
  },

  updateSettings: {
    body: Joi.object({
      emailNotifications: Joi.boolean(),
      notifyDesignComments: Joi.boolean(),
      notifyForumReplies: Joi.boolean(),
      notifyMentions: Joi.boolean(),
      notifyMessages: Joi.boolean(),
      notifyNewsletter: Joi.boolean(),
      profilePublic: Joi.boolean(),
      showEmail: Joi.boolean(),
      locale: Joi.string().trim().max(10),
    }).min(1),
  },

  deleteAccount: {
    body: Joi.object({
      password: Joi.string().required(),
      reason: Joi.string().trim().max(500).allow('', null),
      confirm: Joi.string().valid('DELETE').required().messages({
        'any.only': 'Type DELETE to confirm account removal',
      }),
    }),
  },

  publicProfile: {
    params: Joi.object({ handle: c.handle.required() }),
  },

  list: {
    query: Joi.object({
      ...c.pagination,
      search: c.search,
      role: Joi.string().trim().max(32),
    }),
  },

  mentions: {
    query: Joi.object({
      q: Joi.string().trim().min(2).max(40).required(),
      limit: Joi.number().integer().min(1).max(20).default(8),
    }),
  },
};
