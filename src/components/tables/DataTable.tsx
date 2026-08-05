import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/Checkbox';
import { Pagination } from '@/components/ui/Pagination';
import { IconButton } from '@/components/ui/IconButton';

export type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  pageSize?: number;
  enableSorting?: boolean;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  bulkActions?: (selectedRows: TData[]) => ReactNode;
  renderMobileCard?: (row: Row<TData>) => ReactNode;
  /** Always show the table with horizontal scroll (skip mobile card stacking). */
  forceTable?: boolean;
  density?: 'comfortable' | 'compact';
  className?: string;
  emptyMessage?: string;
  getRowId?: (row: TData) => string;
};

export function DataTable<TData>({
  data,
  columns,
  pageSize: initialPageSize = 10,
  enableSorting = true,
  enableRowSelection = false,
  enableColumnVisibility = true,
  bulkActions,
  renderMobileCard,
  forceTable = false,
  density = 'comfortable',
  className,
  emptyMessage = 'No results found',
  getRowId,
}: DataTableProps<TData>) {
  const useMobileCards = Boolean(renderMobileCard) && !forceTable;
  const isCompact = density === 'compact';
  const cellPad = isCompact ? 'px-2 py-1.5' : 'px-3 py-2.5';
  const headerPad = isCompact ? 'px-2 py-1.5' : 'px-3 py-2.5';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const tableColumns = useMemo(() => {
    if (!enableRowSelection) return columns;

    const selectionColumn: ColumnDef<TData, unknown> = {
      id: '__select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      pagination: { pageIndex, pageSize },
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection,
    getRowId,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const totalRows = data.length;

  useEffect(() => {
    setPageIndex(0);
  }, [data.length, pageSize]);

  const handlePaginationChange = (page: number, size: number) => {
    setPageIndex(page - 1);
    setPageSize(size);
  };

  return (
    <div className={cn(isCompact ? 'space-y-2' : 'space-y-4', className)}>
      {(enableColumnVisibility || (enableRowSelection && selectedRows.length > 0 && bulkActions)) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {enableRowSelection && selectedRows.length > 0 && bulkActions && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 py-1.5">
              <span className="text-sm text-muted-foreground">
                {selectedRows.length} selected
              </span>
              {bulkActions(selectedRows)}
            </div>
          )}

          {enableColumnVisibility && (
            <div className="relative ml-auto">
              <IconButton
                variant="outline"
                size="sm"
                icon={<Columns3 className="h-4 w-4" />}
                aria-label="Toggle column visibility"
                onClick={() => setShowColumnMenu((prev) => !prev)}
              />
              {showColumnMenu && (
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-border bg-popover p-2 shadow-md">
                  {table
                    .getAllColumns()
                    .filter((col) => col.getCanHide())
                    .map((column) => (
                      <label
                        key={column.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                          aria-label={`Toggle ${column.id} column`}
                        />
                        <span className="capitalize">{column.id.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table — horizontal scroll on narrow viewports instead of stacked cards when forceTable */}
      <div
        className={cn(
          'overflow-hidden rounded-md border border-border bg-card',
          useMobileCards && 'hidden md:block',
        )}
      >
        <div className="overflow-x-auto">
          <table className={cn('w-full min-w-[720px]', isCompact ? 'text-[12px]' : 'text-[13px]')}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                  {headerGroup.headers.map((header) => {
                    const canSort = enableSorting && header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        className={cn(
                          headerPad,
                          'whitespace-nowrap text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumns.length}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border last:border-0 hover:bg-muted/40',
                      row.getIsSelected() && 'bg-muted',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cn(cellPad, 'whitespace-nowrap text-foreground')}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optional mobile card view */}
      {useMobileCards && renderMobileCard && (
        <div className="space-y-2 md:hidden">
          {table.getRowModel().rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            table.getRowModel().rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  'rounded-md border border-border bg-card p-3',
                  row.getIsSelected() && 'ring-1 ring-foreground/20',
                )}
              >
                {enableRowSelection && (
                  <div className="mb-3">
                    <Checkbox
                      checked={row.getIsSelected()}
                      onChange={row.getToggleSelectedHandler()}
                      aria-label="Select row"
                    />
                  </div>
                )}
                {renderMobileCard(row)}
              </div>
            ))
          )}
        </div>
      )}

      {totalRows > 0 && (
        <Pagination
          page={pageIndex + 1}
          pageSize={pageSize}
          total={totalRows}
          onChange={handlePaginationChange}
        />
      )}
    </div>
  );
}

export type { ColumnDef, Row } from '@tanstack/react-table';
