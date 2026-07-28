import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal } from '@/components/ui/Reveal';
import { mockDesigns } from '@/lib/mock';

const MY_HANDLE = 'm.vanderberg';

function statusTone(status: (typeof mockDesigns)[number]['status']) {
  if (status === 'published') return 'green' as const;
  if (status === 'pending') return 'yellow' as const;
  if (status === 'draft') return 'ink' as const;
  return 'ink' as const;
}

export default function MyDesignsPage() {
  const myDesigns = mockDesigns.filter((d) => d.authorHandle === MY_HANDLE);

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow="SCR-022 · My designs"
        title="Your uploads"
        lede="Manage drafts, published designs and pending reviews. Edit metadata or publish a new version."
        actions={
          <Link to="/upload" className="btn-primary">
            New upload
          </Link>
        }
      />

      {myDesigns.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            title="No designs yet"
            body="Upload your first organ-on-chip design to share it with the community."
            actionLabel="Start upload"
            actionTo="/upload"
          />
        </Reveal>
      ) : (
        <DataTable
          rows={myDesigns}
          empty={
            <EmptyState title="No designs" actionLabel="Upload" actionTo="/upload" />
          }
          columns={[
            {
              key: 'title',
              header: 'Design',
              render: (row) => (
                <div className="min-w-[200px]">
                  <Link
                    to={`/designs/${row.id}`}
                    className="font-semibold text-aubergine hover:text-deep-coral"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-55">{row.summary}</p>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
            },
            {
              key: 'version',
              header: 'Version',
              render: (row) => <span className="pill">{row.version}</span>,
            },
            {
              key: 'updated',
              header: 'Updated',
              className: 'whitespace-nowrap',
              render: (row) => <span className="text-ink-70">{row.updatedAt}</span>,
            },
            {
              key: 'stats',
              header: 'Engagement',
              className: 'whitespace-nowrap',
              render: (row) => (
                <span className="text-ink-70">
                  {row.downloads} dl · {row.stars} ★
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              render: (row) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <Link
                    to={`/my-designs/${row.id}/edit`}
                    className="text-xs font-semibold text-deep-coral hover:underline"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/upload?design=${row.id}&version=new`}
                    className="text-xs font-semibold text-ink-70 hover:text-aubergine hover:underline"
                  >
                    New version
                  </Link>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
