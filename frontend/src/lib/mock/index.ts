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

export type MockDesign = {
  id: string;
  title: string;
  summary: string;
  organ: string;
  material: string;
  licence: string;
  status: 'published' | 'draft' | 'pending' | 'archived';
  author: string;
  authorHandle: string;
  version: string;
  downloads: number;
  stars: number;
  updatedAt: string;
  tags: string[];
  iso22916: boolean;
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
    organ: 'Lung',
    material: 'PDMS',
    licence: 'CC BY 4.0',
    status: 'published',
    author: 'Dr. M. van der Berg',
    authorHandle: 'm.vanderberg',
    version: 'v1.2',
    downloads: 128,
    stars: 34,
    updatedAt: '2026-06-02',
    tags: ['organ-chip', 'barrier', 'ISO 22916'],
    iso22916: true,
  },
  {
    id: 'd-liver-perfusion',
    title: 'Hepatic perfusion cassette',
    summary: 'Low-dead-volume cassette for primary hepatocyte runs.',
    organ: 'Liver',
    material: 'COC',
    licence: 'MIT',
    status: 'published',
    author: 'A. Chen',
    authorHandle: 'a.chen',
    version: 'v0.9',
    downloads: 56,
    stars: 18,
    updatedAt: '2026-05-18',
    tags: ['perfusion', 'cassette'],
    iso22916: false,
  },
  {
    id: 'd-gut-villi',
    title: 'Intestinal villi scaffold',
    summary: '3D-printed scaffold approximating villus geometry for co-culture.',
    organ: 'Gut',
    material: 'PMMA',
    licence: 'CC BY-SA 4.0',
    status: 'pending',
    author: 'Dr. M. van der Berg',
    authorHandle: 'm.vanderberg',
    version: 'v1.0',
    downloads: 0,
    stars: 4,
    updatedAt: '2026-06-10',
    tags: ['scaffold', 'co-culture'],
    iso22916: true,
  },
  {
    id: 'd-kidney-prox',
    title: 'Proximal tubule chip',
    summary: 'Single-channel proximal tubule model with accessible ports.',
    organ: 'Kidney',
    material: 'PDMS',
    licence: 'GPL-3.0',
    status: 'published',
    author: 'A. Chen',
    authorHandle: 'a.chen',
    version: 'v2.0',
    downloads: 91,
    stars: 27,
    updatedAt: '2026-04-22',
    tags: ['tubule', 'ports'],
    iso22916: true,
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
