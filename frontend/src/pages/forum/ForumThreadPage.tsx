import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextTextarea } from '@/components/ui/app/FormField';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { mockThreads } from '@/lib/mock';
import { cn } from '@/lib/utils';

type MockPost = {
  id: string;
  author: string;
  body: string;
  votes: number;
  accepted?: boolean;
  at: string;
};

const mockPosts: Record<string, MockPost[]> = {
  t1: [
    {
      id: 'p1',
      author: 'A. Chen',
      body: 'Looking for a citation format that includes version and licence. Does Chipper export a BibTeX entry or should we compose it manually from the design page?',
      votes: 4,
      at: '2026-06-01',
    },
    {
      id: 'p2',
      author: 'Dr. M. van der Berg',
      body: 'Use the “Cite this design” block on the detail page — it includes title, version, DOI placeholder, licence and uploader. For papers I append the access date in brackets.',
      votes: 12,
      accepted: true,
      at: '2026-06-02',
    },
    {
      id: 'p3',
      author: 'Moderation',
      body: 'We are drafting a recommended citation string for ISO 22916-compliant designs. Feedback welcome in Metadata & licences.',
      votes: 3,
      at: '2026-06-08',
    },
  ],
  t2: [
    {
      id: 'p4',
      author: 'Dr. M. van der Berg',
      body: 'Surface looks clean but bond strength is inconsistent across batches. Plasma time is 30 s at 50 W — should I extend or switch gas?',
      votes: 2,
      at: '2026-06-05',
    },
    {
      id: 'p5',
      author: 'A. Chen',
      body: 'Log chamber pressure and O₂ flow. We saw similar issues when the chamber was not fully purged between runs. A 60 s O₂ step after pump-down fixed it for us.',
      votes: 7,
      at: '2026-06-06',
    },
  ],
  t3: [
    {
      id: 'p6',
      author: 'A. Chen',
      body: 'Is the ISO 22916 checkbox enough or do I need supporting docs uploaded with the design?',
      votes: 1,
      at: '2026-06-03',
    },
  ],
};

/** SCR-026 — Forum thread with posts, reply, votes. */
export default function ForumThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const thread = mockThreads.find((t) => t.id === id);
  const posts = id ? mockPosts[id] ?? [] : [];
  const [reply, setReply] = useState('');
  const [votes, setVotes] = useState<Record<string, number>>(() =>
    Object.fromEntries(posts.map((p) => [p.id, p.votes])),
  );

  const canReply = isAuthenticated && hasPermission('forum.post');
  const canVote = isAuthenticated && hasPermission('forum.vote');

  if (!thread) {
    return (
      <div className="container-content">
        <Reveal>
          <EmptyState
            title="Topic not found"
            body="This thread may have been removed or the link is incorrect."
            actionLabel="Back to forum"
            actionTo="/forum"
          />
        </Reveal>
      </div>
    );
  }

  const bumpVote = (postId: string, delta: number) => {
    // Guests are funnelled to sign-in and come back to this thread afterwards.
    if (!canVote) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setVotes((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + delta }));
  };

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow={thread.category}
        title={thread.title}
        lede={thread.excerpt}
        actions={
          <Link to={`/forum/${thread.categorySlug}`} className="btn-ghost text-sm">
            Back to category
          </Link>
        }
      />

      <Reveal delay={0.06}>
        <div className="flex flex-wrap items-center gap-2">
          {thread.status === 'solved' ? <StatusBadge tone="green">Solved</StatusBadge> : null}
          {thread.status === 'open' ? <StatusBadge tone="coral">Open</StatusBadge> : null}
          {thread.status === 'locked' ? <StatusBadge tone="ink">Locked</StatusBadge> : null}
          {thread.pinned ? <StatusBadge tone="yellow">Pinned</StatusBadge> : null}
          <span className="text-sm text-ink-55">
            {thread.views} views · {thread.replies} replies · started by {thread.author}
          </span>
        </div>
      </Reveal>

      <RevealGroup className="space-y-4" stagger={0.06}>
        {posts.map((post, index) => (
          <RevealItem key={post.id} as="article">
            <div
              className={cn(
                'card overflow-hidden',
                post.accepted && 'border-green/40 ring-1 ring-green/20',
              )}
            >
            <div className="flex gap-4 p-5 sm:gap-6">
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-field border border-line text-sm font-bold text-ink-55 transition-colors hover:border-deep-coral hover:text-deep-coral"
                  aria-label="Upvote"
                  onClick={() => bumpVote(post.id, 1)}
                >
                  ▲
                </button>
                <span className="text-sm font-bold tabular-nums text-aubergine">{votes[post.id] ?? post.votes}</span>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-field border border-line text-sm font-bold text-ink-55 transition-colors hover:border-deep-coral hover:text-deep-coral"
                  aria-label="Downvote"
                  onClick={() => bumpVote(post.id, -1)}
                >
                  ▼
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-aubergine">{post.author}</span>
                  {index === 0 ? <StatusBadge tone="periwinkle">Original post</StatusBadge> : null}
                  {post.accepted ? <StatusBadge tone="green">Accepted answer</StatusBadge> : null}
                  <span className="text-xs text-ink-40">{post.at}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-70">{post.body}</p>
              </div>
            </div>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      {thread.status === 'locked' ? (
        <Reveal delay={0.1}>
          <p className="rounded-[16px] border border-line bg-periwinkle-tint/40 px-4 py-3 text-sm text-ink-55">
            This thread is locked. New replies are disabled.
          </p>
        </Reveal>
      ) : !canReply ? (
        <Reveal delay={0.1}>
          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold text-aubergine">Join the conversation</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-70">
              You need an account to reply, vote and ask questions. Browsing stays free — sign in to
              take part.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/login" state={{ from: location }} className="btn-primary text-sm">
                Sign in to reply
              </Link>
              <Link to="/register" className="btn-ghost text-sm">
                Create an account
              </Link>
            </div>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={0.1}>
          <form
            className="card p-5 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              setReply('');
            }}
          >
          <h2 className="font-display text-base font-bold text-aubergine">Reply to thread</h2>
          <div className="mt-4">
            <FieldShell label="Your reply" hint="Markdown is not enabled in this preview.">
              <TextTextarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Share your experience or ask a follow-up…"
                rows={5}
              />
            </FieldShell>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="btn-primary text-sm" disabled={!reply.trim()}>
              Post reply
            </button>
          </div>
          </form>
        </Reveal>
      )}
    </div>
  );
}
