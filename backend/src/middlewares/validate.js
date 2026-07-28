/**
 * Joi request validation.
 *
 *   router.post('/', validate(authValidator.register), controller.register);
 *
 * A schema is an object with any of `body`, `query`, `params`, `headers`. Each
 * part is validated independently and the *sanitised* value is written back onto
 * the request, so controllers always see coerced, defaulted, whitelisted data.
 *
 * Note: req.query is a getter on Express 5 — the validated object is stored on
 * req.validatedQuery as well, and read through a defineProperty shim so existing
 * `req.query` access keeps working on Express 4.
 */
const ApiError = require('../utils/ApiError');

const OPTIONS = {
  abortEarly: false,
  stripUnknown: true,
  convert: true,
  errors: { wrap: { label: "'" } },
};

const PARTS = ['params', 'query', 'body', 'headers'];

function formatDetails(error) {
  return error.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message.replace(/["']/g, ''),
    type: detail.type,
  }));
}

function validate(schema, options = {}) {
  return (req, res, next) => {
    const errors = [];

    for (const part of PARTS) {
      const partSchema = schema[part];
      if (!partSchema) continue;

      const { value, error } = partSchema.validate(req[part], { ...OPTIONS, ...options });

      if (error) {
        errors.push(...formatDetails(error).map((d) => ({ ...d, in: part })));
        continue;
      }

      if (part === 'query') {
        // Express 5 exposes req.query as a read-only getter — redefine it.
        Object.defineProperty(req, 'query', { value, writable: true, configurable: true });
        req.validatedQuery = value;
      } else if (part === 'headers') {
        req.validatedHeaders = value;
      } else {
        req[part] = value;
      }
    }

    if (errors.length) {
      return next(ApiError.validation('The submitted data is not valid', errors));
    }
    return next();
  };
}

module.exports = validate;
