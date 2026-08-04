import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/app/Avatar';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { topicPath, type ForumTopic } from '@/lib/api/forum';
import { cn, formatListDate } from '@/lib/utils';

type TopicRowProps = {
  topic: ForumTopic;
  /** Show the category chip — useful on home / search, redundant inside a category. */
  showCategory?: boolean;
  className?: string;
};

/** Shared conversation-style row for topic lists across the forum. */
export function TopicRow({ topic, showCategory = true, className }: TopicRowProps) {
  const authorName = topic.author?.name ?? 'Member';
  const activityAt = topic.lastPost?.at ?? topic.updatedAt ?? topic.createdAt;

  return (
    <Link
      to={topicPath(topic)}
      className={cn(
        'group flex gap-3 px-4 py-4 transition-colors hover:bg-periwinkle-tint/35 sm:gap-4 sm:px-5',
        className,
      )}
    >
      <Avatar name={authorName} src={topic.author?.avatarUrl} className="mt-0.5 h-10 w-10 text-xs" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {topic.pinned ? <StatusBadge tone="yellow">Pinned</StatusBadge> : null}
          {topic.status === 'solved' || topic.solved ? (
            <StatusBadge tone="green">Solved</StatusBadge>
          ) : null}
          {topic.status === 'locked' ? <StatusBadge tone="ink">Locked</StatusBadge> : null}
          {topic.type === 'question' && topic.status === 'open' && !topic.solved ? (
            <StatusBadge tone="coral">Question</StatusBadge>
          ) : null}
          {topic.type === 'discussion' ? <StatusBadge tone="periwinkle">Discussion</StatusBadge> : null}
          <span className="truncate font-semibold text-aubergine group-hover:text-deep-coral">
            {topic.title}
          </span>
        </div>

        {topic.excerpt ? (
          <p className="mt-1 line-clamp-1 text-sm text-muted">{topic.excerpt}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="font-medium text-muted">{authorName}</span>
          {showCategory && topic.category?.name ? (
            <>
              <span aria-hidden>·</span>
              <span>{topic.category.name}</span>
            </>
          ) : null}
          {Array.isArray(topic.tags) && topic.tags.length ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{topic.tags.slice(0, 3).join(', ')}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end justify-center gap-1 text-xs font-medium text-muted sm:flex">
        <span>
          {topic.replies} {topic.replies === 1 ? 'reply' : 'replies'}
        </span>
        <span className="text-muted">{topic.views} views</span>
        <span className="text-muted">{formatListDate(activityAt)}</span>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-center gap-1 text-xs font-medium text-muted sm:hidden">
        <span>{topic.replies}</span>
        <span className="text-muted">{formatListDate(activityAt)}</span>
      </div>
    </Link>
  );
}
