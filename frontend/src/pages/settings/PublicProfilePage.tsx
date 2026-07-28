import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { userApi } from '@/lib/api/users';
import { ROLE_LABEL } from '@/lib/access';

/** SCR-016 — Public profile by handle (CHIP-051, CHIP-052). */
export default function PublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();

  const {
    data: user,
    isLoading,
    error,
    reload,
  } = useApiResource(() => userApi.publicProfile(handle!), [handle], { enabled: Boolean(handle) });

  if (isLoading) {
    return (
      <div className="container-content pb-16 sm:pb-24">
        <LoadingState label="Loading profile…" />
      </div>
    );
  }

  if (error) {
    // A private or missing profile is a dead end, not a retry — say so plainly.
    if (error.title === 'Not found' || error.tone === 'warning') {
      return (
        <div className="container-content pb-16 sm:pb-24">
          <Reveal>
            <EmptyState
              title={error.title}
              body={error.message}
              actionLabel="Browse designs"
              actionTo="/designs"
            />
          </Reveal>
        </div>
      );
    }
    return (
      <div className="container-content pb-16 sm:pb-24">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!user) return null;

  const { stats, recentDesigns } = user;

  return (
    <div className="container-content pb-16 sm:pb-24">
      <Reveal>
        <header className="border-b border-line pb-8">
          <PageHeader
            eyebrow={user.affiliation ?? ROLE_LABEL[user.role]}
            title={user.name}
            lede={user.bio ?? undefined}
            actions={
              user.isSelf ? (
                <Link to="/settings/profile" className="btn-ghost text-sm">
                  Edit profile
                </Link>
              ) : undefined
            }
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone="ink">{ROLE_LABEL[user.role]}</StatusBadge>
            {user.badges.map((badge) => (
              <StatusBadge key={badge} tone="periwinkle">
                {badge}
              </StatusBadge>
            ))}
          </div>

          <dl className="mt-6 flex flex-wrap gap-6 text-sm">
            <Stat label="Designs" value={stats.publishedDesigns} />
            <Stat label="Downloads" value={stats.downloads} />
            <Stat label="Stars" value={stats.stars} />
            <Stat label="Reputation" value={user.reputation} />
            {stats.acceptedAnswers > 0 ? (
              <Stat label="Accepted answers" value={stats.acceptedAnswers} />
            ) : null}

            {user.expertise.length ? (
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
            ) : null}
          </dl>

          {user.website || user.orcid ? (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {user.website ? (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-deep-coral hover:underline"
                >
                  Website ↗
                </a>
              ) : null}
              {user.orcid ? (
                <a
                  href={`https://orcid.org/${user.orcid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-deep-coral hover:underline"
                >
                  ORCID {user.orcid} ↗
                </a>
              ) : null}
            </div>
          ) : null}
        </header>
      </Reveal>

      <Reveal delay={0.08} as="section" className="mt-10">
        <h2 className="font-display text-xl font-bold text-aubergine">
          Designs <span className="text-ink-55">({stats.publishedDesigns})</span>
        </h2>

        {recentDesigns.length === 0 ? (
          <p className="mt-4 text-sm text-ink-70">
            {user.isSelf
              ? 'You have not published a design yet.'
              : `${user.name.split(' ')[0]} has not published a design yet.`}
          </p>
        ) : (
          <RevealGroup className="mt-6 space-y-4" stagger={0.06}>
            {recentDesigns.map((design) => (
              <RevealItem key={design.id}>
                <Link
                  to={`/designs/${design.slug}`}
                  className="group flex flex-col gap-2 border-b border-line pb-4 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-aubergine group-hover:text-deep-coral">
                      {design.title}
                    </h3>
                    {design.summary ? <p className="mt-1 text-sm text-ink-70">{design.summary}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-ink-55">
                    <span>{design.downloads} downloads</span>
                    <span>{design.stars} stars</span>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-ink-55">{label}</dt>
      <dd className="font-display text-lg font-bold text-aubergine">{value}</dd>
    </div>
  );
}
