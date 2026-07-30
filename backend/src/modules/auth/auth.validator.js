const Joi = require('joi');
const c = require('../../validators/common.validator');
const { ACCOUNT_TYPES } = require('../../config/constants');

module.exports = {
  register: {
    body: Joi.object({
      name: Joi.string().trim().min(2).max(120).required(),
      email: c.email.required(),
      password: c.password.required(),
      confirmPassword: Joi.string().valid(Joi.ref('password')).messages({
        'any.only': 'Passwords do not match',
      }),
      handle: c.handle.optional(),
      affiliation: Joi.string().trim().max(190).allow('', null),
      // Who is signing up (student / researcher / institution). Profile info only;
      // the community role is always assigned server-side, never client-chosen.
      accountType: Joi.string()
        .valid(...ACCOUNT_TYPES)
        .required(),
      country: Joi.string().trim().max(80).allow('', null),
      newsletter: Joi.boolean().default(false),
      acceptTerms: Joi.boolean().valid(true).required().messages({
        'any.only': 'You must accept the terms and conditions',
      }),
    }),
  },

  login: {
    body: Joi.object({
      email: c.email.required(),
      password: Joi.string().required(),
      remember: Joi.boolean().default(false),
    }),
  },

  refresh: {
    body: Joi.object({
      refreshToken: Joi.string().allow('', null),
    }),
  },

  logout: {
    body: Joi.object({
      refreshToken: Joi.string().allow('', null),
      allDevices: Joi.boolean().default(false),
    }),
  },

  // Either the magic-link token, or the email + the OTP typed by the user.
  verifyEmail: {
    body: Joi.object({
      token: Joi.string().trim().min(20).max(200),
      email: c.email,
      otp: Joi.string()
        .trim()
        .pattern(/^\d{4,10}$/)
        .messages({ 'string.pattern.base': 'must be the numeric code from the email' }),
    })
      .or('token', 'otp')
      .with('otp', 'email')
      .messages({ 'object.missing': 'Provide either a verification link token or your email and code' }),
  },

  resendVerification: {
    body: Joi.object({
      email: c.email.required(),
    }),
  },

  forgotPassword: {
    body: Joi.object({
      email: c.email.required(),
    }),
  },

  resetPassword: {
    body: Joi.object({
      token: Joi.string().trim().min(20).max(200),
      email: c.email,
      otp: Joi.string()
        .trim()
        .pattern(/^\d{4,10}$/)
        .messages({ 'string.pattern.base': 'must be the numeric code from the email' }),
      password: c.password.required(),
      confirmPassword: Joi.string().valid(Joi.ref('password')).messages({
        'any.only': 'Passwords do not match',
      }),
    })
      .or('token', 'otp')
      .with('otp', 'email')
      .messages({ 'object.missing': 'Provide either a reset link token or your email and code' }),
  },

  changePassword: {
    body: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: c.password.required(),
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).messages({
        'any.only': 'Passwords do not match',
      }),
    }),
  },

  revokeSession: {
    params: Joi.object({ sessionId: c.uuid.required() }),
  },
};
