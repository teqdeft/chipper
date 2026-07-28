import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextSelect } from '@/components/ui/app/FormField';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockDesigns, mockUsers } from '@/lib/mock';
import { cn } from '@/lib/utils';

const mockComments = [
  {
    id: 'c1',
    author: 'A. Chen',
    body: 'What pressure range did you validate for the barrier integrity assay?',
    at: '2 days ago',
  },
  {
    id: 'c2',
    author: 'Dr. M. van der Berg',
    body: 'We typically run 0.5–2.0 cmH₂O with stable TEER over 72 h.',
    at: '1 day ago',
  },
];

const mockFiles = [
  { name: 'channel_master.stl', size: '2.4 MB', type: 'STL' },
  { name: 'inlet_adapter.step', size: '890 KB', type: 'STEP' },
  { name: 'assembly.pdf', size: '1.1 MB', type: 'PDF' },
  { name: 'metadata.json', size: '4 KB', type: 'JSON' },
];

const versions = ['v1.2', 'v1.1', 'v1.0'];

function statusTone(status: (typeof mockDesigns)[number]['status']) {
  if (status === 'published') return 'green' as const;
  if (status === 'pending') return 'yellow' as const;
  return 'ink' as const;
}

export default function DesignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const design = mockDesigns.find((d) => d.id === id);
  const [version, setVersion] = useState(design?.version ?? 'v1.0');

  const author = useMemo(
    () => mockUsers.find((u) => u.handle === design?.authorHandle),
    [design?.authorHandle],
  );

  if (!design) {
    return (
      <div className="container-content">
        <Reveal>
          <EmptyState
            title="Design not found"
            body="This design may have been removed or the link is incorrect."
            actionLabel="Browse designs"
            actionTo="/designs"
          />
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container-content space-y-10">
      <Reveal>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link to="/designs" className="font-medium text-ink-70 hover:text-deep-coral">
            ← Browse
          </Link>
          <span className="text-ink-40">/</span>
          <span className="truncate text-aubergine">{design.title}</span>
        </div>
      </Reveal>

      <PageHeader
        eyebrow="SCR-018 · Design detail"
        title={design.title}
        lede={design.summary}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to={`/designs/${design.id}/view`} className="btn-get">
              View 3D
            </Link>
            <Link to={`/designs/${design.id}/download`} className="btn-primary">
              Download
            </Link>
          </div>
        }
      />

      <Reveal delay={0.06}>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={statusTone(design.status)}>{design.status}</StatusBadge>
          {design.iso22916 ? <StatusBadge tone="periwinkle">ISO 22916</StatusBadge> : null}
          {design.tags.map((tag) => (
            <span key={tag} className="pill text-ink-70">
              {tag}
            </span>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Reveal delay={0.08} className="space-y-6">
          <RevealGroup className="card overflow-hidden" stagger={0.05}>
            <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <RevealItem
                  key={n}
                  className={cn(
                    'flex aspect-square items-center justify-center bg-gradient-to-br from-periwinkle-tint/50 to-coral/10 transition-transform duration-500 ease-premium hover:scale-[1.02]',
                    n === 1 && 'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2',
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-40">
                    Gallery {n}
                  </span>
                </RevealItem>
              ))}
            </div>
          </RevealGroup>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-aubergine">Description</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-70">
              {design.summary} This open design includes fabrication-ready geometry, inlet/outlet adapters, and
              assembly notes suitable for soft lithography workflows. All dimensions are in millimetres unless
              otherwise stated.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-70">
              Intended for barrier integrity and co-culture studies on {design.organ.toLowerCase()} models. Refer to
              the bundled metadata for channel dimensions, port spacing and recommended flow rates.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-aubergine">Files</h2>
              <FieldShell label="Version" className="w-36">
                <TextSelect value={version} onChange={(e) => setVersion(e.target.value)}>
                  {versions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </TextSelect>
              </FieldShell>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {mockFiles.map((file) => (
                <li key={file.name} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-aubergine">{file.name}</p>
                    <p className="text-xs text-ink-55">
                      {file.type} · {file.size}
                    </p>
                  </div>
                  <span className="pill shrink-0">{version}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-aubergine">Comments</h2>
            <RevealGroup className="mt-4 space-y-4" stagger={0.06}>
              {mockComments.map((c) => (
                <RevealItem key={c.id}>
                  <div className="rounded-field border border-line bg-canvas p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-aubergine">{c.author}</span>
                      <span className="text-xs text-ink-55">{c.at}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-70">{c.body}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        </Reveal>

        <Reveal delay={0.1} className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-55">Metadata</h2>
            <dl className="mt-4 space-y-4">
              {[
                ['Organ', design.organ],
                ['Material', design.material],
                ['Version', design.version],
                ['Updated', design.updatedAt],
                ['Downloads', String(design.downloads)],
                ['Stars', String(design.stars)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                  <dt className="text-sm text-ink-55">{k}</dt>
                  <dd className="text-sm font-semibold text-aubergine">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-55">Licence</h2>
            <p className="mt-3 font-display text-xl font-bold text-deep-coral">{design.licence}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-70">
              You may reuse, adapt and redistribute under the terms of this licence. Always cite the author and
              version when publishing results.
            </p>
            <Link to="/licenses" className="mt-3 inline-block text-sm font-semibold text-deep-coral hover:underline">
              Read licence guide →
            </Link>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-55">Credits</h2>
            <div className="mt-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral font-display text-sm font-bold text-aubergine">
                {design.author.slice(0, 1)}
              </span>
              <div>
                <Link
                  to={`/u/${design.authorHandle}`}
                  className="font-semibold text-aubergine hover:text-deep-coral"
                >
                  {design.author}
                </Link>
                {author ? (
                  <>
                    <p className="text-sm text-ink-70">{author.affiliation}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {author.badges.map((b) => (
                        <StatusBadge key={b} tone="green">
                          {b}
                        </StatusBadge>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
