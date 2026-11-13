'use client';

import { useState, type ReactNode } from 'react';

type PrintPreviewProps = {
  title: string;
  pages: ReactNode[];
};

export function PrintPreview({ title, pages }: PrintPreviewProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = pages.length;
  const currentPageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-[var(--surface-solid)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-[var(--text)]">Pratinjau Cetak</h3>
          <p className="text-xs text-muted">{title} · F4 (210 × 330 mm)</p>
        </div>
        <button className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40" disabled={!pageCount} onClick={() => window.print()} type="button">Cetak</button>
      </div>
      <div className="mx-auto flex min-h-[490px] w-full max-w-[330px] flex-col items-center">
        {pageCount ? (
          <div className="print-preview-stage relative h-[470px] w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-inner">
            <div className="print-preview-scaled-page">
              <article className="print-preview-page relative bg-white p-[12mm] text-black">
                {pages[currentPageIndex]}
              </article>
            </div>
          </div>
        ) : (
          <div className="flex h-[470px] w-full items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-muted">Tidak ada halaman untuk dicetak.</div>
        )}
        <div className="mt-3 flex w-full items-center justify-between gap-2">
          <button aria-label="Halaman sebelumnya" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40 dark:border-[var(--border)] dark:text-[var(--text)]" disabled={currentPageIndex <= 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))} type="button">‹ Sebelumnya</button>
          <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-[var(--text)]">Halaman {pageCount ? currentPageIndex + 1 : 0}/{pageCount}</span>
          <button aria-label="Halaman berikutnya" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40 dark:border-[var(--border)] dark:text-[var(--text)]" disabled={currentPageIndex >= pageCount - 1} onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))} type="button">Berikutnya ›</button>
        </div>
      </div>
      <style jsx global>{`
        @page { size: 210mm 330mm; margin: 0; }
        .print-preview-page { box-sizing: border-box; width: 210mm; height: 330mm; overflow: hidden; }
        .print-preview-scaled-page { position: absolute; top: 0; left: 0; width: 210mm; height: 330mm; transform: scale(.38); transform-origin: top left; }
        @media print {
          body * { visibility: hidden !important; }
          .print-preview-page, .print-preview-page * { visibility: visible !important; }
          .print-preview-page { position: relative !important; display: block !important; page-break-after: always; break-after: page; }
          .print-preview-page:last-child { page-break-after: auto; break-after: auto; }
          .print-preview-stage { display: none !important; }
          .print-preview-stage, .print-preview-scaled-page { position: static !important; width: 210mm !important; height: 330mm !important; overflow: visible !important; transform: none !important; border: 0 !important; box-shadow: none !important; }
          .print-preview-stage { height: auto !important; }
          .print-preview-scaled-page { display: none !important; }
          .print-preview-document { display: block !important; }
        }
      `}</style>
      <div className="print-preview-document hidden">
        {pages.map((page, index) => <article className="print-preview-page relative bg-white p-[12mm] text-black" key={index}>{page}</article>)}
      </div>
    </section>
  );
}
