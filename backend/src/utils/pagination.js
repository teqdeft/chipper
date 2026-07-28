/**
 * Pagination helpers shared by every list endpoint.
 */
const { PAGINATION } = require('../config/constants');

/**
 * Normalises `page` / `limit` query params into safe integers plus an offset.
 * @param {object} query
 * @returns {{ page:number, limit:number, offset:number }}
 */
function getPagination(query = {}) {
  const rawPage = Number.parseInt(query.page, 10);
  const rawLimit = Number.parseInt(query.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : PAGINATION.DEFAULT_PAGE;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, PAGINATION.MAX_LIMIT)
      : PAGINATION.DEFAULT_LIMIT;

  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Builds the `meta.pagination` block returned with every list response.
 * @param {{ total:number, page:number, limit:number }} args
 */
function buildPaginationMeta({ total, page, limit }) {
  const totalItems = Number(total) || 0;
  const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

/**
 * Applies a whitelist-checked ORDER BY to a Knex query builder.
 * @param {import('knex').Knex.QueryBuilder} qb
 * @param {object} query request query ({ sortBy, sortOrder })
 * @param {string[]} allowed whitelisted column names
 * @param {{ column:string, order:string }} fallback
 */
function applySorting(qb, query = {}, allowed = [], fallback = { column: 'created_at', order: 'desc' }) {
  const requested = String(query.sortBy || '').trim();
  const column = allowed.includes(requested) ? requested : fallback.column;
  const order = String(query.sortOrder || '').toLowerCase() === 'asc' ? 'asc' : fallback.order;
  return qb.orderBy(column, order);
}

/**
 * Runs a count + page query against the same builder and returns a list envelope.
 * `countColumn` must be table-qualified when the query joins.
 */
async function paginateQuery(baseQuery, { page, limit }, countColumn = '*') {
  const countQuery = baseQuery.clone().clearSelect().clearOrder();
  // clearGroup is only available when a group by exists; guard for older builders.
  if (typeof countQuery.clearGroup === 'function') countQuery.clearGroup();

  const [{ total }] = await countQuery.count({ total: countColumn });
  const items = await baseQuery.limit(limit).offset((page - 1) * limit);

  return { items, pagination: buildPaginationMeta({ total, page, limit }) };
}

module.exports = { getPagination, buildPaginationMeta, applySorting, paginateQuery };
