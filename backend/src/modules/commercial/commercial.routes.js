/**
 * /api/v1/commercial — SCR-039 seller dashboard (CHIP-007, CHIP-027, CHIP-028).
 *
 * The screen inventory marks this module "Open / Later": it is gated on the
 * client's answer to Q2. The schema and endpoints ship now behind
 * FEATURE_COMMERCIAL so nothing is exposed until that decision lands — flip the
 * flag to turn the module on without a code change.
 */
const express = require('express');
const Joi = require('joi');
const config = require('../../config');
const { db } = require('../../database/connection');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const validate = require('../../middlewares/validate');
const { authenticate, optionalAuthenticate } = require('../../middlewares/authenticate');
const { can } = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../config/permissions');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { uuid, slugify } = require('../../utils/helpers');
const c = require('../../validators/common.validator');

const router = express.Router();

/** Returns 404 (not 403) while the module is off, so it is not discoverable. */
const featureGate = (req, res, next) => {
  if (!config.features.commercial) {
    return next(
      ApiError.notFound('The commercial module is not enabled on this deployment', {
        code: 'FEATURE_DISABLED',
      }),
    );
  }
  next();
};

router.use(featureGate);

async function requireSeller(userId) {
  const seller = await db('seller_profiles').where({ user_id: userId }).first();
  if (!seller) throw ApiError.forbidden('Create a seller profile first', { code: 'NO_SELLER_PROFILE' });
  if (seller.status !== 'active') {
    throw ApiError.forbidden('Your seller profile is awaiting approval', { code: 'SELLER_INACTIVE' });
  }
  return seller;
}

// ── Public listings ───────────────────────────────────────────────────────
router.get(
  '/listings',
  optionalAuthenticate,
  validate({ query: Joi.object({ ...c.pagination, search: c.search, designId: c.id }) }),
  asyncHandler(async (req, res) => {
    const { page, limit } = getPagination(req.query);
    const base = db('listings')
      .join('seller_profiles', 'listings.seller_id', 'seller_profiles.id')
      .leftJoin('designs', 'listings.design_id', 'designs.id')
      .where('listings.status', 'active')
      .select(
        'listings.*',
        'seller_profiles.company_name',
        'seller_profiles.slug as seller_slug',
        'seller_profiles.is_verified',
        'designs.slug as design_slug',
        'designs.title as design_title',
      )
      .orderBy('listings.created_at', 'desc');

    if (req.query.designId) base.where('listings.design_id', req.query.designId);
    if (req.query.search) base.where('listings.title', 'like', `%${req.query.search}%`);

    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'listings.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    return ApiResponse.paginated(res, {
      items: rows.map((r) => ({
        id: r.uuid,
        title: r.title,
        description: r.description,
        price: r.price !== null ? Number(r.price) : null,
        currency: r.currency,
        ctaType: r.cta_type,
        ctaUrl: r.cta_url,
        leadTime: r.lead_time,
        seller: { name: r.company_name, slug: r.seller_slug, verified: Boolean(r.is_verified) },
        design: r.design_slug ? { slug: r.design_slug, title: r.design_title } : null,
      })),
      pagination: buildPaginationMeta({ total, page, limit }),
      message: 'Listings',
    });
  }),
);

/** Click tracking for the buy/contact button. */
router.post(
  '/listings/:uuid/events',
  optionalAuthenticate,
  validate({
    params: Joi.object({ uuid: c.uuid.required() }),
    body: Joi.object({ type: Joi.string().valid('view', 'click', 'contact').required() }),
  }),
  asyncHandler(async (req, res) => {
    const listing = await db('listings').where({ uuid: req.params.uuid }).first();
    if (!listing) throw ApiError.notFound('Listing not found');

    await db.transaction(async (trx) => {
      await trx('listing_events').insert({
        listing_id: listing.id,
        type: req.body.type,
        user_id: req.user?.id || null,
      });
      if (req.body.type === 'view') await trx('listings').where({ id: listing.id }).increment('view_count', 1);
      if (req.body.type === 'click') await trx('listings').where({ id: listing.id }).increment('click_count', 1);
    });

    return ApiResponse.success(res, { data: { recorded: true }, message: 'Event recorded' });
  }),
);

// ── Seller dashboard (SCR-039) ────────────────────────────────────────────
router.use(authenticate);

router.post(
  '/profile',
  validate({
    body: Joi.object({
      companyName: Joi.string().trim().min(2).max(190).required(),
      description: Joi.string().trim().max(5000).allow('', null),
      website: Joi.string().uri().max(255).allow('', null),
      contactEmail: c.email.allow('', null),
      contactPhone: Joi.string().trim().max(40).allow('', null),
      vatNumber: Joi.string().trim().max(60).allow('', null),
    }),
  }),
  asyncHandler(async (req, res) => {
    const existing = await db('seller_profiles').where({ user_id: req.user.id }).first();
    const payload = {
      company_name: req.body.companyName,
      description: req.body.description || null,
      website: req.body.website || null,
      contact_email: req.body.contactEmail || null,
      contact_phone: req.body.contactPhone || null,
      vat_number: req.body.vatNumber || null,
    };

    if (existing) {
      await db('seller_profiles').where({ id: existing.id }).update(payload);
    } else {
      await db('seller_profiles').insert({
        ...payload,
        user_id: req.user.id,
        slug: slugify(req.body.companyName),
      });
    }

    return ApiResponse.success(res, {
      data: { profile: await db('seller_profiles').where({ user_id: req.user.id }).first() },
      message: existing ? 'Seller profile updated' : 'Seller profile submitted for approval',
    });
  }),
);

router.get(
  '/dashboard',
  can(PERMISSIONS.LISTING_MANAGE),
  asyncHandler(async (req, res) => {
    const seller = await requireSeller(req.user.id);
    const [listings, totals] = await Promise.all([
      db('listings').where({ seller_id: seller.id }).orderBy('created_at', 'desc').select('*'),
      db('listings')
        .where({ seller_id: seller.id })
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COALESCE(SUM(view_count), 0) as views'),
          db.raw('COALESCE(SUM(click_count), 0) as clicks'),
        )
        .first(),
    ]);

    return ApiResponse.success(res, {
      data: {
        seller: { name: seller.company_name, verified: Boolean(seller.is_verified), status: seller.status },
        stats: {
          listings: Number(totals?.total) || 0,
          views: Number(totals?.views) || 0,
          clicks: Number(totals?.clicks) || 0,
        },
        listings,
      },
      message: 'Seller dashboard',
    });
  }),
);

router.post(
  '/listings',
  can(PERMISSIONS.LISTING_MANAGE),
  validate({
    body: Joi.object({
      title: Joi.string().trim().min(3).max(200).required(),
      description: Joi.string().trim().max(5000).allow('', null),
      designId: c.id.allow(null),
      price: Joi.number().min(0).allow(null),
      currency: Joi.string().length(3).uppercase().default('EUR'),
      ctaType: Joi.string().valid('buy', 'contact', 'quote').default('contact'),
      ctaUrl: Joi.string().uri().max(500).allow('', null),
      leadTime: Joi.string().trim().max(80).allow('', null),
      status: Joi.string().valid('draft', 'active', 'paused', 'archived').default('draft'),
    }),
  }),
  asyncHandler(async (req, res) => {
    const seller = await requireSeller(req.user.id);
    const [id] = await db('listings').insert({
      uuid: uuid(),
      seller_id: seller.id,
      design_id: req.body.designId || null,
      title: req.body.title,
      description: req.body.description || null,
      price: req.body.price ?? null,
      currency: req.body.currency,
      cta_type: req.body.ctaType,
      cta_url: req.body.ctaUrl || null,
      lead_time: req.body.leadTime || null,
      status: req.body.status,
    });

    return ApiResponse.created(res, {
      data: { listing: await db('listings').where({ id }).first() },
      message: 'Listing created',
    });
  }),
);

router.patch(
  '/listings/:uuid',
  can(PERMISSIONS.LISTING_MANAGE),
  validate({
    params: Joi.object({ uuid: c.uuid.required() }),
    body: Joi.object({
      title: Joi.string().trim().min(3).max(200),
      description: Joi.string().trim().max(5000).allow('', null),
      price: Joi.number().min(0).allow(null),
      ctaType: Joi.string().valid('buy', 'contact', 'quote'),
      ctaUrl: Joi.string().uri().max(500).allow('', null),
      leadTime: Joi.string().trim().max(80).allow('', null),
      status: Joi.string().valid('draft', 'active', 'paused', 'archived'),
    }).min(1),
  }),
  asyncHandler(async (req, res) => {
    const seller = await requireSeller(req.user.id);
    const listing = await db('listings').where({ uuid: req.params.uuid, seller_id: seller.id }).first();
    if (!listing) throw ApiError.notFound('Listing not found');

    const updates = {
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      cta_type: req.body.ctaType,
      cta_url: req.body.ctaUrl,
      lead_time: req.body.leadTime,
      status: req.body.status,
    };
    await db('listings')
      .where({ id: listing.id })
      .update(Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)));

    return ApiResponse.success(res, {
      data: { listing: await db('listings').where({ id: listing.id }).first() },
      message: 'Listing updated',
    });
  }),
);

router.delete(
  '/listings/:uuid',
  can(PERMISSIONS.LISTING_MANAGE),
  validate({ params: Joi.object({ uuid: c.uuid.required() }) }),
  asyncHandler(async (req, res) => {
    const seller = await requireSeller(req.user.id);
    const deleted = await db('listings').where({ uuid: req.params.uuid, seller_id: seller.id }).del();
    if (!deleted) throw ApiError.notFound('Listing not found');
    return ApiResponse.success(res, { data: { deleted: true }, message: 'Listing removed' });
  }),
);

module.exports = router;
