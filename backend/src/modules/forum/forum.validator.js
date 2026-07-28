const Joi = require('joi');
const c = require('../../validators/common.validator');
const { TOPIC_TYPE, TOPIC_STATUS } = require('../../config/constants');

const identifier = Joi.string().trim().max(220).required();

const listQuery = Joi.object({
  ...c.pagination,
  category: Joi.string().trim().max(80),
  type: Joi.string().valid(...Object.values(TOPIC_TYPE)),
  status: Joi.string().valid(...Object.values(TOPIC_STATUS)),
  search: c.search,
  author: c.handle,
  tag: c.csvArray,
  unanswered: Joi.boolean(),
  solved: Joi.boolean(),
  designId: c.id,
  sort: Joi.string().valid('active', 'newest', 'views', 'replies').default('active'),
});

module.exports = {
  listTopics: { query: listQuery },

  search: {
    query: listQuery.keys({ q: Joi.string().trim().max(200) }),
  },

  categoryTopics: {
    params: Joi.object({ category: c.slug.required() }),
    query: listQuery,
  },

  getTopic: {
    params: Joi.object({ identifier }),
    query: Joi.object({ ...c.pagination }),
  },

  createTopic: {
    body: Joi.object({
      title: Joi.string().trim().min(5).max(250).required(),
      body: Joi.string().trim().min(10).max(50000).required(),
      category: Joi.string().trim().max(80).required(),
      type: Joi.string().valid(...Object.values(TOPIC_TYPE)).default('discussion'),
      tags: Joi.array().items(Joi.string().trim().max(60)).max(8),
      designId: c.id.allow(null),
    }),
  },

  updateTopic: {
    params: Joi.object({ identifier }),
    body: Joi.object({
      title: Joi.string().trim().min(5).max(250),
      type: Joi.string().valid(...Object.values(TOPIC_TYPE)),
      tags: Joi.array().items(Joi.string().trim().max(60)).max(8),
    }).min(1),
  },

  deleteTopic: { params: Joi.object({ identifier }) },

  createPost: {
    params: Joi.object({ identifier }),
    body: Joi.object({
      body: Joi.string().trim().min(2).max(50000).required(),
      parentId: c.id.allow(null),
    }),
  },

  updatePost: {
    params: Joi.object({ postId: c.id.required() }),
    body: Joi.object({ body: Joi.string().trim().min(2).max(50000).required() }),
  },

  deletePost: { params: Joi.object({ postId: c.id.required() }) },

  vote: {
    params: Joi.object({ postId: c.id.required() }),
    body: Joi.object({ value: Joi.number().valid(1, -1).required() }),
  },

  acceptAnswer: {
    params: Joi.object({ identifier, postId: c.id.required() }),
  },

  subscribe: { params: Joi.object({ identifier }) },

  moderateTopic: {
    params: Joi.object({ identifier }),
    body: Joi.object({
      pinned: Joi.boolean(),
      status: Joi.string().valid(...Object.values(TOPIC_STATUS)),
      category: Joi.string().trim().max(80),
      note: Joi.string().trim().max(500).allow('', null),
    }).min(1),
  },
};
