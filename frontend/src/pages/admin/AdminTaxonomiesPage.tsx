import { FormEvent, useMemo, useState } from 'react';
import {
  AdminActionBar,
  AdminActionButton,
  AdminFilterSelect,
  AdminSearchField,
  AdminSection,
  AdminToolbar,
  AdminToolbarButton,
} from '@/components/admin';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { FieldShell, TextInput, TextSelect } from '@/components/ui/app/FormField';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { adminApi } from '@/lib/api/admin';
import type {
  AdminTaxonomyItem,
  TaxonomyPayload,
  TaxonomyTable,
} from '@/lib/api/admin';
import { cn } from '@/lib/utils';

/**
 * How each list differs. `identifierKey` is the payload field its identifier
 * travels under, `scoped` marks working principles (optional component type),
 * and `hardDelete` marks tags — the one table with no active flag, so retiring
 * an item there means deleting the row.
 */
type TableMeta = {
  table: TaxonomyTable;
  label: string;
  identifierKey: 'slug' | 'code';
  identifierLabel: string;
  nameLabel: string;
  noteLabel: string | null;
  scoped?: 'optional';
  hardDelete?: boolean;
};

const TABLES: TableMeta[] = [
  {
    table: 'component_types',
    label: 'Component types',
    identifierKey: 'slug',
    identifierLabel: 'Slug',
    nameLabel: 'Name',
    noteLabel: 'Description',
  },
  {
    table: 'resource_types',
    label: 'Resource types',
    identifierKey: 'slug',
    identifierLabel: 'Slug',
    nameLabel: 'Name',
    noteLabel: 'Description',
  },
  { table: 'organs', label: 'Organs', identifierKey: 'slug', identifierLabel: 'Slug', nameLabel: 'Name', noteLabel: 'Note' },
  { table: 'materials', label: 'Materials', identifierKey: 'slug', identifierLabel: 'Slug', nameLabel: 'Name', noteLabel: 'Note' },
  {
    table: 'fabrication_methods',
    label: 'Fabrication',
    identifierKey: 'slug',
    identifierLabel: 'Slug',
    nameLabel: 'Name',
    noteLabel: 'Note',
  },
  { table: 'model_types', label: 'Model types', identifierKey: 'slug', identifierLabel: 'Slug', nameLabel: 'Name', noteLabel: 'Note' },
  {
    table: 'licenses',
    label: 'Licenses',
    identifierKey: 'code',
    identifierLabel: 'Code',
    nameLabel: 'Name',
    noteLabel: 'Summary',
  },
  {
    table: 'working_principles',
    label: 'Working principles',
    identifierKey: 'slug',
    identifierLabel: 'Slug',
    nameLabel: 'Name',
    noteLabel: 'Note',
    scoped: 'optional',
  },
  { table: 'tags', label: 'Tags', identifierKey: 'slug', identifierLabel: 'Slug', nameLabel: 'Name', noteLabel: null, hardDelete: true },
];

type Draft = {
  /** Empty while creating; set to the row's identifier while editing. */
  identifier: string;
  name: string;
  note: string;
  code: string;
  family: string;
  url: string;
  componentType: string;
  sortOrder: string;
};

const EMPTY_DRAFT: Draft = {
  identifier: '',
  name: '',
  note: '',
  code: '',
  family: '',
  url: '',
  componentType: '',
  sortOrder: '',
};

/** DataTable keys on a string id; the API's is the numeric primary key. */
type Row = Omit<AdminTaxonomyItem, 'id'> & { id: string };

/** Design-library taxonomy CRUD. */
export default function AdminTaxonomiesPage() {
  const toast = useToast();
  const [active, setActive] = useState<TaxonomyTable>('component_types');
  const [scope, setScope] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const meta = TABLES.find((t) => t.table === active) as TableMeta;
  const isEditing = draft.identifier !== '';
  const patch = (values: Partial<Draft>) => setDraft((d) => ({ ...d, ...values }));

  // A new item defaults to whatever the toolbar is filtered to — that is almost
  // always the type the admin means. While editing, the parent is part of the
  // row's identity (the tables are unique on it), so it stays put.
  const formComponentType = isEditing ? draft.componentType : draft.componentType || scope;

  // Component types double as the parent list for working principles, so they
  // are loaded once regardless of which tab is open.
  const componentTypes = useApiResource(
    () => adminApi.taxonomyItems('component_types', { includeInactive: true }),
    [],
  );

  const items = useApiResource(
    () =>
      adminApi.taxonomyItems(active, {
        componentType: meta.scoped ? scope : undefined,
        includeInactive,
        search: search || undefined,
      }),
    [active, scope, includeInactive, search],
  );

  function selectTable(table: TaxonomyTable) {
    setActive(table);
    setScope('');
    setSearch('');
    setSearchInput('');
    setIncludeInactive(false);
    setDraft(EMPTY_DRAFT);
  }

  function startEdit(item: Row) {
    setDraft({
      identifier: item.identifier,
      name: item.name,
      note: item.note ?? '',
      code: meta.identifierKey === 'code' ? item.identifier : '',
      family: item.family ?? '',
      url: item.url ?? '',
      componentType: item.componentType ?? '',
      sortOrder: item.sortOrder === null || item.sortOrder === undefined ? '' : String(item.sortOrder),
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;

    const payload: TaxonomyPayload = {
      name: draft.name.trim(),
      expect: isEditing ? 'update' : 'create',
    };

    // Identifiers are derived from the name on create and pinned on edit — a
    // slug or licence code already lives in URLs and saved filters.
    if (isEditing) payload[meta.identifierKey] = draft.identifier;
    if (meta.noteLabel) payload.note = draft.note.trim() || null;
    if (!isEditing && !meta.hardDelete) payload.active = true;
    if (!meta.hardDelete && draft.sortOrder.trim() !== '') payload.sortOrder = Number(draft.sortOrder);

    if (meta.table === 'licenses') {
      if (!isEditing && draft.code.trim()) payload.code = draft.code.trim();
      payload.family = draft.family.trim() || null;
      payload.url = draft.url.trim() || null;
    }

    if (meta.scoped) payload.componentType = formComponentType || null;

    setIsSaving(true);
    try {
      await adminApi.upsertTaxonomy(active, payload);
      toast.success(isEditing ? 'Item updated' : 'Item added', payload.name);
      setDraft(EMPTY_DRAFT);
      await items.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function retire(item: Row) {
    const question = meta.hardDelete
      ? `Delete the tag "${item.name}"? This cannot be undone.`
      : `Deactivate "${item.name}"? It disappears from the wizard and the filters, but existing designs keep it.`;
    if (!window.confirm(question)) return;

    setBusyId(item.identifier);
    try {
      await adminApi.deleteTaxonomy(active, item.identifier, {
        componentType: meta.scoped ? item.componentType ?? undefined : undefined,
      });
      toast.success(meta.hardDelete ? 'Tag deleted' : 'Item deactivated', item.name);
      if (draft.identifier === item.identifier) setDraft(EMPTY_DRAFT);
      await items.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function restore(item: Row) {
    setBusyId(item.identifier);
    try {
      await adminApi.restoreTaxonomy(active, item.identifier, {
        componentType: meta.scoped ? item.componentType ?? undefined : undefined,
      });
      toast.success('Item restored', item.name);
      await items.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  const rows = useMemo(
    () => (items.data ?? []).map((item) => ({ ...item, id: String(item.id) })),
    [items.data],
  );

  const typeOptions = componentTypes.data ?? [];

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
            onClick={() => selectTable(t.table)}
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
        title={meta.label}
        description={
          meta.hardDelete
            ? 'Rename a tag, or delete one nothing points at any more.'
            : 'Add, edit, retire or bring back an item. Retired items stay attached to existing designs.'
        }
        panel={false}
      >
        <AdminToolbar
          className="mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          {meta.scoped ? (
            <AdminFilterSelect
              className="w-44"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              aria-label="Filter by component type"
            >
              <option value="">All component types</option>
              {typeOptions.map((t) => (
                <option key={t.identifier} value={t.identifier}>
                  {t.name}
                </option>
              ))}
            </AdminFilterSelect>
          ) : null}

          <AdminSearchField
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Name or identifier"
            aria-label="Search taxonomy items"
          />

          <AdminToolbarButton>Search</AdminToolbarButton>

          {meta.hardDelete ? null : (
            <label className="flex shrink-0 items-center gap-2 text-[0.75rem] font-semibold text-aubergine">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="size-3.5 rounded-[0.25rem] border-line-strong accent-aubergine"
              />
              Show retired
            </label>
          )}
        </AdminToolbar>

        <form
          onSubmit={handleSubmit}
          className={cn(
            'mb-4 space-y-4 rounded-card border bg-surface p-4 shadow-soft sm:p-5',
            isEditing ? 'border-aubergine/40 ring-1 ring-aubergine/15' : 'border-line',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-aubergine">
                {isEditing ? `Edit ${meta.label.toLowerCase()}` : `Add to ${meta.label.toLowerCase()}`}
              </h3>
              <p className="text-xs text-muted">
                {isEditing
                  ? `${meta.identifierLabel}: ${draft.identifier} — kept as is so existing links keep working`
                  : `${meta.identifierLabel} is generated from the ${meta.nameLabel.toLowerCase()} unless you set one.`}
              </p>
            </div>
            {isEditing ? (
              <AdminActionButton onClick={() => setDraft(EMPTY_DRAFT)}>Cancel</AdminActionButton>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldShell label={meta.nameLabel}>
              <TextInput
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                required
                placeholder={meta.nameLabel}
              />
            </FieldShell>

            {meta.table === 'licenses' && !isEditing ? (
              <FieldShell label="Code" hint="Optional — derived from the name if blank">
                <TextInput value={draft.code} onChange={(e) => patch({ code: e.target.value })} placeholder="CC BY 4.0" />
              </FieldShell>
            ) : null}

            {meta.noteLabel ? (
              <FieldShell label={meta.noteLabel}>
                <TextInput value={draft.note} onChange={(e) => patch({ note: e.target.value })} placeholder="Optional" />
              </FieldShell>
            ) : null}

            {meta.table === 'licenses' ? (
              <>
                <FieldShell label="Family">
                  <TextInput value={draft.family} onChange={(e) => patch({ family: e.target.value })} placeholder="cc / mit / gpl" />
                </FieldShell>
                <FieldShell label="URL">
                  <TextInput
                    type="url"
                    value={draft.url}
                    onChange={(e) => patch({ url: e.target.value })}
                    placeholder="https://…"
                  />
                </FieldShell>
              </>
            ) : null}

            {meta.scoped ? (
              <FieldShell
                label="Component type"
                hint={
                  isEditing
                    ? 'Fixed while editing — add a new item to put it under another type'
                    : 'Blank applies it to every type'
                }
              >
                <TextSelect
                  value={formComponentType}
                  onChange={(e) => patch({ componentType: e.target.value })}
                  disabled={isEditing}
                >
                  <option value="">Every component type</option>
                  {typeOptions.map((t) => (
                    <option key={t.identifier} value={t.identifier}>
                      {t.name}
                    </option>
                  ))}
                </TextSelect>
              </FieldShell>
            ) : null}

            {meta.hardDelete ? null : (
              <FieldShell label="Sort order" hint="Lower shows first">
                <TextInput
                  type="number"
                  min={0}
                  value={draft.sortOrder}
                  onChange={(e) => patch({ sortOrder: e.target.value })}
                  placeholder="0"
                />
              </FieldShell>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add item'}
          </button>
        </form>

        {items.isLoading ? (
          <LoadingState label="Loading taxonomies…" />
        ) : items.error ? (
          <ErrorState error={items.error} onRetry={items.reload} />
        ) : rows.length === 0 ? (
          <EmptyState title="Empty list" body="Add the first item for this taxonomy." />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: 'name',
                header: meta.nameLabel,
                render: (row) => (
                  <div>
                    <p className={cn('font-semibold', !row.active && 'text-muted')}>{row.name}</p>
                    <p className="text-xs text-muted">{row.identifier}</p>
                  </div>
                ),
              },
              ...(meta.noteLabel
                ? [
                    {
                      key: 'note',
                      header: meta.noteLabel,
                      render: (row: Row) => (
                        <span className="text-muted">{row.note ?? '—'}</span>
                      ),
                    },
                  ]
                : []),
              ...(meta.table === 'licenses'
                ? [
                    {
                      key: 'family',
                      header: 'Family',
                      render: (row: Row) => (
                        <span className="text-muted">{row.family ?? '—'}</span>
                      ),
                    },
                  ]
                : []),
              ...(meta.scoped
                ? [
                    {
                      key: 'componentType',
                      header: 'Applies to',
                      render: (row: Row) =>
                        row.componentType ? (
                          <span className="text-muted">{row.componentType}</span>
                        ) : (
                          <StatusBadge tone="periwinkle">every type</StatusBadge>
                        ),
                    },
                  ]
                : []),
              ...(meta.table === 'tags'
                ? [
                    {
                      key: 'uses',
                      header: 'In use',
                      className: 'tabular-nums',
                      render: (row: Row) => row.inUse ?? 0,
                    },
                  ]
                : []),
              ...(meta.hardDelete
                ? []
                : [
                    {
                      key: 'state',
                      header: 'State',
                      render: (row: Row) =>
                        row.active ? (
                          <StatusBadge tone="green">active</StatusBadge>
                        ) : (
                          <StatusBadge tone="ink">retired</StatusBadge>
                        ),
                    },
                  ]),
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => {
                  const busy = busyId === row.identifier;
                  const inUse = row.inUse ?? 0;
                  return (
                    <AdminActionBar>
                      <AdminActionButton disabled={busy} onClick={() => startEdit(row)}>
                        Edit
                      </AdminActionButton>
                      {row.active ? (
                        <AdminActionButton
                          tone="danger"
                          disabled={busy || (meta.hardDelete && inUse > 0)}
                          title={
                            meta.hardDelete && inUse > 0
                              ? `Still used by ${inUse} design${inUse === 1 ? '' : 's'} or topic${inUse === 1 ? '' : 's'}`
                              : undefined
                          }
                          onClick={() => void retire(row)}
                        >
                          {meta.hardDelete ? 'Delete' : 'Deactivate'}
                        </AdminActionButton>
                      ) : (
                        <AdminActionButton tone="success" disabled={busy} onClick={() => void restore(row)}>
                          Restore
                        </AdminActionButton>
                      )}
                    </AdminActionBar>
                  );
                },
              },
            ]}
          />
        )}
      </AdminSection>
    </div>
  );
}
