import type { ReactNode } from 'react';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { cn } from '@/lib/utils';

type Col<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty,
}: {
  columns: Col<T>[];
  rows: T[];
  empty?: ReactNode;
}) {
  if (!rows.length) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;

  return (
    <Reveal y={16} className="overflow-x-auto rounded-[16px] border border-line bg-canvas shadow-soft">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-periwinkle-tint/40">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn('px-4 py-3 font-semibold text-ink-70', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0 hover:bg-periwinkle-tint/25">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 text-aubergine', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Reveal>
  );
}
