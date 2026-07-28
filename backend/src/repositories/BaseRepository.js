/**
 * Thin data-access base class.
 *
 * Repositories own SQL. Services own business rules. Controllers own HTTP.
 * Every method accepts an optional `trx` so a service can compose several
 * repositories inside one transaction.
 */
const { db } = require('../database/connection');
const { pruneUndefined } = require('../utils/helpers');

class BaseRepository {
  /**
   * @param {string} table
   * @param {{ softDelete?: boolean, primaryKey?: string }} [options]
   */
  constructor(table, { softDelete = false, primaryKey = 'id' } = {}) {
    this.table = table;
    this.softDelete = softDelete;
    this.primaryKey = primaryKey;
  }

  /** @param {import('knex').Knex.Transaction} [trx] */
  query(trx) {
    const builder = (trx || db)(this.table);
    return this.softDelete ? builder.whereNull(`${this.table}.deleted_at`) : builder;
  }

  /** Includes soft-deleted rows — for admin/restore flows. */
  queryWithTrashed(trx) {
    return (trx || db)(this.table);
  }

  findById(id, trx) {
    return this.query(trx).where(`${this.table}.${this.primaryKey}`, id).first();
  }

  findOne(where, trx) {
    return this.query(trx).where(where).first();
  }

  findMany(where = {}, trx) {
    return this.query(trx).where(where);
  }

  async exists(where, trx) {
    const row = await this.query(trx).where(where).select(this.primaryKey).first();
    return Boolean(row);
  }

  async count(where = {}, trx) {
    const [{ total }] = await this.query(trx).where(where).count({ total: `${this.table}.${this.primaryKey}` });
    return Number(total) || 0;
  }

  /** @returns {Promise<number>} inserted id (MySQL returns the first id for bulk inserts). */
  async create(data, trx) {
    const [id] = await (trx || db)(this.table).insert(pruneUndefined(data));
    return id;
  }

  async createMany(rows, trx) {
    if (!rows.length) return [];
    return (trx || db)(this.table).insert(rows.map(pruneUndefined));
  }

  /** Inserts then re-reads, so callers get the row with DB defaults applied. */
  async createAndReturn(data, trx) {
    const id = await this.create(data, trx);
    return this.findById(id, trx);
  }

  async update(id, data, trx) {
    const payload = pruneUndefined(data);
    if (!Object.keys(payload).length) return 0;
    return (trx || db)(this.table).where(this.primaryKey, id).update(payload);
  }

  async updateWhere(where, data, trx) {
    const payload = pruneUndefined(data);
    if (!Object.keys(payload).length) return 0;
    return (trx || db)(this.table).where(where).update(payload);
  }

  async updateAndReturn(id, data, trx) {
    await this.update(id, data, trx);
    return this.findById(id, trx);
  }

  /** Soft-deletes when the repository is configured for it, otherwise hard-deletes. */
  async delete(id, trx) {
    if (this.softDelete) {
      return (trx || db)(this.table).where(this.primaryKey, id).update({ deleted_at: db.fn.now() });
    }
    return (trx || db)(this.table).where(this.primaryKey, id).del();
  }

  async forceDelete(id, trx) {
    return (trx || db)(this.table).where(this.primaryKey, id).del();
  }

  async restore(id, trx) {
    return (trx || db)(this.table).where(this.primaryKey, id).update({ deleted_at: null });
  }

  async increment(id, column, amount = 1, trx) {
    return (trx || db)(this.table).where(this.primaryKey, id).increment(column, amount);
  }

  async decrement(id, column, amount = 1, trx) {
    return (trx || db)(this.table).where(this.primaryKey, id).decrement(column, amount);
  }

  /** Runs a callback inside a transaction, reusing an outer one when supplied. */
  transaction(callback, trx) {
    return trx ? callback(trx) : db.transaction(callback);
  }
}

module.exports = BaseRepository;
