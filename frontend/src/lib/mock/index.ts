export type MockUser = {
  id: string;
  handle: string;
  name: string;
  affiliation: string;
  role: 'user' | 'uploader' | 'admin' | 'moderator';
  bio: string;
  badges: string[];
  expertise: string[];
  uploads: number;
  reputation: number;
};

export type MockOperatingRange = {
  min?: number | null;
  max?: number | null;
  value?: number | null;
  unit?: string | null;
};

export type MockCredit = {
  name: string;
  affiliation?: string;
  role?: string;
};

export type MockPublishedWork = {
  title: string;
  authors?: string;
  publication?: string;
  year?: number;
  doi?: string;
  url?: string;
};

export type MockRelatedDocument = {
  title: string;
  documentType?: string;
  url?: string;
  description?: string;
};

export type MockDesignFile = {
  name: string;
  size: string;
  type: string;
};

export type MockOwnership = {
  author: string;
  rating: number;
  note?: string;
  at: string;
};

export type MockDesign = {
  id: string;
  title: string;
  summary: string;
  description: string;
  /** Primary organ for browse cards / filters */
  organ: string;
  organs: string[];
  /** Tested material */
  material: string;
  testedFabricationMethod: string;
  licence: string;
  howToCite: string;
  status: 'published' | 'draft' | 'pending' | 'archived';
  author: string;
  authorHandle: string;
  authorAffiliation: string;
  verified: boolean;
  version: string;
  downloads: number;
  stars: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  iso22916: boolean;
  iso22916Note?: string;
  componentType: string;
  resourceType: string;
  publishAs: 'person' | 'institute' | 'person_from_institute';
  instituteName?: string;
  creditsNote?: string;
  credits: MockCredit[];
  clipString?: string;
  maxHeightMm?: number | null;
  clampingZoneHeightMm?: number | null;
  exclusionZones?: string;
  clampingStrategy?: string;
  operatingParameters?: {
    temperature?: MockOperatingRange;
    pressure?: MockOperatingRange;
    flowRate?: MockOperatingRange;
  };
  typeSpecific: Record<string, string | number | null | undefined>;
  publishedWorks: MockPublishedWork[];
  relatedDocuments: MockRelatedDocument[];
  files: MockDesignFile[];
  commercial?: boolean;
  ownerships?: MockOwnership[];
};

export type MockNews = {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  date: string;
  category: string;
};

export type MockThread = {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  author: string;
  replies: number;
  views: number;
  pinned?: boolean;
  status?: 'open' | 'solved' | 'locked';
  excerpt: string;
  updatedAt: string;
};

export type MockMessage = {
  id: string;
  with: string;
  preview: string;
  unread: number;
  updatedAt: string;
};

export type MockNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  at: string;
};

export const mockUsers: MockUser[] = [
  {
    id: 'u1',
    handle: 'm.vanderberg',
    name: 'Dr. M. van der Berg',
    affiliation: 'University of Twente',
    role: 'uploader',
    bio: 'Building open alveolar barrier models for MPS research.',
    badges: ['Verified maker', 'ISO contributor'],
    expertise: ['Lung', 'PDMS', 'Soft lithography'],
    uploads: 12,
    reputation: 840,
  },
  {
    id: 'u2',
    handle: 'a.chen',
    name: 'A. Chen',
    affiliation: 'TNO',
    role: 'user',
    bio: 'Perfusion systems and inline sensing.',
    badges: ['Early adopter'],
    expertise: ['Liver', 'Sensors'],
    uploads: 3,
    reputation: 210,
  },
];

export const mockDesigns: MockDesign[] = [
  {
    id: 'd-alveolar-01',
    title: 'Alveolar barrier · dual channel',
    summary: 'Two-channel alveolar barrier model. Open for inspection, citation and reuse.',
    description:
      'This open design includes fabrication-ready geometry, inlet/outlet adapters, and assembly notes suitable for soft lithography workflows. All dimensions are in millimetres unless otherwise stated. Intended for barrier integrity and co-culture studies on lung models.',
    organ: 'Lung',
    organs: ['Lung'],
    material: 'PDMS',
    testedFabricationMethod: 'Soft lithography',
    licence: 'CC BY 4.0',
    howToCite:
      'van der Berg, M. (2026). Alveolar barrier · dual channel (v1.2). Chipper. https://chipper.org/designs/d-alveolar-01',
    status: 'published',
    author: 'Dr. M. van der Berg',
    authorHandle: 'm.vanderberg',
    authorAffiliation: 'Biomicrosystems, University of Twente',
    verified: true,
    version: 'v1.2',
    downloads: 128,
    stars: 34,
    createdAt: '2026-03-14',
    updatedAt: '2026-06-02',
    tags: ['barrier', 'alveolar', 'dual-channel', 'soft-lithography'],
    iso22916: true,
    iso22916Note: 'CLIP-string and clamping zone declared per ISO 22916.',
    componentType: 'organ-chip',
    resourceType: '3d-model',
    publishAs: 'person_from_institute',
    instituteName: 'University of Twente',
    creditsNote: 'Thanks to the Biomicrosystems group for validation runs.',
    credits: [
      { name: 'Dr. M. van der Berg', affiliation: 'University of Twente', role: 'Lead designer' },
      { name: 'J. Bakker', affiliation: 'University of Twente', role: 'Fabrication' },
    ],
    clipString: 'CHIPPER-ALV-DC-01',
    maxHeightMm: 4.2,
    clampingZoneHeightMm: 3.8,
    exclusionZones: 'Keep 2 mm clear around inlet ports; no clamping over membrane window.',
    clampingStrategy: 'Four-point frame clamp at 5 N, compliant gasket.',
    operatingParameters: {
      temperature: { min: 35, max: 38, unit: '°C' },
      pressure: { value: 5, unit: 'kPa' },
      flowRate: { value: 2.0, unit: 'μL/min' },
    },
    typeSpecific: {
      model_type: 'Organ-on-chip',
      channel_count: 2,
      membrane: 'PET 0.4 μm pores',
      culture_area: 28,
    },
    publishedWorks: [
      {
        title: 'Open alveolar barrier models for MPS',
        authors: 'van der Berg et al.',
        publication: 'Lab on a Chip',
        year: 2025,
        doi: '10.1039/example',
      },
    ],
    relatedDocuments: [
      { title: 'Assembly SOP', documentType: 'SOP', description: 'Bonding and sterilisation steps' },
      { title: 'CNC inlet adapter', documentType: 'CNC program' },
    ],
    files: [
      { name: 'channel_master.stl', size: '2.4 MB', type: 'STL' },
      { name: 'inlet_adapter.step', size: '890 KB', type: 'STEP' },
      { name: 'assembly.pdf', size: '1.1 MB', type: 'PDF' },
      { name: 'metadata.json', size: '4 KB', type: 'JSON' },
    ],
    ownerships: [
      { author: 'A. Chen', rating: 5, note: 'Ran three barrier assays — TEER held.', at: '1 week ago' },
    ],
  },
  {
    id: 'd-liver-perfusion',
    title: 'Hepatic perfusion cassette',
    summary: 'Low-dead-volume cassette for primary hepatocyte runs.',
    description:
      'Low-dead-volume perfusion cassette optimised for primary hepatocyte and co-culture runs. Outer hull geometry is fabrication-ready; internal channel layout supports recirculation.',
    organ: 'Liver',
    organs: ['Liver'],
    material: 'COC',
    testedFabricationMethod: 'Micromachining',
    licence: 'MIT',
    howToCite: 'Chen, A. (2026). Hepatic perfusion cassette (v0.9). Chipper.',
    status: 'published',
    author: 'A. Chen',
    authorHandle: 'a.chen',
    authorAffiliation: 'TNO',
    verified: true,
    version: 'v0.9',
    downloads: 56,
    stars: 18,
    createdAt: '2026-04-01',
    updatedAt: '2026-05-18',
    tags: ['perfusion', 'cassette', 'hepatocyte'],
    iso22916: false,
    componentType: 'organ-chip',
    resourceType: 'product',
    publishAs: 'person',
    credits: [{ name: 'A. Chen', affiliation: 'TNO', role: 'Designer' }],
    operatingParameters: {
      temperature: { value: 37, unit: '°C' },
      flowRate: { min: 1, max: 10, unit: 'μL/min' },
    },
    typeSpecific: {
      model_type: 'Monolayer',
      channel_count: 1,
      culture_area: 42,
    },
    publishedWorks: [],
    relatedDocuments: [{ title: 'Perfusion setup guide', documentType: 'SOP' }],
    files: [
      { name: 'cassette_hull.stl', size: '1.8 MB', type: 'STL' },
      { name: 'datasheet.pdf', size: '420 KB', type: 'PDF' },
    ],
    commercial: true,
  },
  {
    id: 'd-gut-villi',
    title: 'Intestinal villi scaffold',
    summary: '3D-printed scaffold approximating villus geometry for co-culture.',
    description:
      'SLA-printed scaffold approximating villus geometry for epithelial co-culture under flow. Geometry is open for inspection while under review.',
    organ: 'Gut',
    organs: ['Gut'],
    material: 'PMMA',
    testedFabricationMethod: 'SLA',
    licence: 'CC BY-SA 4.0',
    howToCite: 'van der Berg, M. (2026). Intestinal villi scaffold (v1.0). Chipper.',
    status: 'pending',
    author: 'Dr. M. van der Berg',
    authorHandle: 'm.vanderberg',
    authorAffiliation: 'Biomicrosystems, University of Twente',
    verified: true,
    version: 'v1.0',
    downloads: 0,
    stars: 4,
    createdAt: '2026-06-08',
    updatedAt: '2026-06-10',
    tags: ['scaffold', 'co-culture', 'villi'],
    iso22916: true,
    componentType: 'organ-chip',
    resourceType: '3d-model',
    publishAs: 'person_from_institute',
    instituteName: 'University of Twente',
    credits: [{ name: 'Dr. M. van der Berg', affiliation: 'University of Twente', role: 'Lead' }],
    typeSpecific: {
      model_type: 'Organoid',
      channel_count: 1,
      culture_area: 16,
    },
    publishedWorks: [],
    relatedDocuments: [],
    files: [
      { name: 'villi_scaffold.stl', size: '3.1 MB', type: 'STL' },
      { name: 'print_settings.pdf', size: '180 KB', type: 'PDF' },
    ],
  },
  {
    id: 'd-flow-sensor-01',
    title: 'Inline flow sensor',
    summary: 'Thermal inline flow sensor for MPS perfusion loops.',
    description:
      'Inline thermal flow sensor sized for organ-on-chip tubing. Accuracy and LoD declared for reuse in closed-loop perfusion.',
    organ: 'Lung',
    organs: [],
    material: 'Glass',
    testedFabricationMethod: 'Micromachining',
    licence: 'CC BY 4.0',
    howToCite: 'Chen, A. (2026). Inline flow sensor (v1.1). Chipper.',
    status: 'published',
    author: 'A. Chen',
    authorHandle: 'a.chen',
    authorAffiliation: 'TNO',
    verified: true,
    version: 'v1.1',
    downloads: 41,
    stars: 12,
    createdAt: '2026-02-20',
    updatedAt: '2026-05-01',
    tags: ['sensor', 'inline', 'perfusion'],
    iso22916: true,
    componentType: 'flow-sensor',
    resourceType: '3d-model',
    publishAs: 'person',
    credits: [{ name: 'A. Chen', affiliation: 'TNO', role: 'Designer' }],
    operatingParameters: {
      flowRate: { min: 0.3, max: 50, unit: 'μL/min' },
    },
    typeSpecific: {
      accuracy: 2,
      stability: 0.1,
      working_principle: 'Thermal (calorimetric)',
      lod: 0.3,
    },
    publishedWorks: [],
    relatedDocuments: [{ title: 'Calibration SOP', documentType: 'SOP' }],
    files: [
      { name: 'sensor_body.stl', size: '640 KB', type: 'STL' },
      { name: 'wiring.pdf', size: '210 KB', type: 'PDF' },
    ],
  },
  {
    id: 'd-pump-01',
    title: 'Peristaltic micro-pump',
    summary: 'Compact peristaltic pump for benchtop MPS loops.',
    description:
      'Peristaltic micro-pump covering 0.5–12 μL/min with declared max pressure. Suitable for recirculation without a benchtop of tubing.',
    organ: 'Other',
    organs: [],
    material: 'PDMS',
    testedFabricationMethod: 'Soft lithography',
    licence: 'CC BY 4.0',
    howToCite: 'van der Berg, M. (2026). Peristaltic micro-pump (v1.0). Chipper.',
    status: 'published',
    author: 'Dr. M. van der Berg',
    authorHandle: 'm.vanderberg',
    authorAffiliation: 'Biomicrosystems, University of Twente',
    verified: true,
    version: 'v1.0',
    downloads: 72,
    stars: 22,
    createdAt: '2026-01-12',
    updatedAt: '2026-04-10',
    tags: ['pump', 'peristaltic'],
    iso22916: true,
    componentType: 'pump',
    resourceType: '3d-model',
    publishAs: 'institute',
    instituteName: 'University of Twente',
    credits: [{ name: 'Biomicrosystems', affiliation: 'University of Twente', role: 'Lab' }],
    operatingParameters: {
      pressure: { max: 40, unit: 'kPa' },
      flowRate: { min: 0.5, max: 12, unit: 'μL/min' },
    },
    typeSpecific: {
      flow_rate_range: '0.5–12 μL/min',
      stability: 3,
      working_principle: 'Peristaltic',
      max_pressure: 40,
      channel_count: 1,
    },
    publishedWorks: [],
    relatedDocuments: [],
    files: [
      { name: 'pump_housing.stl', size: '1.2 MB', type: 'STL' },
      { name: 'rotor.step', size: '540 KB', type: 'STEP' },
    ],
  },
];

export const mockNews: MockNews[] = [
  {
    slug: 'playground-opens',
    title: 'Chipper Open Playground is live',
    excerpt: 'Researchers can now inspect, cite and reuse open organ-on-chip designs with provenance intact.',
    body: [
      'Today we open the Chipper Playground to the MPS community. Every design carries its maker, licence, metadata and version history in plain sight.',
      'Browse the library, download what you need under the stated licence, and upload what you build so the next lab can stand on your work.',
    ],
    date: '2026-06-01',
    category: 'Announcement',
  },
  {
    slug: 'iso-22916-guide',
    title: 'How we map designs to ISO 22916',
    excerpt: 'A short guide for uploaders on component types, units and compliance checkboxes.',
    body: [
      'ISO 22916 gives the field a shared vocabulary for microphysiological systems. Chipper asks uploaders to declare component type and key operating parameters so reuse stays honest.',
      'This guide walks through the metadata fields and what “compliant” means on the platform today.',
    ],
    date: '2026-05-20',
    category: 'Guide',
  },
  {
    slug: 'mps-world-summit',
    title: 'See you at MPS World Summit',
    excerpt: 'Meet the team, share feedback, and walk through the upload flow in person.',
    body: [
      'We will be on site with demos of the design library and upload wizard. Bring questions about licensing, citation and versioning.',
    ],
    date: '2026-05-05',
    category: 'Event',
  },
];

export const mockCategories = [
  { slug: 'getting-started', name: 'Getting started', topics: 24 },
  { slug: 'fabrication', name: 'Fabrication', topics: 41 },
  { slug: 'metadata-licences', name: 'Metadata & licences', topics: 18 },
  { slug: 'troubleshooting', name: 'Troubleshooting', topics: 33 },
];

export const mockThreads: MockThread[] = [
  {
    id: 't1',
    title: 'Best practice for citing a Chipper design in a paper?',
    category: 'Metadata & licences',
    categorySlug: 'metadata-licences',
    author: 'A. Chen',
    replies: 12,
    views: 340,
    pinned: true,
    status: 'solved',
    excerpt: 'Looking for a citation format that includes version and licence.',
    updatedAt: '2026-06-08',
  },
  {
    id: 't2',
    title: 'PDMS bonding failures after plasma — checklist?',
    category: 'Fabrication',
    categorySlug: 'fabrication',
    author: 'Dr. M. van der Berg',
    replies: 8,
    views: 210,
    status: 'open',
    excerpt: 'Surface looks clean but bond strength is inconsistent across batches.',
    updatedAt: '2026-06-07',
  },
  {
    id: 't3',
    title: 'How do I mark a design ISO 22916 compliant?',
    category: 'Getting started',
    categorySlug: 'getting-started',
    author: 'A. Chen',
    replies: 5,
    views: 156,
    status: 'open',
    excerpt: 'Is the checkbox enough or do I need supporting docs?',
    updatedAt: '2026-06-03',
  },
];

export const mockMessages: MockMessage[] = [
  {
    id: 'm1',
    with: 'A. Chen',
    preview: 'Thanks for the perfusion tip — trying the lower flow tomorrow.',
    unread: 2,
    updatedAt: '2026-06-11',
  },
  {
    id: 'm2',
    with: 'Moderation',
    preview: 'Your design “Intestinal villi scaffold” is in review.',
    unread: 0,
    updatedAt: '2026-06-10',
  },
];

export const mockNotifications: MockNotification[] = [
  {
    id: 'n1',
    title: 'New comment on Alveolar barrier',
    body: 'A. Chen asked about the pressure range.',
    href: '/designs/d-alveolar-01',
    read: false,
    at: '2h ago',
  },
  {
    id: 'n2',
    title: 'Design approved',
    body: 'Hepatic perfusion cassette is now published.',
    href: '/designs/d-liver-perfusion',
    read: false,
    at: '1d ago',
  },
  {
    id: 'n3',
    title: 'Forum reply',
    body: 'Someone replied to your citation thread.',
    href: '/forum/t/t1',
    read: true,
    at: '3d ago',
  },
];

export const mockAdminStats = {
  designs: 1284,
  downloads: 19420,
  activeUsers: 862,
  pendingReview: 14,
  flagged: 7,
};
