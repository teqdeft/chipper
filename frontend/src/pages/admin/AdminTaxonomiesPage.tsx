import { FormEvent, useMemo, useState } from 'react';
import { AdminActionBar, AdminActionButton, AdminSection } from '@/components/admin';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { taxonomyApi } from '@/lib/api/designs';
import { adminApi } from '@/lib/api/admin';
import type { TaxonomyTable } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

const TABLES: Array<{ table: TaxonomyTable; label: string; key: string }> = [
  { table: 'component_types', label: 'Component types', key: 'componentTypes' },
  { table: 'resource_types', label: 'Resource types', key: 'resourceTypes' },
  { table: 'organs', label: 'Organs', key: 'organs' },
  { table: 'materials', label: 'Materials', key: 'materials' },
  { table: 'fabrication_methods', label: 'Fabrication', key: 'fabricationMethods' },
  { table: 'model_types', label: 'Model types', key: 'modelTypes' },
  { table: 'licenses', label: 'Licenses', key: 'licenses' },
];

type Row = { id: string; name: string; identifier: string; note?: string | null };

/** Design-library taxonomy CRUD. */
export default function AdminTaxonomiesPage() {
  const toast = useToast();
  const [active, setActive] = useState<TaxonomyTable>('component_types');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useApiResource(() => taxonomyApi.all(), []);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const meta = TABLES.find((t) => t.table === active);
    if (!meta) return [];

    if (active === 'licenses') {
      return (data.licenses ?? []).map((l) => ({
        id: l.code,
        name: l.name,
        identifier: l.code,
        note: l.family,
      }));
    }

    const bag = data as unknown as Record<
      string,
      Array<{ slug: string; name: string; description?: string | null }>
    >;
    const list = bag[meta.key] ?? [];
    return list.map((item) => ({
      id: item.slug,
      name: item.name,
      identifier: item.slug,
      note: item.description ?? null,
    }));
  }, [data, active]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (active === 'licenses') {
        await adminApi.upsertTaxonomy(active, {
          name: name.trim(),
          code: code.trim() || name.trim().toUpperCase().replace(/\s+/g, '-'),
          summary: note.trim() || null,
          active: true,
        });
      } else {
        await adminApi.upsertTaxonomy(active, {
          name: name.trim(),
          description: note.trim() || null,
          active: true,
        });
      }
      toast.success('Item saved', name.trim());
      setName('');
      setCode('');
      setNote('');
      await reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivate(row: Row) {
    if (!window.confirm(`Deactivate "${row.name}"?`)) return;
    setBusyId(row.id);
    try {
      await adminApi.deleteTaxonomy(active, row.identifier);
      toast.success('Item deactivated', row.name);
      await reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Taxonomies"
        lede="Maintain organs, materials, licenses and the other option lists used by the design wizard."
      />

      <div className="flex flex-wrap gap-1.5 rounded-card border border-line bg-surface p-2 shadow-soft">
        {TABLES.map((t) => (
          <button
            key={t.table}
            type="button"
            onClick={() => setActive(t.table)}
            className={cn(
              'rounded-field px-3 py-1.5 text-sm font-medium transition-colors',
              active === t.table
                ? 'bg-aubergine text-canvas'
                : 'text-muted hover:bg-periwinkle-tint/60 hover:text-aubergine',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AdminSection
        title={TABLES.find((t) => t.table === active)?.label}
        description="Add a new item or deactivate one that should no longer appear in filters."
        panel={false}
      >
        <form
          onSubmit={handleCreate}
          className="mb-4 grid gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <FieldShell label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required placeholder="Name" />
          </FieldShell>
          {active === 'licenses' ? (
            <FieldShell label="Code">
              <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="CC-BY-4.0" />
            </FieldShell>
          ) : (
            <FieldShell label="Note / description">
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </FieldShell>
          )}
          {active === 'licenses' ? (
            <div className="sm:col-span-3">
              <FieldShell label="Summary">
                <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional summary" />
              </FieldShell>
            </div>
          ) : null}
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Add item'}
          </button>
        </form>

        {isLoading ? (
          <LoadingState label="Loading taxonomies…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState title="Empty list" body="Add the first item for this taxonomy." />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (row) => (
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-muted">{row.identifier}</p>
                  </div>
                ),
              },
              {
                key: 'note',
                header: active === 'licenses' ? 'Family' : 'Note',
                render: (row) => <span className="text-muted">{row.note ?? '—'}</span>,
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <AdminActionBar>
                    <AdminActionButton
                      tone="danger"
                      disabled={busyId === row.id}
                      onClick={() => void deactivate(row)}
                    >
                      Deactivate
                    </AdminActionButton>
                  </AdminActionBar>
                ),
              },
            ]}
          />
        )}
      </AdminSection>
    </div>
  );
}
