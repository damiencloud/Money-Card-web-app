import { cn } from '@/utils';

// ==========================================
// Table Foundation (Mobile-Responsive Container)
// ==========================================

export interface Column<T> {
  key?: string;
  accessorKey?: string;
  id?: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  cell?: (info: { row: { original: T } }) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T) => string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string | undefined;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  rowClassName,
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

  const getKey =
    keyExtractor ||
    ((item: any) => String(item?.id ?? item?.key ?? item?._id ?? JSON.stringify(item)));

  return (
    <div className={cn('relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800', className)}>
      <table className="w-full text-left border-collapse min-w-[580px] sm:min-w-full">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/40">
            {columns.map((col, idx) => {
              const colKey = col.key || col.accessorKey || col.id || `col_${idx}`;
              return (
                <th
                  key={colKey}
                  className={cn(
                    'px-3 sm:px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-200 select-none whitespace-nowrap',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {data.map((item) => (
            <tr
              key={getKey(item)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={cn(
                'transition-colors',
                onRowClick
                  ? 'cursor-pointer hover:bg-slate-800/30 active:bg-slate-800/50'
                  : 'hover:bg-slate-800/20',
                rowClassName?.(item),
              )}
            >
              {columns.map((col, idx) => {
                const colKey = col.key || col.accessorKey || col.id || `col_${idx}`;
                let renderedContent: React.ReactNode = null;
                if (col.render) {
                  renderedContent = col.render(item);
                } else if (col.cell) {
                  renderedContent = col.cell({ row: { original: item } });
                } else if (col.key || col.accessorKey) {
                  const propertyKey = (col.key || col.accessorKey) as keyof T;
                  renderedContent = String((item as Record<string, unknown>)[propertyKey as string] ?? '');
                }

                return (
                  <td
                    key={colKey}
                    className={cn('px-3 sm:px-4 py-3.5 text-xs sm:text-sm text-slate-100 dark:text-slate-100 font-medium', col.className)}
                  >
                    {renderedContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
