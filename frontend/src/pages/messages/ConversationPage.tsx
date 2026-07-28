import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { FieldShell, TextTextarea } from '@/components/ui/app/FormField';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockMessages } from '@/lib/mock';
import { cn } from '@/lib/utils';

type ChatMessage = {
  id: string;
  from: 'me' | 'them';
  body: string;
  at: string;
};

const mockConversations: Record<string, ChatMessage[]> = {
  m1: [
    {
      id: 'c1',
      from: 'them',
      body: 'Hey — saw your alveolar barrier design. What flow rate do you use for the apical channel?',
      at: '2026-06-09 14:22',
    },
    {
      id: 'c2',
      from: 'me',
      body: 'We run 5 µL/min on the basal side and keep apical static for the first 48 h. Happy to share the protocol doc.',
      at: '2026-06-09 15:01',
    },
    {
      id: 'c3',
      from: 'them',
      body: 'Thanks for the perfusion tip — trying the lower flow tomorrow.',
      at: '2026-06-11 09:15',
    },
    {
      id: 'c4',
      from: 'them',
      body: 'Quick follow-up: did you coat with collagen I or a mix?',
      at: '2026-06-11 09:16',
    },
  ],
  m2: [
    {
      id: 'c5',
      from: 'them',
      body: 'Your design “Intestinal villi scaffold” has been submitted for review.',
      at: '2026-06-10 11:00',
    },
    {
      id: 'c6',
      from: 'them',
      body: 'We typically respond within two working days. You will receive a notification when the review completes.',
      at: '2026-06-10 11:01',
    },
  ],
};

/** SCR-030 — Conversation thread with compose. */
export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const conversation = mockMessages.find((m) => m.id === id);
  const messages = id ? mockConversations[id] ?? [] : [];
  const [draft, setDraft] = useState('');

  if (!conversation) {
    return (
      <div className="container-content">
        <Reveal>
          <EmptyState
            title="Conversation not found"
            body="This message thread does not exist or may have been archived."
            actionLabel="Back to inbox"
            actionTo="/messages"
          />
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container-content flex max-w-3xl flex-col space-y-6">
      <PageHeader
        eyebrow="Messages"
        title={conversation.with}
        actions={
          <Link to="/messages" className="btn-ghost text-sm">
            Back to inbox
          </Link>
        }
      />

      <Reveal delay={0.08}>
        <div className="card flex min-h-[320px] flex-col">
          <RevealGroup className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" stagger={0.05}>
            {messages.map((msg) => (
              <RevealItem key={msg.id}>
                <div className={cn('flex', msg.from === 'me' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-[16px] px-4 py-3 text-sm leading-relaxed',
                  msg.from === 'me'
                    ? 'bg-aubergine text-canvas'
                    : 'border border-line bg-periwinkle-tint/50 text-aubergine',
                )}
              >
                <p>{msg.body}</p>
                <p
                  className={cn(
                    'mt-2 text-[0.65rem] font-medium',
                    msg.from === 'me' ? 'text-canvas/70' : 'text-ink-40',
                  )}
                >
                  {msg.at}
                </p>
              </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          <form
          className="border-t border-line p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            setDraft('');
          }}
        >
          <FieldShell label="Message">
            <TextTextarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${conversation.with}…`}
              rows={3}
              className="min-h-[80px]"
            />
          </FieldShell>
          <div className="mt-3 flex justify-end">
            <button type="submit" className="btn-primary text-sm" disabled={!draft.trim()}>
              Send
            </button>
          </div>
          </form>
        </div>
      </Reveal>
    </div>
  );
}
