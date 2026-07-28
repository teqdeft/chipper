/**
 * Append-only audit trail for privileged and security-relevant actions.
 * Writing an audit row must never break the request that triggered it, so all
 * failures are swallowed and logged.
 */
const { db } = require('../database/connection');
const logger = require('../config/logger');

const auditService = {
  /**
   * @param {object} entry
   * @param {number} [entry.userId] actor
   * @param {string} entry.action dotted action name, e.g. 'design.publish'
   * @param {string} [entry.entityType]
   * @param {number} [entry.entityId]
   * @param {object} [entry.changes] { before, after }
   * @param {{ ip?:string, userAgent?:string, requestId?:string }} [entry.context]
   */
  async log({ userId, action, entityType, entityId, changes, context = {} }) {
    try {
      await db('audit_logs').insert({
        user_id: userId || null,
        action,
        entity_type: entityType || null,
        entity_id: entityId || null,
        changes: changes ? JSON.stringify(changes) : null,
        ip_address: context.ip || null,
        user_agent: (context.userAgent || '').slice(0, 255) || null,
        request_id: context.requestId || null,
      });
    } catch (err) {
      logger.warn(`Audit log failed for "${action}": ${err.message}`);
    }
  },

  /** Reads the trail for the admin UI. */
  query({ userId, action, entityType, entityId } = {}) {
    const q = db('audit_logs')
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .select(
        'audit_logs.*',
        'users.name as actor_name',
        'users.handle as actor_handle',
      )
      .orderBy('audit_logs.created_at', 'desc');

    if (userId) q.where('audit_logs.user_id', userId);
    if (action) q.where('audit_logs.action', 'like', `${action}%`);
    if (entityType) q.where('audit_logs.entity_type', entityType);
    if (entityId) q.where('audit_logs.entity_id', entityId);
    return q;
  },
};

/** Convenience: builds the context block from an Express request. */
auditService.contextFrom = (req) => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  requestId: req.id,
});

module.exports = auditService;
