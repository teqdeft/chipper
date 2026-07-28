/**
 * /api/v1/taxonomies — option lists for browse filters and the upload wizard.
 * Public: the client needs these before a user signs in.
 */
const express = require('express');
const Joi = require('joi');
const controller = require('./taxonomy.controller');
const validate = require('../../middlewares/validate');

const router = express.Router();

router.get('/', controller.all);
router.get('/component-types', controller.componentTypes);
router.get(
  '/component-types/:componentType/fields',
  validate({ params: Joi.object({ componentType: Joi.string().trim().max(64).required() }) }),
  controller.componentTypeFields,
);
router.get('/resource-types', controller.resourceTypes);
router.get('/organs', controller.organs);
router.get('/materials', controller.materials);
router.get('/fabrication-methods', controller.fabricationMethods);
router.get('/model-types', controller.modelTypes);
router.get('/licenses', controller.licenses);
router.get(
  '/working-principles',
  validate({ query: Joi.object({ componentType: Joi.string().trim().max(64).allow('') }) }),
  controller.workingPrinciples,
);
router.get(
  '/tags',
  validate({ query: Joi.object({ limit: Joi.number().integer().min(1).max(200).default(40) }) }),
  controller.tags,
);

module.exports = router;
