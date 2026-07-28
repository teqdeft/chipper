/**
 * Reusable Joi fragments. Keeping them in one place means the rules for an id,
 * a slug, a password or a pagination block are identical everywhere.
 */
const Joi = require('joi');
const { PAGINATION } = require('../config/constants');

const id = Joi.number().integer().positive();
const uuid = Joi.string().guid({ version: ['uuidv4'] });
const slug = Joi.string()
  .lowercase()
  .trim()
  .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(200)
  .messages({ 'string.pattern.base': 'must be a lowercase, hyphen-separated slug' });

const handle = Joi.string()
  .lowercase()
  .trim()
  .pattern(/^[a-z0-9][a-z0-9._-]{1,39}$/)
  .messages({
    'string.pattern.base':
      'may only contain letters, numbers, dots, underscores and hyphens (2-40 characters)',
  });

const email = Joi.string().email({ minDomainSegments: 2 }).lowercase().trim().max(190);

const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  .messages({
    'string.pattern.base': 'must contain at least one lowercase letter, one uppercase letter and one number',
  });

/** Accepts `a,b,c` or repeated params and always yields an array of strings. */
const csvArray = Joi.alternatives()
  .try(Joi.array().items(Joi.string().trim()), Joi.string().trim())
  .custom((value) =>
    Array.isArray(value)
      ? value.flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean)
      : String(value).split(',').map((v) => v.trim()).filter(Boolean),
  );

const csvNumbers = csvArray.custom((value) => value.map(Number).filter((n) => Number.isFinite(n)));

const pagination = {
  page: Joi.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: Joi.number().integer().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  sortBy: Joi.string().trim().max(40),
  sortOrder: Joi.string().lowercase().valid('asc', 'desc').default('desc'),
};

const search = Joi.string().trim().allow('').max(200);

/** Freeform, length-capped rich text; HTML is stripped by the sanitize middleware. */
const richText = (max = 20000) => Joi.string().trim().max(max);

const idParam = (key = 'id') => Joi.object({ [key]: id.required() });
const slugParam = (key = 'slug') => Joi.object({ [key]: slug.required() });

module.exports = {
  id,
  uuid,
  slug,
  handle,
  email,
  password,
  csvArray,
  csvNumbers,
  pagination,
  search,
  richText,
  idParam,
  slugParam,
};
