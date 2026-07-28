/**
 * Demo designs + forum threads mirroring the frontend mock data, so the UI can be
 * pointed at the API without losing its example content. Development only.
 */
const config = require('../../config');
const { uuid, slugify } = require('../../utils/helpers');
const { DESIGN_STATUS, PUBLISH_AS, TOPIC_TYPE, TOPIC_STATUS } = require('../../config/constants');

const DESIGNS = [
  {
    title: 'Alveolar barrier · dual channel',
    summary: 'Two-channel alveolar barrier model. Open for inspection, citation and reuse.',
    description:
      'This open design includes fabrication-ready geometry, inlet/outlet adapters, and assembly notes suitable for soft lithography workflows. All dimensions are in millimetres unless otherwise stated. Intended for barrier integrity and co-culture studies on lung models.',
    ownerHandle: 'm.vanderberg',
    componentType: 'organ-chip',
    resourceType: '3d-model',
    organs: ['lung'],
    material: 'pdms',
    fabrication: 'soft-lithography',
    license: 'CC BY 4.0',
    status: DESIGN_STATUS.PUBLISHED,
    version: 'v1.2',
    tags: ['organ-chip', 'barrier', 'ISO 22916'],
    iso: true,
    downloads: 128,
    stars: 34,
    typeSpecific: { model_type: 'ali', channel_count: 2, membrane: 'PET, 3 µm pores', culture_area: 16.8 },
    operating: { flow_min: 0.5, flow_max: 2.0, pressure_max: 5, temp_min: 36.5, temp_max: 37.5 },
    clip: 'CLIP-ORG-LUNG-2CH-PDMS',
    credits: [{ name: 'Biomicrosystems', affiliation: 'University of Twente', role: 'Design & fabrication' }],
    works: [{ title: 'Alveolar barrier integrity under cyclic strain', authors: 'van der Berg M. et al.', publication: 'Lab on a Chip', year: 2026, doi: '10.1039/example' }],
    publishedAt: '2026-06-02 10:00:00',
  },
  {
    title: 'Hepatic perfusion cassette',
    summary: 'Low-dead-volume cassette for primary hepatocyte runs.',
    description: 'A perfusion cassette designed to minimise dead volume for primary hepatocyte culture under continuous flow.',
    ownerHandle: 'a.chen',
    componentType: 'organ-chip',
    resourceType: '3d-model',
    organs: ['liver'],
    material: 'coc',
    fabrication: 'micromachining',
    license: 'MIT',
    status: DESIGN_STATUS.PUBLISHED,
    version: 'v0.9',
    tags: ['perfusion', 'cassette'],
    iso: false,
    downloads: 56,
    stars: 18,
    typeSpecific: { model_type: 'monolayer', channel_count: 1 },
    operating: { flow_min: 1.0, flow_max: 10.0, temp_min: 37, temp_max: 37 },
    credits: [{ name: 'A. Chen', affiliation: 'TNO', role: 'Design' }],
    publishedAt: '2026-05-18 10:00:00',
  },
  {
    title: 'Intestinal villi scaffold',
    summary: '3D-printed scaffold approximating villus geometry for co-culture.',
    description: 'Scaffold geometry approximating intestinal villi, printed via SLA for epithelial co-culture studies.',
    ownerHandle: 'm.vanderberg',
    componentType: 'other-microfluidic-chip',
    resourceType: '3d-model',
    organs: ['gut'],
    material: 'resin',
    fabrication: 'sla',
    license: 'CC BY-SA 4.0',
    status: DESIGN_STATUS.PENDING,
    version: 'v1.0',
    tags: ['scaffold', 'co-culture'],
    iso: true,
    downloads: 0,
    stars: 4,
    typeSpecific: { application: 'Epithelial co-culture', channel_count: 2 },
    operating: {},
    publishedAt: null,
  },
  {
    title: 'Proximal tubule chip',
    summary: 'Single-channel proximal tubule model with accessible ports.',
    description: 'Single-channel proximal tubule model with ISO 22916 compliant port spacing and an accessible clamping zone.',
    ownerHandle: 'a.chen',
    componentType: 'organ-chip',
    resourceType: '3d-model',
    organs: ['kidney'],
    material: 'pdms',
    fabrication: 'soft-lithography',
    license: 'GPL-3.0',
    status: DESIGN_STATUS.PUBLISHED,
    version: 'v2.0',
    tags: ['tubule', 'ports'],
    iso: true,
    downloads: 91,
    stars: 27,
    typeSpecific: { model_type: 'organ-on-chip', channel_count: 1 },
    operating: { flow_min: 0.2, flow_max: 5.0, pressure_max: 8, temp_min: 37, temp_max: 37 },
    clip: 'CLIP-ORG-KID-1CH-PDMS',
    credits: [{ name: 'A. Chen', affiliation: 'TNO', role: 'Design' }],
    publishedAt: '2026-04-22 10:00:00',
  },
];

const THREADS = [
  {
    title: 'Best practice for citing a Chipper design in a paper?',
    category: 'metadata-licences',
    authorHandle: 'a.chen',
    type: TOPIC_TYPE.QUESTION,
    status: TOPIC_STATUS.SOLVED,
    pinned: true,
    views: 340,
    posts: [
      { authorHandle: 'a.chen', body: 'Looking for a citation format that includes version and licence. Does Chipper export a BibTeX entry or should we compose it manually from the design page?', votes: 4 },
      { authorHandle: 'm.vanderberg', body: 'Use the "Cite this design" block on the detail page — it includes title, version, DOI placeholder, licence and uploader. For papers I append the access date in brackets.', votes: 7, accepted: true },
    ],
  },
  {
    title: 'PDMS bonding failures after plasma — checklist?',
    category: 'fabrication',
    authorHandle: 'm.vanderberg',
    type: TOPIC_TYPE.QUESTION,
    status: TOPIC_STATUS.OPEN,
    views: 210,
    posts: [
      { authorHandle: 'm.vanderberg', body: 'Surface looks clean but bond strength is inconsistent across batches. What does your plasma checklist look like?', votes: 2 },
      { authorHandle: 'a.chen', body: 'Check the time between treatment and contact — anything over 60 seconds costs us adhesion. We also bake at 80 °C for 2 h afterwards.', votes: 5 },
    ],
  },
  {
    title: 'How do I mark a design ISO 22916 compliant?',
    category: 'getting-started',
    authorHandle: 'a.chen',
    type: TOPIC_TYPE.QUESTION,
    status: TOPIC_STATUS.OPEN,
    views: 156,
    posts: [
      { authorHandle: 'a.chen', body: 'Is the checkbox enough or do I need supporting docs?', votes: 1 },
    ],
  },
];

exports.seed = async function seed(knex) {
  if (config.isProduction) return;

  const [users, componentTypes, resourceTypes, organs, materials, fabrications, licenses, categories] =
    await Promise.all([
      knex('users').select('id', 'handle'),
      knex('component_types').select('id', 'slug'),
      knex('resource_types').select('id', 'slug'),
      knex('organs').select('id', 'slug'),
      knex('materials').select('id', 'slug'),
      knex('fabrication_methods').select('id', 'slug'),
      knex('licenses').select('id', 'code'),
      knex('forum_categories').select('id', 'slug'),
    ]);

  const byKey = (rows, key) => Object.fromEntries(rows.map((r) => [r[key], r.id]));
  const userId = byKey(users, 'handle');
  const componentTypeId = byKey(componentTypes, 'slug');
  const resourceTypeId = byKey(resourceTypes, 'slug');
  const organId = byKey(organs, 'slug');
  const materialId = byKey(materials, 'slug');
  const fabricationId = byKey(fabrications, 'slug');
  const licenseId = byKey(licenses, 'code');
  const categoryId = byKey(categories, 'slug');

  // ── Designs ────────────────────────────────────────────────────────────
  for (const item of DESIGNS) {
    const slug = slugify(item.title);
    const existing = await knex('designs').where({ slug }).first();
    if (existing) continue;

    const ownerId = userId[item.ownerHandle];
    if (!ownerId) continue;

    await knex.transaction(async (trx) => {
      const [designId] = await trx('designs').insert({
        uuid: uuid(),
        slug,
        owner_id: ownerId,
        component_type_id: componentTypeId[item.componentType] || null,
        resource_type_id: resourceTypeId[item.resourceType] || null,
        title: item.title,
        summary: item.summary,
        status: item.status,
        publish_as: PUBLISH_AS.PERSON_FROM_INSTITUTE,
        institute_name: null,
        is_iso22916: item.iso,
        download_count: item.downloads,
        star_count: item.stars,
        published_at: item.publishedAt,
      });

      const [versionId] = await trx('design_versions').insert({
        design_id: designId,
        version: item.version,
        version_number: 1,
        version_note: 'Initial import',
        status: item.status,
        title: item.title,
        summary: item.summary,
        description: item.description,
        component_type_id: componentTypeId[item.componentType] || null,
        resource_type_id: resourceTypeId[item.resourceType] || null,
        license_id: licenseId[item.license] || null,
        how_to_cite: `${item.title} (${item.version}), Chipper, ${item.license}.`,
        tested_material_id: materialId[item.material] || null,
        tested_fabrication_method_id: fabricationId[item.fabrication] || null,
        clip_string: item.clip || null,
        operating_flow_min: item.operating.flow_min ?? null,
        operating_flow_max: item.operating.flow_max ?? null,
        operating_pressure_max: item.operating.pressure_max ?? null,
        operating_temp_min: item.operating.temp_min ?? null,
        operating_temp_max: item.operating.temp_max ?? null,
        is_iso22916: item.iso,
        type_specific: JSON.stringify(item.typeSpecific || {}),
        created_by: ownerId,
        download_count: item.downloads,
        published_at: item.publishedAt,
      });

      await trx('designs').where({ id: designId }).update({ current_version_id: versionId });

      if (item.organs?.length) {
        await trx('design_version_organs').insert(
          item.organs.filter((o) => organId[o]).map((o) => ({ design_version_id: versionId, organ_id: organId[o] })),
        );
      }

      for (const [index, tagName] of (item.tags || []).entries()) {
        const tagSlug = slugify(tagName);
        let tag = await trx('tags').where({ slug: tagSlug }).first();
        if (!tag) {
          const [tagId] = await trx('tags').insert({ slug: tagSlug, name: tagName, usage_count: 0 });
          tag = { id: tagId };
        }
        await trx('design_tags').insert({ design_id: designId, tag_id: tag.id });
        await trx('tags').where({ id: tag.id }).increment('usage_count', 1);
        void index;
      }

      if (item.credits?.length) {
        await trx('design_credits').insert(
          item.credits.map((c, i) => ({ design_version_id: versionId, ...c, sort_order: i })),
        );
      }
      if (item.works?.length) {
        await trx('design_published_works').insert(
          item.works.map((w, i) => ({ design_version_id: versionId, ...w, sort_order: i })),
        );
      }

      await trx('users').where({ id: ownerId }).increment('upload_count', 1);
    });
  }

  // ── Forum threads ──────────────────────────────────────────────────────
  for (const thread of THREADS) {
    const slug = slugify(thread.title);
    const existing = await knex('forum_topics').where({ slug }).first();
    if (existing) continue;

    const authorId = userId[thread.authorHandle];
    const catId = categoryId[thread.category];
    if (!authorId || !catId) continue;

    await knex.transaction(async (trx) => {
      const [topicId] = await trx('forum_topics').insert({
        uuid: uuid(),
        slug,
        category_id: catId,
        user_id: authorId,
        title: thread.title,
        excerpt: thread.posts[0].body.slice(0, 240),
        type: thread.type,
        status: thread.status,
        is_pinned: Boolean(thread.pinned),
        view_count: thread.views,
        reply_count: Math.max(thread.posts.length - 1, 0),
      });

      let lastPostId = null;
      let acceptedPostId = null;

      for (const [index, post] of thread.posts.entries()) {
        const [postId] = await trx('forum_posts').insert({
          topic_id: topicId,
          user_id: userId[post.authorHandle] || authorId,
          body: post.body,
          is_first_post: index === 0,
          is_accepted: Boolean(post.accepted),
          vote_score: post.votes || 0,
          upvotes: Math.max(post.votes || 0, 0),
        });
        lastPostId = postId;
        if (post.accepted) acceptedPostId = postId;
      }

      await trx('forum_topics').where({ id: topicId }).update({
        last_post_id: lastPostId,
        last_post_user_id: userId[thread.posts[thread.posts.length - 1].authorHandle] || authorId,
        last_post_at: knex.fn.now(),
        accepted_post_id: acceptedPostId,
      });

      await trx('forum_categories')
        .where({ id: catId })
        .increment('topic_count', 1)
        .increment('post_count', thread.posts.length);
    });
  }
};
