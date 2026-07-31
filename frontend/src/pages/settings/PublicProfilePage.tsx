import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessagePanel } from '@/components/profile/MessagePanel';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { useApiResource } from '@/hooks/useApiResource';
import { userApi, type ProfileBadge, type PublicProfile } from '@/lib/api/users';
import { ROLE_LABEL, rolesHeldBy } from '@/lib/access';
import { cn, initialsOf } from '@/lib/utils';

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  student: 'Student',
  researcher: 'Researcher',
  institution: 'Institution',
};

const BADGE_TONE: Record<string, 'coral' | 'green' | 'ink' | 'periwinkle' | 'yellow'> = {
  coral: 'coral',
  green: 'green',
  ink: 'ink',
  periwinkle: 'periwinkle',
  yellow: 'yellow',
};

function formatJoined(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatPublished(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(iso),
    );
  } catch {
    return null;
  }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** SCR-016 — Public profile by handle (CHIP-051, CHIP-052). */
export default function PublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const [messageOpen, setMessageOpen] = useState(false);

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
    if (error.title === 'Not found' || error.tone === 'warning') {
      return (
        <div className="container-content pb-16 sm:pb-24">
          <EmptyState
            title={error.title}
            body={error.message}
            actionLabel="Browse designs"
            actionTo="/designs"
          />
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
  const badges = user.badgeDetails?.length
    ? user.badgeDetails
    : user.badges.map((name) => ({
        slug: name,
        name,
        description: null,
        tone: 'periwinkle',
        awardedAt: null,
      }));
  const firstName = user.name.split(/\s+/)[0] || user.name;
  const isInstitution = user.accountType === 'institution' || Boolean(user.members);
  const affiliationLabel =
    user.affiliation?.trim() &&
    user.affiliation.trim().toLowerCase() !== user.name.trim().toLowerCase()
      ? user.affiliation
      : null;
  const showAffiliation = Boolean(user.institution || affiliationLabel);

  const metaBits = [
    user.accountType ? ACCOUNT_TYPE_LABEL[user.accountType] : null,
    user.country,
    user.joinedAt ? `Joined ${formatJoined(user.joinedAt)}` : null,
  ].filter(Boolean) as string[];

  return (
    // Cancel AppLayout's content offset so the hero sits flush under the nav.
    <div className="-mt-6 pb-16 sm:-mt-8 sm:pb-24">
      {/* Atmospheric hero band — brand colours, not a flat canvas strip */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 12% -10%, rgba(252,113,71,0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 92% 10%, rgba(153,153,221,0.28), transparent 50%), linear-gradient(180deg, #fffcf9 0%, #f7f4ff 55%, #fffcf9 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent"
          aria-hidden
        />

        <div className="container-content relative py-10 sm:py-14">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
              <Avatar name={user.name} avatarUrl={user.avatarUrl} large />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    {user.accountType ? (
                      <p className="eyebrow text-deep-coral">
                        {ACCOUNT_TYPE_LABEL[user.accountType] ?? user.accountType}
                      </p>
                    ) : null}
                    <h1 className="mt-2 font-display text-display-sm font-extrabold tracking-tight text-aubergine">
                      {user.name}
                    </h1>
                    <p className="mt-1.5 font-sans text-base text-ink-55">@{user.handle}</p>
                  </div>

                  {user.isSelf ? (
                    <Link to="/settings/profile" className="btn-ghost shrink-0 text-sm">
                      Edit profile
                    </Link>
                  ) : (
                    // Shown to guests too: clicking explains why an account is
                    // needed instead of bouncing them to a bare login screen.
                    <button
                      type="button"
                      onClick={() => setMessageOpen((v) => !v)}
                      aria-expanded={messageOpen}
                      className="btn-primary shrink-0 text-sm"
                    >
                      Message
                    </button>
                  )}
                </div>

                {metaBits.length ? (
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-70">
                    {metaBits.map((bit, i) => (
                      <span key={bit} className="inline-flex items-center gap-2">
                        {i > 0 ? <span className="text-ink-40" aria-hidden>·</span> : null}
                        {bit}
                      </span>
                    ))}
                  </p>
                ) : null}

                {showAffiliation ? (
                  <p className="mt-3 text-sm text-ink-70">
                    {isInstitution ? 'Part of' : 'Affiliated with'}{' '}
                    {user.institution ? (
                      <Link
                        to={`/u/${user.institution.handle}`}
                        // The avatar is the first flex item, so without
                        // align-middle the institution name drops below the
                        // "Affiliated with" it continues.
                        className="inline-flex items-center gap-2 align-middle font-semibold text-deep-coral hover:underline"
                      >
                        {user.institution.avatarUrl ? (
                          <img
                            src={user.institution.avatarUrl}
                            alt=""
                            className="h-5 w-5 rounded-full border border-line object-cover"
                          />
                        ) : null}
                        {user.institution.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-aubergine">{affiliationLabel}</span>
                    )}
                  </p>
                ) : null}

                {user.bio ? (
                  <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-70 sm:text-[1.05rem]">
                    {user.bio}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {rolesHeldBy(user.role).map((role) => (
                    <StatusBadge key={role} tone="ink">
                      {ROLE_LABEL[role]}
                    </StatusBadge>
                  ))}
                  {badges.slice(0, 3).map((badge) => (
                    <StatusBadge key={badge.slug} tone={BADGE_TONE[badge.tone] ?? 'periwinkle'}>
                      {badge.name}
                    </StatusBadge>
                  ))}
                </div>

                <ProfileLinks user={user} />
              </div>
            </div>

          <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Designs" value={stats.publishedDesigns} />
            <StatCard label="Downloads" value={stats.downloads} />
            <StatCard label="Stars" value={stats.stars} />
            <StatCard label="Reputation" value={user.reputation} />
            <StatCard label="Forum posts" value={stats.forumPosts} />
            <StatCard label="Accepted answers" value={stats.acceptedAnswers} />
          </dl>
        </div>
      </section>

      <div className="container-content mt-10 space-y-12 sm:mt-14 sm:space-y-16">
        <MessagePanel
          open={messageOpen}
          onClose={() => setMessageOpen(false)}
          handle={user.handle}
          name={user.name}
        />

        {(user.expertise.length > 0 || badges.length > 0) && (
          <div
            className={cn(
              'grid gap-10',
              user.expertise.length > 0 && badges.length > 0 && 'lg:grid-cols-2',
            )}
          >
            {user.expertise.length > 0 ? (
              <section>
                <SectionHeading title="Expertise" lede="Areas this member works in." />
                <ul className="mt-5 flex flex-wrap gap-2">
                  {user.expertise.map((tag) => (
                    <li key={tag} className="pill bg-periwinkle-tint/60 text-deep-periwinkle">
                      {tag}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {badges.length > 0 ? (
              <section>
                <SectionHeading title="Badges" lede="Recognition earned on Chipper." />
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {badges.map((badge) => (
                    <BadgeCard key={badge.slug} badge={badge} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}

        {user.members ? (
          <section>
            <SectionHeading
              title="Members"
              count={user.members.total}
              lede={`People who list ${user.name} as their affiliation.`}
            />

            {user.members.items.length === 0 ? (
              <p className="mt-5 max-w-prose text-sm leading-relaxed text-ink-70">
                Nobody has listed {user.name} as their affiliation yet. Students and researchers appear
                here automatically once they enter it on their profile.
              </p>
            ) : (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {user.members.items.map((member) => (
                    <Link
                      key={member.id}
                      to={`/u/${member.handle}`}
                      className="card group flex h-full items-center gap-3 p-4 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-card-hover"
                    >
                      <Avatar name={member.name} avatarUrl={member.avatarUrl} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-aubergine transition-colors group-hover:text-deep-coral">
                          {member.name}
                        </span>
                        <span className="block truncate text-xs text-ink-55">
                          @{member.handle}
                          {member.accountType
                            ? ` · ${ACCOUNT_TYPE_LABEL[member.accountType] ?? member.accountType}`
                            : ''}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-55">
                          {member.uploads} {member.uploads === 1 ? 'design' : 'designs'} ·{' '}
                          {member.reputation} rep
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                {user.members.total > user.members.items.length ? (
                  <p className="mt-4 text-sm text-ink-55">
                    and {user.members.total - user.members.items.length} more
                  </p>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        <section>
          <SectionHeading
            title="Designs"
            count={stats.publishedDesigns}
            lede={
              isInstitution
                ? 'Published designs from this organisation.'
                : 'Published designs available in the library.'
            }
          />

          {recentDesigns.length === 0 ? (
            <div className="mt-6 rounded-[16px] border border-dashed border-line bg-periwinkle-tint/30 px-6 py-10 text-center sm:rounded-card">
              <p className="font-display text-lg font-bold text-aubergine">No designs yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-70">
                {user.isSelf
                  ? 'Publish your first design to show it here.'
                  : `${firstName} has not published a design yet.`}
              </p>
              {user.isSelf ? (
                <Link to="/upload" className="btn-primary mt-6 inline-flex text-sm">
                  Upload a design
                </Link>
              ) : (
                <Link to="/designs" className="btn-ghost mt-6 inline-flex text-sm">
                  Browse designs
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentDesigns.map((design, index) => {
                const published = formatPublished(design.publishedAt);
                return (
                  <Link
                    key={design.id}
                    to={`/designs/${design.slug}`}
                    className="card group flex h-full flex-col overflow-hidden transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-card-hover"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-gradient-to-br from-periwinkle-tint/80 via-canvas to-coral/20">
                      <div
                        className="absolute -inset-6 opacity-50"
                        style={{
                          background:
                            index % 2 === 0
                              ? 'radial-gradient(circle at 28% 25%, rgba(252,113,71,0.32), transparent 55%), radial-gradient(circle at 78% 70%, rgba(153,153,221,0.4), transparent 50%)'
                              : 'radial-gradient(circle at 70% 20%, rgba(153,153,221,0.45), transparent 55%), radial-gradient(circle at 20% 80%, rgba(252,113,71,0.28), transparent 50%)',
                        }}
                        aria-hidden
                      />
                      <span className="absolute inset-0 flex items-center justify-center font-display text-4xl font-extrabold text-aubergine/10">
                        {design.title.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <h3 className="font-display text-lg font-bold text-aubergine transition-colors duration-300 group-hover:text-deep-coral">
                        {design.title}
                      </h3>
                      {design.summary ? (
                        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-70">
                          {design.summary}
                        </p>
                      ) : (
                        <div className="flex-1" />
                      )}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-55">
                        <span>
                          <span className="text-coral">★</span> {design.stars} · {design.downloads} dl
                        </span>
                        {published ? <span>{published}</span> : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  count,
  lede,
}: {
  title: string;
  count?: number;
  lede?: string;
}) {
  return (
    <div className="min-w-0 max-w-2xl">
      <h2 className="font-display text-xl font-bold text-aubergine sm:text-2xl">
        {title}
        {typeof count === 'number' ? (
          <span className="ml-2 font-sans text-base font-semibold text-ink-55">({count})</span>
        ) : null}
      </h2>
      {lede ? <p className="mt-1.5 text-sm leading-relaxed text-ink-70">{lede}</p> : null}
    </div>
  );
}

function Avatar({
  name,
  avatarUrl,
  large = false,
}: {
  name: string;
  avatarUrl: string | null;
  large?: boolean;
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-periwinkle-tint font-bold text-aubergine shadow-soft',
        large
          ? 'h-24 w-24 text-2xl sm:h-32 sm:w-32 sm:text-3xl'
          : 'h-11 w-11 text-xs',
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] border border-line bg-canvas px-3 py-3.5 shadow-soft sm:rounded-2xl sm:px-4 sm:py-4">
      <dt className="text-[0.7rem] font-semibold uppercase tracking-eyebrow text-ink-55">{label}</dt>
      <dd className="mt-1.5 font-display text-xl font-extrabold tabular-nums text-aubergine sm:text-2xl">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

function BadgeCard({ badge }: { badge: ProfileBadge }) {
  return (
    <div className="flex h-full items-start gap-3 rounded-[14px] border border-line bg-canvas p-3.5 shadow-soft sm:rounded-2xl">
      <StatusBadge tone={BADGE_TONE[badge.tone] ?? 'periwinkle'} className="mt-0.5 shrink-0">
        {badge.name}
      </StatusBadge>
      <div className="min-w-0 pt-0.5">
        {badge.description ? (
          <p className="text-sm leading-relaxed text-ink-70">{badge.description}</p>
        ) : (
          <p className="text-sm font-semibold text-aubergine">{badge.name}</p>
        )}
      </div>
    </div>
  );
}

function ProfileLinks({ user }: { user: PublicProfile }) {
  const links: { key: string; href: string; label: string; external?: boolean }[] = [];

  if (user.website) {
    links.push({ key: 'website', href: user.website, label: hostOf(user.website), external: true });
  }
  if (user.orcid) {
    links.push({
      key: 'orcid',
      href: `https://orcid.org/${user.orcid}`,
      label: `ORCID ${user.orcid}`,
      external: true,
    });
  }
  if (user.email) {
    links.push({ key: 'email', href: `mailto:${user.email}`, label: user.email });
  }

  if (!links.length) return null;

  return (
    <ul className="mt-5 flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.key}>
          <a
            href={link.href}
            {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="pill border-line bg-canvas text-aubergine transition-colors hover:border-deep-coral hover:text-deep-coral"
          >
            {link.label}
            {link.external ? <span aria-hidden>↗</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
