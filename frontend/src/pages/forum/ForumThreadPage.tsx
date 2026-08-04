import { FormEvent, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Avatar } from '@/components/ui/app/Avatar';
import { FieldShell, TextTextarea } from '@/components/ui/app/FormField';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useApiResource } from '@/hooks/useApiResource';
import { forumApi, type ForumPost, type ForumTopicDetail } from '@/lib/api/forum';
import { cn, formatDateTime, formatListDate } from '@/lib/utils';

/** SCR-026 — Forum thread with posts, reply, votes and accepted answers. */
export default function ForumThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const { data, isLoading, error, reload, setData } = useApiResource(
    () => forumApi.getTopic(id!, { limit: 50 }),
    [id],
    { enabled: Boolean(id) },
  );

  // Keep a live ref so reply/vote handlers never append against a stale snapshot.
  const dataRef = useRef(data);
  dataRef.current = data;

  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const topic = data?.topic;
  const posts = data?.posts ?? [];
  const viewer = data?.viewer;

  const canReply =
    Boolean(viewer?.canReply) && isAuthenticated && hasPermission('forum.post');
  const canVote = isAuthenticated && hasPermission('forum.vote');
  const canAccept = Boolean(viewer?.canAcceptAnswer);
  const isLocked = topic?.status === 'locked';

  async function handleVote(post: ForumPost, value: 1 | -1) {
    if (!canVote) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (votingId === post.id) return;

    setVotingId(post.id);
    try {
      const result = await forumApi.vote(post.id, value);
      const current = dataRef.current;
      if (!current) return;
      setData({
        ...current,
        posts: current.posts.map((p) =>
          p.id === post.id
            ? { ...p, votes: result.score, upvotes: result.upvotes, downvotes: result.downvotes, myVote: result.myVote }
            : p,
        ),
      });
    } catch (err) {
      toast.fromError(err);
    } finally {
      setVotingId(null);
    }
  }

  async function handleAccept(post: ForumPost) {
    if (!topic || !canAccept || acceptingId) return;
    setAcceptingId(post.id);
    try {
      const result = await forumApi.acceptAnswer(topic.slug || topic.id, post.id);
      const current = dataRef.current;
      if (!current) return;

      setData({
        ...current,
        topic: {
          ...current.topic,
          status: result.status,
          solved: result.accepted,
          acceptedPostId: result.accepted ? post.id : null,
        },
        posts: current.posts.map((p) => ({
          ...p,
          isAccepted: result.accepted ? p.id === post.id : false,
        })),
      });
      toast.success(
        result.accepted ? 'Answer accepted' : 'Acceptance cleared',
        result.accepted ? 'This topic is now marked solved.' : 'The topic is open again.',
      );
    } catch (err) {
      toast.fromError(err);
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleSubscribe() {
    if (!topic || !isAuthenticated || subscribing) return;
    setSubscribing(true);
    try {
      const result = await forumApi.toggleSubscription(topic.slug || topic.id);
      const current = dataRef.current;
      if (!current) return;
      setData({ ...current, topic: { ...current.topic, subscribed: result.subscribed } });
      toast.success(
        result.subscribed ? 'Subscribed' : 'Unsubscribed',
        result.subscribed
          ? 'You will be notified about new replies.'
          : 'You will no longer get notifications for this thread.',
      );
    } catch (err) {
      toast.fromError(err);
    } finally {
      setSubscribing(false);
    }
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!topic || !reply.trim() || submitting) return;

    setSubmitting(true);
    try {
      const post = await forumApi.createPost(topic.slug || topic.id, reply.trim());
      const current = dataRef.current;
      if (!current || !post) {
        await reload();
      } else {
        const next: ForumTopicDetail = {
          ...current,
          topic: {
            ...current.topic,
            replies: current.topic.replies + 1,
            subscribed: true,
          },
          // Avoid a duplicate row if the same post is already present.
          posts: current.posts.some((p) => p.id === post.id)
            ? current.posts
            : [...current.posts, post],
        };
        setData(next);
      }
      setReply('');
      toast.success('Reply posted', 'Thanks for contributing to the conversation.');
    } catch (err) {
      toast.fromError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container-content">
        <LoadingState label="Loading conversation…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-content">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="container-content">
        <EmptyState
          title="Topic not found"
          body="This thread may have been removed or the link is incorrect."
          actionLabel="Back to forum"
          actionTo="/forum"
        />
      </div>
    );
  }

  return (
    <div className="container-content max-w-3xl space-y-8">
      <PageHeader
        eyebrow={topic.category?.name ?? 'Forum'}
        title={topic.title}
        lede={topic.excerpt ?? undefined}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            {isAuthenticated ? (
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={subscribing}
                onClick={() => void handleSubscribe()}
              >
                {topic.subscribed ? 'Unsubscribe' : 'Subscribe'}
              </button>
            ) : null}
            <Link to={`/forum/${topic.categorySlug || topic.category?.slug}`} className="btn-ghost text-sm">
              Back to space
            </Link>
          </div>
        }
      />

      <Reveal delay={0.06}>
        <div className="flex flex-wrap items-center gap-2">
          {topic.status === 'solved' || topic.solved ? (
            <StatusBadge tone="green">Solved</StatusBadge>
          ) : null}
          {topic.status === 'open' && !topic.solved ? (
            <StatusBadge tone="coral">Open</StatusBadge>
          ) : null}
          {isLocked ? <StatusBadge tone="ink">Locked</StatusBadge> : null}
          {topic.pinned ? <StatusBadge tone="yellow">Pinned</StatusBadge> : null}
          {topic.type === 'question' ? <StatusBadge tone="periwinkle">Question</StatusBadge> : null}
          {topic.type === 'discussion' ? <StatusBadge tone="periwinkle">Discussion</StatusBadge> : null}
          <span className="text-sm text-muted">
            {topic.views} views · {topic.replies} replies · started by {topic.author?.name}
          </span>
        </div>

        {topic.tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {topic.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line bg-periwinkle-tint/40 px-2.5 py-0.5 text-xs font-medium text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </Reveal>

      {/*
        Posts are a live list — do not wrap them in RevealGroup/whileInView.
        New RevealItems mount after the parent has already finished its one-shot
        "show" animation and stay stuck at opacity: 0 until a full refresh.
      */}
      <div className="space-y-4">
        {posts.map((post) => (
          <article key={post.id}>
            <div
              className={cn(
                'overflow-hidden rounded-card border border-line bg-surface shadow-soft',
                post.isAccepted && 'border-green/40 ring-1 ring-green/20',
              )}
            >
              <div className="flex gap-3 p-4 sm:gap-5 sm:p-5">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    type="button"
                    disabled={votingId === post.id}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-field border text-sm font-bold transition-colors',
                      post.myVote === 1
                        ? 'border-deep-coral bg-coral/15 text-deep-coral'
                        : 'border-line text-muted hover:border-deep-coral hover:text-deep-coral',
                    )}
                    aria-label="Upvote"
                    onClick={() => void handleVote(post, 1)}
                  >
                    ▲
                  </button>
                  <span className="text-sm font-bold tabular-nums text-aubergine">{post.votes}</span>
                  <button
                    type="button"
                    disabled={votingId === post.id}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-field border text-sm font-bold transition-colors',
                      post.myVote === -1
                        ? 'border-aubergine bg-aubergine/10 text-aubergine'
                        : 'border-line text-muted hover:border-aubergine hover:text-aubergine',
                    )}
                    aria-label="Downvote"
                    onClick={() => void handleVote(post, -1)}
                  >
                    ▼
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Avatar
                      name={post.author?.name ?? 'Member'}
                      src={post.author?.avatarUrl}
                      className="h-8 w-8 text-[10px]"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {post.author?.handle ? (
                          <Link
                            to={`/u/${post.author.handle}`}
                            className="font-semibold text-aubergine hover:text-deep-coral"
                          >
                            {post.author.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-aubergine">{post.author?.name}</span>
                        )}
                        {post.isFirstPost ? (
                          <StatusBadge tone="periwinkle">Original post</StatusBadge>
                        ) : null}
                        {post.isAccepted ? (
                          <StatusBadge tone="green">Accepted answer</StatusBadge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted">
                        {formatDateTime(post.at) || formatListDate(post.at)}
                        {post.editedAt ? ' · edited' : ''}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {post.body}
                  </p>

                  {canAccept && !post.isFirstPost ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={acceptingId === post.id}
                        onClick={() => void handleAccept(post)}
                        className="text-xs font-semibold text-deep-coral hover:underline disabled:opacity-50"
                      >
                        {post.isAccepted ? 'Clear accepted answer' : 'Accept as answer'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {isLocked ? (
        <Reveal delay={0.1}>
          <p className="rounded-card border border-line bg-periwinkle-tint/40 px-4 py-3 text-sm text-muted">
            This thread is locked. New replies are disabled.
          </p>
        </Reveal>
      ) : !canReply ? (
        <Reveal delay={0.1}>
          <div className="rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6">
            <h2 className="font-display text-base font-bold text-aubergine">Join the conversation</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              You need a verified account to reply, vote and ask questions. Browsing stays free —
              sign in to take part.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
            className="rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6"
            onSubmit={(e) => void handleReply(e)}
          >
            <h2 className="font-display text-base font-bold text-aubergine">Reply to thread</h2>
            <div className="mt-4">
              <FieldShell label="Your reply" hint="Share experience, steps, or a clear follow-up.">
                <TextTextarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Share your experience or ask a follow-up…"
                  rows={5}
                  required
                />
              </FieldShell>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="btn-primary text-sm"
                disabled={!reply.trim() || submitting}
              >
                {submitting ? 'Posting…' : 'Post reply'}
              </button>
            </div>
          </form>
        </Reveal>
      )}
    </div>
  );
}
