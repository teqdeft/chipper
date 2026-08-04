/**
 * "Message this member" panel for a public profile (SCR-016 → SCR-029).
 *
 * One component covers both audiences, because the button is deliberately shown
 * to everyone: a guest who clicks it should learn *why* they need an account,
 * not silently land on a login screen with no explanation.
 *
 *   signed in, may message → compose and send
 *   guest / not permitted  → an invitation to create an account, returning here
 */
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TextInput, TextTextarea } from '@/components/ui/app/FormField';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { messageApi } from '@/lib/api/messages';
import { describeError } from '@/lib/api/errors';

type MessagePanelProps = {
  open: boolean;
  onClose: () => void;
  /** Recipient's @handle — what the API resolves the thread against. */
  handle: string;
  name: string;
};

export function MessagePanel({ open, onClose, handle, name }: MessagePanelProps) {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [alert, setAlert] = useState<{ title?: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const canMessage = isAuthenticated && hasPermission('message.send');
  const firstName = name.split(/\s+/)[0] || name;

  useEffect(() => {
    if (!open) return;
    setAlert(null);
    if (canMessage) {
      const id = window.requestAnimationFrame(() => bodyRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
  }, [open, canMessage]);

  if (!open) return null;

  // ── Guest, or an account without messaging rights ────────────────────────
  if (!canMessage) {
    return (
      <Reveal as="section" aria-label={`Sign in to message ${firstName}`}>
        <div className="overflow-hidden rounded-card border border-coral/25 bg-gradient-to-br from-coral/10 via-canvas to-periwinkle-tint/40 p-5 shadow-soft sm:p-6">
          <p className="eyebrow text-deep-coral">Direct message</p>
          <h2 className="mt-2 font-display text-xl font-bold text-aubergine">
            Sign in to message {firstName}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            Messages go to a member&apos;s inbox, so you need a free Chipper account to send one.
            Creating one also lets you download designs, ask questions in the forum and publish your
            own work.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link to="/register" state={{ from: location }} className="btn-primary text-sm">
              Create an account
            </Link>
            <Link to="/login" state={{ from: location }} className="btn-ghost text-sm">
              I already have one
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-muted transition-colors hover:text-aubergine"
            >
              Not now
            </button>
          </div>
        </div>
      </Reveal>
    );
  }

  // ── Sent ─────────────────────────────────────────────────────────────────
  if (sentTo) {
    return (
      <Reveal as="section">
        <div className="overflow-hidden rounded-card border border-green/30 bg-gradient-to-br from-green/10 via-canvas to-periwinkle-tint/30 p-5 shadow-soft sm:p-6">
          <p className="eyebrow text-published-green">Delivered</p>
          <h2 className="mt-2 font-display text-xl font-bold text-aubergine">Message sent</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            {firstName} has been notified and will find it in their inbox. You can keep the thread
            going from Messages.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link to={`/messages/${sentTo}`} className="btn-primary text-sm">
              Open conversation
            </Link>
            <button type="button" onClick={() => setSentTo(null)} className="btn-ghost text-sm">
              Write another
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-muted transition-colors hover:text-aubergine"
            >
              Close
            </button>
          </div>
        </div>
      </Reveal>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      setAlert({ tone: 'warning', message: 'Write a message first.' });
      return;
    }

    setAlert(null);
    setIsSending(true);
    try {
      const result = await messageApi.start({
        recipientHandle: handle,
        subject: subject.trim() || undefined,
        body: body.trim(),
      });
      setSentTo(result.conversationId);
      setBody('');
      setSubject('');
      toast.success('Message sent', `${firstName} will get a notification.`);
    } catch (error) {
      const described = describeError(error);
      setAlert({
        title: described.title,
        message: described.message,
        tone: described.tone === 'info' ? 'warning' : described.tone,
      });
    } finally {
      setIsSending(false);
    }
  }

  // ── Compose ──────────────────────────────────────────────────────────────
  return (
    <Reveal as="section" aria-label={`Message ${firstName}`}>
      <form
        className="overflow-hidden rounded-card border border-line bg-surface shadow-soft"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="flex items-start justify-between gap-4 border-b border-line bg-gradient-to-r from-periwinkle-tint/50 via-canvas to-coral/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="eyebrow text-deep-coral">New message</p>
            <h2 className="mt-1.5 font-display text-lg font-bold text-aubergine">
              Message {firstName}
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted">@{handle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm font-medium text-muted transition-colors hover:text-aubergine"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {alert ? (
            <FormAlert
              tone={alert.tone}
              title={alert.title}
              message={alert.message}
              onDismiss={() => setAlert(null)}
            />
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-aubergine">Subject</span>
            <TextInput
              name="subject"
              type="text"
              placeholder="Question about your alveolar barrier chip"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
            />
            <span className="mt-1.5 block text-xs text-muted">Optional — helps at a glance in the inbox.</span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-aubergine">Message</span>
            <TextTextarea
              ref={bodyRef}
              name="body"
              rows={5}
              placeholder={`Hi ${firstName}, …`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={20000}
              required
              className="min-h-[140px]"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted">Opens or continues your 1:1 thread with {firstName}.</p>
            <SubmitButton isLoading={isSending} loadingLabel="Sending…" disabled={!body.trim()}>
              Send message
            </SubmitButton>
          </div>
        </div>
      </form>
    </Reveal>
  );
}
