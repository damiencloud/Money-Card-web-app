import { cn } from '@/utils';

// ==========================================
// Table Foundation (Mobile-Responsive Container)
// ==========================================

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  className,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800', className)}>
      <table className="w-full text-left border-collapse min-w-[580px] sm:min-w-full">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/40">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 select-none whitespace-nowrap',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={cn(
                'transition-colors',
                onRowClick
                  ? 'cursor-pointer hover:bg-slate-800/30 active:bg-slate-800/50'
                  : 'hover:bg-slate-800/20',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-3 sm:px-4 py-3.5 text-xs sm:text-sm text-slate-300', col.className)}
                >
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
