'use client';

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);

  if (totalItems <= pageSize) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold text-muted">
        Halaman {safePage} dari {totalPages} · {totalItems} data
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          type="button"
        >
          Sebelumnya
        </button>
        <button
          className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          type="button"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
