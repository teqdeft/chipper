import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { useApiResource } from '@/hooks/useApiResource';
import { userApi } from '@/lib/api/users';
import type { MemberSummary } from '@/lib/api/users';
import { cn, initialsOf } from '@/lib/utils';

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  student: 'Student',
  researcher: 'Researcher',
  institution: 'Institution',
};

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'researcher', label: 'Researchers' },
  { value: 'student', label: 'Students' },
  { value: 'institution', label: 'Institutions' },
] as const;

const PER_PAGE = 24;

function scrollToTop() {
  const lenis = (window as unknown as { __lenis?: { scrollTo: (v: number, o?: object) => void } })
    .__lenis;
  if (lenis) lenis.scrollTo(0, { duration: 0.9 });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Member directory — search for people and institutions by name, @handle or
 * affiliation. Signed-in only (the route is guarded and the API requires a
 * token), because an open version is a scrapeable list of every researcher here.
 *
 * The query lives in the URL so a search can be shared, bookmarked and survives
 * a back button.
 */
export default function MembersPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const accountType = (params.get('type') ?? '') as '' | 'student' | 'researcher' | 'institution';
  const page = Math.max(1, Number(params.get('page')) || 1);

  // Local mirror so typing stays responsive; the URL is updated on a debounce.
  const [term, setTerm] = useState(search);

  useEffect(() => {
    setTerm(search);
  }, [search]);

  useEffect(() => {
    if (term === search) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (term.trim()) next.set('q', term.trim());
      else next.delete('q');
      next.delete('page');
      setParams(next, { replace: true });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const { data, isLoading, error, reload } = useApiResource(
    () =>
      userApi.list({
        search: search || undefined,
        accountType: accountType || undefined,
        page,
        limit: PER_PAGE,
      }),
    [search, accountType, page],
  );

  const members = data?.items ?? [];
  const total = data?.pagination?.totalItems ?? members.length;

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  }

  function setFilter(value: string) {
    updateParams({
      type: value || null,
      page: null,
    });
  }

  function goToPage(next: number) {
    updateParams({ page: next > 1 ? String(next) : null });
    scrollToTop();
  }

  function clearSearch() {
    setTerm('');
    updateParams({ q: null, page: null });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (term.trim()) next.set('q', term.trim());
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
  }

  return (
    <div className="-mt-6 pb-16 sm:-mt-8 sm:pb-24">
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 75% 65% at 8% -20%, rgba(153,153,221,0.22), transparent 55%), radial-gradient(ellipse 55% 45% at 95% 0%, rgba(252,113,71,0.12), transparent 50%), linear-gradient(180deg, #fffcf9 0%, #f7f4ff 60%, #fffcf9 100%)',
          }}
        />

        <div className="container-content relative py-10 sm:py-14">
          <p className="eyebrow text-deep-coral">Community</p>
          <h1 className="mt-2 max-w-2xl font-display text-display-sm font-extrabold tracking-tight text-aubergine">
            Find members
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-70 sm:text-[1.05rem]">
            Search researchers, students and institutions by name, handle or affiliation — then open
            a profile or start a conversation.
          </p>

          <form onSubmit={onSubmit} role="search" className="mt-8 max-w-2xl">
            <label className="relative block">
              <span className="sr-only">Search members</span>
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-40"
                aria-hidden
              >
                <SearchIcon />
              </span>
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Name, @handle or affiliation — e.g. Twente"
                autoComplete="off"
                autoFocus
                className="w-full rounded-[14px] border border-line bg-canvas py-3.5 pl-11 pr-24 text-sm text-aubergine shadow-soft outline-none transition-[border-color,box-shadow] placeholder:text-ink-40 focus:border-line-strong focus:shadow-ring sm:rounded-2xl sm:text-[0.95rem]"
              />
              <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {term ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="rounded-btn px-2.5 py-1.5 text-xs font-semibold text-ink-55 transition-colors hover:bg-periwinkle-tint hover:text-aubergine"
                  >
                    Clear
                  </button>
                ) : null}
                <button type="submit" className="btn-primary !rounded-btn !px-3.5 !py-2 text-sm">
                  Search
                </button>
              </span>
            </label>
          </form>

          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by account type">
            {FILTERS.map((filter) => {
              const active = accountType === filter.value;
              return (
                <button
                  key={filter.value || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(filter.value)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                    active
                      ? 'border-aubergine bg-aubergine text-canvas'
                      : 'border-line bg-canvas text-ink-70 hover:border-line-strong hover:text-aubergine',
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container-content mt-8 space-y-6 sm:mt-10">
        {isLoading ? (
          <LoadingState label="Searching members…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : members.length === 0 ? (
          <EmptyState
            title={
              search || accountType
                ? `No members match${search ? ` “${search}”` : ''}`
                : 'No members yet'
            }
            body={
              search || accountType
                ? 'Try a shorter search, clear the type filter, or look for the institution instead of the person.'
                : 'Members appear here as they join.'
            }
          >
            {search || accountType ? (
              <button
                type="button"
                onClick={() => {
                  setTerm('');
                  updateParams({ q: null, type: null, page: null });
                }}
                className="btn-ghost mt-6 inline-flex text-sm"
              >
                Clear filters
              </button>
            ) : null}
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="text-sm text-ink-55">
                <span className="font-display text-lg font-bold tabular-nums text-aubergine">
                  {total.toLocaleString()}
                </span>{' '}
                {total === 1 ? 'member' : 'members'}
                {search ? (
                  <>
                    {' '}
                    matching <span className="font-semibold text-aubergine">“{search}”</span>
                  </>
                ) : null}
                {accountType ? <> · {ACCOUNT_TYPE_LABEL[accountType] ?? accountType}</> : null}
              </p>
              <p className="text-xs text-ink-40">Sorted by reputation</p>
            </div>

            <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {members.map((member) => (
                <MemberCardLink key={member.id} member={member} />
              ))}
            </div>

            <Pagination pagination={data?.pagination} onPage={goToPage} />
          </>
        )}
      </div>
    </div>
  );
}

function MemberCardLink({ member }: { member: MemberSummary }) {
  const isInstitution = member.accountType === 'institution';
  const expertise = (member.expertise ?? []).slice(0, 2);

  return (
    <Link
      to={`/u/${member.handle}`}
      className="card group flex h-full min-h-[7.5rem] items-start gap-3 p-3.5 transition-[border-color,box-shadow] duration-300 ease-premium hover:border-line-strong hover:shadow-card-hover sm:min-h-[8rem] sm:p-4"
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-line bg-periwinkle-tint text-xs font-bold text-aubergine',
          isInstitution ? 'rounded-[9px]' : 'rounded-full',
        )}
        aria-hidden
      >
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initialsOf(member.name)
        )}
      </span>

      <span className="flex min-h-0 min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-aubergine transition-colors group-hover:text-deep-coral">
              {member.name}
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink-55">@{member.handle}</span>
          </span>
          {member.accountType ? (
            <StatusBadge tone={isInstitution ? 'periwinkle' : 'coral'} className="shrink-0">
              {ACCOUNT_TYPE_LABEL[member.accountType] ?? member.accountType}
            </StatusBadge>
          ) : (
            <span className="invisible shrink-0" aria-hidden>
              <StatusBadge tone="ink">Member</StatusBadge>
            </span>
          )}
        </span>

        <span
          className={cn(
            'mt-1.5 block truncate text-xs',
            member.affiliation ? 'text-ink-70' : 'text-ink-40',
          )}
        >
          {member.affiliation || 'No affiliation listed'}
        </span>

        <span className="mt-auto flex h-6 items-center gap-2 overflow-hidden pt-2 text-[0.7rem] text-ink-55">
          {expertise[0] ? (
            <span className="pill max-w-[7rem] shrink-0 truncate !px-2 !py-0.5 !text-[0.65rem] bg-periwinkle-tint text-deep-periwinkle">
              {expertise[0]}
            </span>
          ) : null}
          {member.country ? <span className="shrink-0 truncate">{member.country}</span> : null}
          <span className="min-w-0 truncate tabular-nums">
            {member.uploads} {member.uploads === 1 ? 'design' : 'designs'} · {member.reputation} rep
          </span>
        </span>
      </span>
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
