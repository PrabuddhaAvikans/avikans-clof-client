import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';
import { Select } from './Select';

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  showPageSize?: boolean;
};

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
  showPageSize = true,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  const goTo = (nextPage: number) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped !== page) {
      onChange(clamped, pageSize);
    }
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value);
    onChange(1, nextSize);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span>–
        <span className="font-medium text-foreground">{end}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {showPageSize && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onChange={handlePageSizeChange}
              options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
              className="w-20"
              aria-label="Page size"
              title="Rows per page"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          <IconButton
            variant="outline"
            size="sm"
            icon={<ChevronsLeft className="h-4 w-4" />}
            aria-label="First page"
            disabled={safePage <= 1}
            onClick={() => goTo(1)}
          />
          <IconButton
            variant="outline"
            size="sm"
            icon={<ChevronLeft className="h-4 w-4" />}
            aria-label="Previous page"
            disabled={safePage <= 1}
            onClick={() => goTo(safePage - 1)}
          />
          <span className="min-w-[80px] px-2 text-center text-sm text-foreground">
            {safePage} / {totalPages}
          </span>
          <IconButton
            variant="outline"
            size="sm"
            icon={<ChevronRight className="h-4 w-4" />}
            aria-label="Next page"
            disabled={safePage >= totalPages}
            onClick={() => goTo(safePage + 1)}
          />
          <IconButton
            variant="outline"
            size="sm"
            icon={<ChevronsRight className="h-4 w-4" />}
            aria-label="Last page"
            disabled={safePage >= totalPages}
            onClick={() => goTo(totalPages)}
          />
        </div>
      </div>
    </div>
  );
}
