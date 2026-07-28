import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockDesigns, mockUsers } from '@/lib/mock';

/** SCR-016 — Public profile by handle. */
export default function PublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const user = mockUsers.find((u) => u.handle === handle);
  const designs = mockDesigns.filter((d) => d.authorHandle === handle);

  if (!user) {
    return (
      <div className="container-content pb-16 sm:pb-24">
        <Reveal>
          <EmptyState
            title="Profile not found"
            body="No user matches this handle."
            actionLabel="Browse designs"
            actionTo="/designs"
          />
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container-content pb-16 sm:pb-24">
      <Reveal>
        <header className="border-b border-line pb-8">
          <PageHeader
            eyebrow={user.affiliation}
            title={user.name}
            lede={user.bio}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {user.badges.map((badge) => (
              <StatusBadge key={badge} tone="periwinkle">
                {badge}
              </StatusBadge>
            ))}
          </div>
          <dl className="mt-6 flex flex-wrap gap-6 text-sm">
            <div>
              <dt className="text-ink-55">Uploads</dt>
              <dd className="font-display text-lg font-bold text-aubergine">{user.uploads}</dd>
            </div>
            <div>
              <dt className="text-ink-55">Reputation</dt>
              <dd className="font-display text-lg font-bold text-aubergine">{user.reputation}</dd>
            </div>
            <div>
              <dt className="text-ink-55">Expertise</dt>
              <dd className="mt-0.5 flex flex-wrap gap-1.5">
                {user.expertise.map((tag) => (
                  <span key={tag} className="pill text-ink-70">
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </header>
      </Reveal>

      <Reveal delay={0.08} as="section" className="mt-10">
        <h2 className="font-display text-xl font-bold text-aubergine">
          Designs <span className="text-ink-55">({designs.length})</span>
        </h2>

        {designs.length === 0 ? (
          <p className="mt-4 text-sm text-ink-70">No published designs yet.</p>
        ) : (
          <RevealGroup className="mt-6 space-y-4" stagger={0.06}>
            {designs.map((design) => (
              <RevealItem key={design.id}>
                <Link
                  to={`/designs/${design.id}`}
                  className="group flex flex-col gap-2 border-b border-line pb-4 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-display font-bold text-aubergine group-hover:text-deep-coral">
                      {design.title}
                    </h3>
                    <p className="mt-1 text-sm text-ink-70">{design.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <StatusBadge tone={design.status === 'published' ? 'green' : 'yellow'}>
                      {design.status}
                    </StatusBadge>
                    <span className="text-xs text-ink-55">{design.licence}</span>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </Reveal>
    </div>
  );
}
