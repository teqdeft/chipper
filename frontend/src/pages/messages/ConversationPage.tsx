import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { FormAlert } from '@/components/ui/app/FormAlert';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { messageApi } from '@/lib/api/messages';
import type { ChatMessage, ConversationDetail } from '@/lib/api/messages';
import { describeError } from '@/lib/api/errors';
import {
  cn,
  formatChatDay,
  formatClockTime,
  initialsOf,
  isSameChatDay,
} from '@/lib/utils';

const POLL_MS = 8000;

type LocalMessage = ChatMessage & {
  /** Client-only key while the server id is unknown. */
  clientKey?: string;
  status?: 'sending' | 'failed';
};

/**
 * SCR-030 — Conversation thread with compose.
 *
 * Membership is the API's job: a thread the caller does not belong to comes back
 * as a 404, so guessing a conversation id reveals nothing. This screen only has
 * to render that as "not found".
 */
export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data, isLoading, error, reload, setData } = useApiResource(
    () => messageApi.get(id!, { limit: 100 }),
    [id],
    { enabled: Boolean(id) },
  );

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTogglingArchive, setIsTogglingArchive] = useState(false);
  const [alert, setAlert] = useState<{ title?: string; message: string } | null>(null);
  const [pending, setPending] = useState<LocalMessage[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const dataRef = useRef(data);
  dataRef.current = data;

  const serverMessages = data?.messages ?? [];
  const messages = mergeMessages(serverMessages, pending);
  const others = (data?.conversation.participants ?? []).filter((p) => !p.isMe);
  const peer = others[0] ?? null;
  const title = data?.conversation.isSystem
    ? 'Moderation'
    : others.map((p) => p.name).join(', ') || 'Conversation';

  // Drop optimistic rows once the server echo lands.
  useEffect(() => {
    if (!pending.length) return;
    const serverIds = new Set(serverMessages.map((m) => m.id));
    const serverBodies = new Set(serverMessages.filter((m) => m.from === 'me').map((m) => m.body));
    setPending((rows) =>
      rows.filter((row) => {
        if (row.id > 0 && serverIds.has(row.id)) return false;
        // Match a still-temp row whose body already arrived from the poll.
        if (row.clientKey && row.status !== 'failed' && serverBodies.has(row.body)) return false;
        return true;
      }),
    );
  }, [serverMessages, pending.length]);

  // Keep the viewport pinned to the newest message unless the user scrolled up.
  useLayoutEffect(() => {
    if (!stickToBottom.current) return;
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, messages[messages.length - 1]?.id]);

  // Soft poll — merge new messages without a full loading flash.
  useEffect(() => {
    if (!id || !data) return;

    let cancelled = false;
    let lastSeen = serverMessages[serverMessages.length - 1]?.id ?? null;

    const tick = async () => {
      try {
        const next = await messageApi.get(id, { limit: 100 });
        if (cancelled) return;
        const newest = next.messages[next.messages.length - 1]?.id ?? null;
        if (newest === lastSeen) return;
        lastSeen = newest;
        const current = dataRef.current;
        if (!current) {
          setData(next);
          return;
        }
        setData(mergeConversation(current, next));
      } catch {
        // Silent — a missed poll should not interrupt an open thread.
      }
    };

    const timer = window.setInterval(tick, POLL_MS);
    const onFocus = () => {
      void tick();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, Boolean(data)]);

  useEffect(() => {
    composerRef.current?.focus();
  }, [id]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < 80;
  }, []);

  function resizeComposer() {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function sendBody(body: string) {
    if (!id || !data || !body) return;

    const clientKey = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: LocalMessage = {
      id: -Date.now(),
      clientKey,
      body,
      from: 'me',
      sender: null,
      attachments: [],
      editedAt: null,
      at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    stickToBottom.current = true;
    setPending((rows) => [...rows, optimistic]);
    setDraft('');
    requestAnimationFrame(resizeComposer);
    setIsSending(true);
    setAlert(null);

    try {
      const { message } = await messageApi.reply(id, body);
      setPending((rows) =>
        rows.map((row) => (row.clientKey === clientKey ? { ...message, clientKey, status: undefined } : row)),
      );
      setData({
        ...data,
        messages: data.messages.some((m) => m.id === message.id)
          ? data.messages
          : [...data.messages, message],
      });
    } catch (err) {
      const described = describeError(err);
      setAlert({ title: described.title, message: described.message });
      setPending((rows) =>
        rows.map((row) => (row.clientKey === clientKey ? { ...row, status: 'failed' } : row)),
      );
    } finally {
      setIsSending(false);
      composerRef.current?.focus();
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;
    await sendBody(body);
  }

  function handleComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const body = draft.trim();
      if (body && !isSending) void sendBody(body);
    }
  }

  async function retryFailed(message: LocalMessage) {
    if (!message.clientKey) return;
    setPending((rows) => rows.filter((row) => row.clientKey !== message.clientKey));
    await sendBody(message.body);
  }

  async function handleToggleArchive() {
    if (!id || !data) return;
    const nextArchived = !data.conversation.isArchived;
    setIsTogglingArchive(true);
    try {
      await messageApi.setArchived(id, nextArchived);
      if (nextArchived) {
        toast.success('Conversation archived', 'You can find it under Archived in your inbox.');
        navigate('/messages', { replace: true });
      } else {
        setData({
          ...data,
          conversation: { ...data.conversation, isArchived: false },
        });
        toast.success('Moved to inbox', 'This conversation is back in your inbox.');
      }
    } catch (err) {
      toast.fromError(err);
    } finally {
      setIsTogglingArchive(false);
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
    if (error.title === 'Not found' || error.tone === 'warning') {
      return (
        <div className="container-content">
          <Reveal>
            <EmptyState
              title="Conversation not found"
              body="This thread does not exist, or it is not one of yours."
              actionLabel="Back to inbox"
              actionTo="/messages"
            />
          </Reveal>
        </div>
      );
    }
    return (
      <div className="container-content">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="page-pad-flush">
      <div className="container-content max-w-3xl pb-6 pt-2 sm:pb-8 sm:pt-3">
        <Reveal>
          <div className="flex h-[min(72vh,720px)] min-h-[420px] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft">
            {/* Thread header */}
            <header className="flex items-center gap-3 border-b border-line bg-canvas px-4 py-3.5 sm:px-5">
              <Link
                to="/messages"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-aubergine"
                aria-label="Back to inbox"
              >
                ←
              </Link>

              {peer ? (
                <Link to={`/u/${peer.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={peer.name} avatarUrl={peer.avatarUrl} />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-base font-bold text-aubergine">
                      {title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      @{peer.handle}
                      {peer.affiliation ? ` · ${peer.affiliation}` : ''}
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-aubergine">{title}</p>
                  {data.conversation.subject ? (
                    <p className="truncate text-xs text-muted">{data.conversation.subject}</p>
                  ) : null}
                </div>
              )}

              <div className="flex shrink-0 items-center gap-1.5">
                {peer ? (
                  <Link
                    to={`/u/${peer.handle}`}
                    className="hidden rounded-btn px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-canvas hover:text-aubergine sm:inline-flex"
                  >
                    Profile
                  </Link>
                ) : null}
                {!data.conversation.isSystem ? (
                  <button
                    type="button"
                    onClick={handleToggleArchive}
                    disabled={isTogglingArchive}
                    className="rounded-btn px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-canvas hover:text-aubergine disabled:opacity-60"
                  >
                    {isTogglingArchive
                      ? '…'
                      : data.conversation.isArchived
                        ? 'Move to inbox'
                        : 'Archive'}
                  </button>
                ) : null}
              </div>
            </header>

            {data.conversation.isArchived ? (
              <p className="border-b border-line bg-periwinkle-tint/35 px-4 py-2 text-center text-xs font-medium text-muted sm:px-5">
                Archived
                {data.conversation.subject ? ` · ${data.conversation.subject}` : ''}.{' '}
                <button
                  type="button"
                  onClick={handleToggleArchive}
                  disabled={isTogglingArchive}
                  className="font-semibold text-deep-coral hover:underline disabled:opacity-60"
                >
                  Move to inbox
                </button>
              </p>
            ) : data.conversation.subject ? (
              <p className="border-b border-line bg-periwinkle-tint/25 px-4 py-2 text-center text-xs font-medium text-muted sm:px-5">
                {data.conversation.subject}
              </p>
            ) : null}

            {/* Message stream — data-lenis-prevent keeps wheel scroll inside the box */}
            <div
              ref={scrollRef}
              onScroll={onScroll}
              data-lenis-prevent
              className="scrollbar-panel relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-canvas px-3 py-4 sm:px-5"
            >
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <p className="font-display text-lg font-bold text-aubergine">Start the conversation</p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
                    Say hello — your first message opens the thread for both of you.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((message, index) => {
                    const prev = messages[index - 1];
                    const showDay = !prev || !isSameChatDay(prev.at, message.at);
                    const grouped =
                      Boolean(prev) &&
                      prev.from === message.from &&
                      isSameChatDay(prev.at, message.at) &&
                      !showDay;

                    return (
                      <div key={message.clientKey ?? message.id}>
                        {showDay ? (
                          <div className="flex items-center gap-3 py-4">
                            <span className="h-px flex-1 bg-line" />
                            <span className="text-[0.65rem] font-semibold uppercase tracking-eyebrow text-muted">
                              {formatChatDay(message.at)}
                            </span>
                            <span className="h-px flex-1 bg-line" />
                          </div>
                        ) : null}
                        <MessageBubble
                          message={message}
                          grouped={grouped}
                          onRetry={message.status === 'failed' ? () => void retryFailed(message) : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={endRef} className="h-px" />
            </div>

            {/* Composer */}
            <form
              className="border-t border-line bg-canvas/95 p-3 backdrop-blur-sm sm:p-4"
              onSubmit={handleSend}
              noValidate
            >
              {alert ? (
                <div className="mb-3">
                  <FormAlert
                    tone="error"
                    title={alert.title}
                    message={alert.message}
                    onDismiss={() => setAlert(null)}
                  />
                </div>
              ) : null}

              <div className="flex items-end gap-2 rounded-card border border-line bg-periwinkle-tint/20 p-2 transition-[border-color,box-shadow] focus-within:border-line-strong focus-within:shadow-ring">
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    resizeComposer();
                  }}
                  onKeyDown={handleComposerKey}
                  placeholder={`Message ${peer?.name.split(/\s+/)[0] ?? title}…`}
                  rows={1}
                  maxLength={20000}
                  className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-relaxed text-aubergine outline-none placeholder:text-muted"
                  aria-label="Message"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending}
                  className="btn-primary !rounded-btn !px-4 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? '…' : 'Send'}
                </button>
              </div>
              <p className="mt-2 px-1 text-[0.65rem] text-muted">
                Enter to send · Shift+Enter for a new line
              </p>
            </form>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function mergeMessages(server: ChatMessage[], pending: LocalMessage[]): LocalMessage[] {
  const byId = new Map<number, LocalMessage>();
  for (const message of server) byId.set(message.id, message);

  const extras: LocalMessage[] = [];
  for (const row of pending) {
    if (row.id > 0 && byId.has(row.id)) continue;
    if (row.status === 'sending' || row.status === 'failed') {
      extras.push(row);
      continue;
    }
    if (row.id > 0) byId.set(row.id, row);
  }

  return [...byId.values(), ...extras].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || a.id - b.id,
  );
}

function mergeConversation(prev: ConversationDetail, next: ConversationDetail): ConversationDetail {
  const byId = new Map<number, ChatMessage>();
  for (const message of prev.messages) byId.set(message.id, message);
  for (const message of next.messages) byId.set(message.id, message);
  return {
    ...next,
    messages: [...byId.values()].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || a.id - b.id,
    ),
  };
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-periwinkle-tint text-xs font-bold text-aubergine">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

function MessageBubble({
  message,
  grouped,
  onRetry,
}: {
  message: LocalMessage;
  grouped: boolean;
  onRetry?: () => void;
}) {
  const mine = message.from === 'me';
  const failed = message.status === 'failed';
  const sending = message.status === 'sending';

  return (
    <div
      className={cn(
        'flex gap-2.5',
        mine ? 'justify-end' : 'justify-start',
        grouped ? 'mt-0.5' : 'mt-3',
      )}
    >
      {!mine ? (
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-periwinkle-tint text-[0.6rem] font-bold text-aubergine',
            grouped && 'invisible',
          )}
          aria-hidden
        >
          {message.sender?.avatarUrl ? (
            <img src={message.sender.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initialsOf(message.sender?.name ?? '?')
          )}
        </span>
      ) : null}

      <div className={cn('flex max-w-[min(85%,28rem)] flex-col', mine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-3.5 py-2.5 text-sm leading-relaxed shadow-soft transition-opacity',
            mine
              ? 'rounded-card rounded-br-md bg-aubergine text-canvas'
              : 'rounded-card rounded-bl-md border border-line bg-surface text-aubergine',
            grouped && mine && 'rounded-tr-[18px]',
            grouped && !mine && 'rounded-tl-[18px]',
            sending && 'opacity-70',
            failed && 'ring-1 ring-deep-coral/50',
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>

          {message.attachments.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {message.attachments.map((file) => (
                <li key={file.id}>
                  <a
                    href={file.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'text-xs font-semibold underline underline-offset-2',
                      mine ? 'text-canvas/90' : 'text-deep-coral',
                    )}
                  >
                    {file.name} ({file.size})
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <p
          className={cn(
            'mt-1 px-1 text-[0.65rem] font-medium',
            mine ? 'text-muted' : 'text-muted',
            failed && 'text-deep-coral',
          )}
        >
          {failed ? (
            <>
              Not sent
              {onRetry ? (
                <>
                  {' · '}
                  <button type="button" onClick={onRetry} className="font-semibold underline">
                    Retry
                  </button>
                </>
              ) : null}
            </>
          ) : sending ? (
            'Sending…'
          ) : (
            <>
              {formatClockTime(message.at)}
              {message.editedAt ? ' · edited' : ''}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
