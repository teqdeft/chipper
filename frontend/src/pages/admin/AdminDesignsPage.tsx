import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { mockDesigns, type MockDesign } from '@/lib/mock';

const statusTone: Record<MockDesign['status'], 'green' | 'yellow' | 'coral' | 'ink'> = {
  published: 'green',
  pending: 'yellow',
  draft: 'ink',
  archived: 'ink',
};

/** SCR-034 — Admin designs moderation. */
export default function AdminDesignsPage() {
  const [designs, setDesigns] = useState<MockDesign[]>(() => [...mockDesigns]);

  const setStatus = (id: string, status: MockDesign['status']) => {
    setDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Designs"
        lede="Review pending uploads, publish approved work and archive outdated versions."
        actions={
          <StatusBadge tone="yellow">
            {designs.filter((d) => d.status === 'pending').length} pending
          </StatusBadge>
        }
      />

      <DataTable
        rows={designs}
        columns={[
          {
            key: 'title',
            header: 'Design',
            render: (row) => (
              <div>
                <Link to={`/designs/${row.id}`} className="font-semibold hover:text-deep-coral">
                  {row.title}
                </Link>
                <p className="text-xs text-ink-55">{row.organ} · {row.material}</p>
              </div>
            ),
          },
          {
            key: 'author',
            header: 'Author',
            render: (row) => row.author,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge>,
          },
          {
            key: 'iso',
            header: 'ISO 22916',
            render: (row) =>
              row.iso22916 ? <StatusBadge tone="green">Compliant</StatusBadge> : <StatusBadge tone="ink">—</StatusBadge>,
          },
          {
            key: 'updated',
            header: 'Updated',
            render: (row) => row.updatedAt,
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-1.5">
                {row.status === 'pending' ? (
                  <button
                    type="button"
                    className="rounded-field border border-green/40 bg-green/10 px-2 py-1 text-[0.7rem] font-semibold text-[#0f7a52] hover:bg-green/20"
                    onClick={() => setStatus(row.id, 'published')}
                  >
                    Approve
                  </button>
                ) : null}
                {row.status !== 'archived' ? (
                  <button
                    type="button"
                    className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-ink-70 hover:bg-periwinkle-tint/50"
                    onClick={() => setStatus(row.id, 'archived')}
                  >
                    Archive
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-ink-70 hover:bg-periwinkle-tint/50"
                    onClick={() => setStatus(row.id, 'published')}
                  >
                    Restore
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
