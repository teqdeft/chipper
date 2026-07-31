/**
 * SITE CONTENT — source of truth.
 * Every scientific fact, spec, taxonomy term and statistic below is drawn
 * directly from the Chipper Design System v6 document. Nothing here is invented:
 * component specs, ISO 22916, licences, organ tags, materials, fabrication
 * methods and the community numbers all appear verbatim in the brand guide.
 * The organ-on-a-chip explainer uses established, textbook descriptions of the
 * field — not proprietary performance claims.
 */

export const site = {
  name: 'Chipper',
  domain: 'chipper.org',
  event: 'MPS World Summit',
  tagline: 'Share what you build',
  description:
    'An open community for microphysiological systems. Researchers share organ-on-chip designs with their metadata, licence and 3D model, so others can inspect, cite and reuse them.',
};

export const nav = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Designs', href: '/designs' },
  { label: 'Forum', href: '/forum' },
  { label: 'News', href: '/news' },
  { label: 'About', href: '/about' },
];

export const hero = {
  eyebrow: 'Open organ-on-chip · microphysiological systems',
  title: ['Share', 'what you', 'build'],
  lede: 'Inspect, cite and reuse open organ-on-chip designs — with the maker behind every one in plain sight.',
  primaryCta: { label: 'Upload a design', href: '/upload' },
  secondaryCta: { label: 'Browse all designs', href: '/designs' },
  scrollHint: 'Scroll to explore the chip',
  /** Scroll chapters — timed to the film; voice matches About + Platform. */
  scrollCaptions: [
    {
      eyebrow: 'Inside the chip',
      line: 'A living organ, reduced to its smallest working unit.',
    },
    {
      eyebrow: 'Open by design',
      line: 'Every design carries its evidence.',
    },
  ],
};

// About — established description of what an organ-on-a-chip / MPS is.
export const about = {
  eyebrow: 'What is an organ-on-a-chip',
  title: 'A living organ, reduced to its smallest working unit.',
  body: [
    'A microphysiological system recreates the functional unit of a human organ on a transparent microfluidic chip. Living cells are cultured inside micron-scale channels under controlled flow and mechanical cues.',
    'Tissue then behaves the way it does in the body — under shear, under pressure, at an interface — rather than the way it does flat on a dish. The chip is small enough to hold between two fingers and detailed enough to model an alveolar barrier.',
  ],
  points: [
    {
      k: 'Microfluidic channels',
      v: 'Networks a few hundred microns wide route media, cells and signals across the chip.',
    },
    {
      k: 'Controlled flow',
      v: 'Perfusion at microlitre-per-minute rates keeps tissue fed and mechanically alive.',
    },
    {
      k: 'A living interface',
      v: 'Two channels meet across a membrane — the barrier where real organ behaviour appears.',
    },
  ],
};

// Platform / technology overview — Chipper as the open repository.
export const platform = {
  eyebrow: 'The platform',
  title: 'Every design carries its evidence.',
  lede: 'A chip is only reusable if you can trust it. On Chipper, each design arrives with its metadata, its licence and its 3D model attached — and the maker in plain sight.',
  features: [
    {
      title: 'Maker-first provenance',
      body: 'The person or lab behind a design sits at the top of every entry, with a verified badge. Provenance is the signature, not a footnote.',
      accent: 'coral',
    },
    {
      title: 'Metadata per version',
      body: 'Flow rate, pressure, material and licence are kept for every version. Publish v3 and v1 stays downloadable, with its own numbers intact.',
      accent: 'periwinkle',
    },
    {
      title: 'Licence, made explicit',
      body: 'CC BY 4.0, MIT or GPL — declared up front so reuse is a decision, not a risk. ISO 22916 compliance is confirmed before a design publishes.',
      accent: 'pink',
    },
    {
      title: 'Inspect, cite, reuse',
      body: 'A rendered 3D preview, a downloadable STL and a citation on every design. Open for inspection first, so nothing has to be taken on faith.',
      accent: 'periwinkle',
    },
    {
      title: 'Browse the whole stack',
      body: 'Filter by component type, organ model, material, fabrication method, licence and compliance. Categories are fixed, so nothing duplicates.',
      accent: 'coral',
    },
    {
      title: 'Open, verified, calm',
      body: 'A single warm, readable interface. Status says published, under review, draft or archived — and green means verified, nothing else.',
      accent: 'pink',
    },
  ],
};

// Component library — the building blocks, with real specs from the guide.
export const library = {
  eyebrow: 'The component library',
  title: 'Chips, sensors, pumps, reservoirs.',
  lede: 'A microphysiological system is more than the organ chip. Chipper hosts the whole platform — five categories, each design labelled, versioned and open.',
  components: [
    {
      name: 'Organ chips',
      type: 'Organ chip',
      blurb: 'Two-channel barrier models and beyond — the tissue lives here.',
      specs: [
        { k: 'Flow', v: '2.0 µL/min' },
        { k: 'Pressure', v: '5 kPa' },
        { k: 'Material', v: 'PDMS' },
      ],
      accent: 'coral',
    },
    {
      name: 'Flow sensors',
      type: 'Flow sensor',
      blurb: 'Inline sensing that keeps perfusion honest across a run.',
      specs: [
        { k: 'Accuracy', v: '±2%' },
        { k: 'Resolution', v: '0.1 µL/min' },
        { k: 'LoD', v: '0.3 µL/min' },
      ],
      accent: 'periwinkle',
    },
    {
      name: 'Pumps',
      type: 'Pump',
      blurb: 'Peristaltic micro-pumps that drive flow without a benchtop of tubing.',
      specs: [
        { k: 'Flow range', v: '0.5–12 µL/min' },
        { k: 'Principle', v: 'Peristaltic' },
        { k: 'Max pressure', v: '40 kPa' },
      ],
      accent: 'coral',
    },
    {
      name: 'Reservoirs & FCB',
      type: 'Reservoir',
      blurb: 'Media reservoirs, pressure sensors and fluidic circuit boards that tie it together.',
      specs: [
        { k: 'Formats', v: '3D model · SOP' },
        { k: 'Sensing', v: 'Pressure' },
        { k: 'Routing', v: 'FCB' },
      ],
      accent: 'periwinkle',
    },
  ],
};

// Organ models — the neutral tag set from the guide.
export const organs = {
  eyebrow: 'Organ models',
  title: 'Six organs, one open format.',
  lede: 'Organ tags are kept neutral on purpose — the science decides the model, not the branding.',
  list: [
    { name: 'Lung', note: 'Alveolar barrier, air–liquid interface' },
    { name: 'Liver', note: 'Sinusoid and metabolic models' },
    { name: 'Gut', note: 'Epithelial barrier under flow' },
    { name: 'Skin', note: 'Dermal and epidermal layers' },
    { name: 'Lymph', note: 'Immune and lymphatic tissue' },
    { name: 'Pancreas', note: 'Islet and endocrine function' },
  ],
};

// Applications — established, field-standard uses of MPS (not Chipper-specific claims).
export const applications = {
  eyebrow: 'Why it matters',
  title: 'What researchers build these for.',
  lede: 'Across the field, microphysiological systems are put to work wherever a flat cell culture or an animal model falls short of human physiology.',
  cards: [
    {
      title: 'Drug discovery',
      body: 'Test how a candidate behaves against human tissue under flow, early — before the cost of a programme compounds.',
    },
    {
      title: 'Disease modelling',
      body: 'Reproduce a barrier, an interface or a specific tissue state to study mechanism where it actually happens.',
    },
    {
      title: 'Safety & toxicology',
      body: 'Read organ-level response to exposure on a chip that carries its own flow, pressure and material record.',
    },
    {
      title: 'Human-relevant models',
      body: 'Work with human cells in a controlled microenvironment — a complement to models that answer different questions.',
    },
  ],
};

// Workflow — the four verbs of the platform.
export const workflow = {
  eyebrow: 'The workflow',
  title: 'Four steps, one open loop.',
  lede: 'The repository is built around what researchers actually do with a design.',
  steps: [
    {
      n: '01',
      title: 'Inspect',
      body: 'Open the 3D preview, read the metadata, check the licence and the ISO 22916 status. Trust before download.',
    },
    {
      n: '02',
      title: 'Cite',
      body: 'Every design carries its maker and its version, so it can be cited the way any other result would be.',
    },
    {
      n: '03',
      title: 'Reuse',
      body: 'Download the STL, adapt it to your run, and keep the provenance chain intact for the next lab.',
    },
    {
      n: '04',
      title: 'Publish',
      body: 'Share what you build. Attach your metadata and licence, confirm compliance, and the loop starts again.',
    },
  ],
};

// Materials & fabrication — verbatim taxonomy.
export const materials = {
  eyebrow: 'Materials & fabrication',
  title: 'How the chips are made.',
  materials: [
    { name: 'PDMS', note: 'Soft, gas-permeable, the field default' },
    { name: 'PMMA', note: 'Rigid, optically clear thermoplastic' },
    { name: 'COC', note: 'Low-autofluorescence cyclic olefin' },
  ],
  fabrication: [
    { name: 'Soft lithography', note: 'Moulded microchannels at high fidelity' },
    { name: 'Micromachining', note: 'Directly cut features in rigid stock' },
    { name: 'SLA', note: 'Resin printing for complex geometries' },
  ],
};

// Community statistics — verbatim from the guide.
export const stats = {
  eyebrow: 'Built by the community',
  title: 'People first. No sponsors.',
  lede: 'Chipper opened to the first ten labs and has grown across eleven since April. That is the whole point.',
  figures: [
    { value: 13, suffix: '', label: 'labs contributing' },
    { value: 248, suffix: '', label: 'designs published' },
    { value: 1.2, suffix: 'k', label: 'reuses and counting' },
  ],
  note: 'Every number here is a person or a design — never a partner logo.',
};

// Featured design — the one case study, verbatim spec.
export const featured = {
  eyebrow: 'Featured design',
  status: 'Published',
  verified: true,
  version: 'v3',
  name: 'Lung-on-chip',
  maker: 'Biomicrosystems',
  affiliation: 'University of Twente',
  summary: 'Two-channel alveolar barrier model. Open for inspection, citation and reuse.',
  reuses: '34×',
  stars: '128',
  specs: [
    { k: 'Component', v: 'Organ chip' },
    { k: 'Organ', v: 'Lung' },
    { k: 'Flow', v: '2.0 µL/min' },
    { k: 'Pressure', v: '5 kPa' },
    { k: 'Material', v: 'PDMS' },
    { k: 'Licence', v: 'CC BY 4.0' },
    { k: 'Compliance', v: 'ISO 22916' },
  ],
};

export const cta = {
  eyebrow: 'Join the community',
  title: 'Share what you build.',
  lede: 'Upload a chip with its metadata, licence and 3D model. Let the next lab inspect, cite and reuse it — with your name on the front.',
  primary: { label: 'Upload a design', href: '/upload' },
  secondary: { label: 'Browse all designs', href: '/designs' },
};

export const footer = {
  tagline: 'An open community for microphysiological systems.',
  columns: [
    {
      title: 'Platform',
      links: [
        { label: 'Browse designs', href: '/designs' },
        { label: 'How it works', href: '/how-it-works' },
        { label: 'Licences', href: '/licenses' },
        { label: 'Upload', href: '/upload' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Register', href: '/register' },
        { label: 'Sign in', href: '/login' },
        { label: 'My designs', href: '/my-designs' },
        { label: 'Settings', href: '/settings/profile' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'Forum', href: '/forum' },
        { label: 'News', href: '/news' },
        { label: 'About us', href: '/about' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ],
  legal: 'All Rights Reserved · 100% remote from around the world',
};
