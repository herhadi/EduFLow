'use client';

import { useState, type ReactNode } from 'react';

export type PrintPaperSize = 'F4' | 'A4' | 'A4_LANDSCAPE';

type PrintPreviewProps = {
  title: string;
  pages: ReactNode[];
  paperSize?: PrintPaperSize;
  paperId?: string;
  footerText?: string;
};

const PAPER_DIMENSIONS: Record<PrintPaperSize, { width: string; height: string; label: string }> = {
  F4: { width: '210mm', height: '330mm', label: 'F4 Portrait (210 × 330 mm)' },
  A4: { width: '210mm', height: '297mm', label: 'A4 Portrait (210 × 297 mm)' },
  A4_LANDSCAPE: { width: '297mm', height: '210mm', label: 'A4 Landscape (297 × 210 mm)' },
};

function copyDocumentStyles(target: Document) {
  document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    target.head.appendChild(node.cloneNode(true));
  });
}

export function PrintPreview({
  title,
  pages,
  paperSize = 'F4',
  paperId = 'jimpitan-print-paper',
  footerText = 'Dokumen administrasi sekolah',
}: PrintPreviewProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = pages.length;
  const currentPageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const dimensions = PAPER_DIMENSIONS[paperSize];

  function printDocument() {
    const source = document.getElementById(paperId);
    if (!source || !pageCount) return;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.title = `Cetak ${title}`;
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const printDocument = iframe.contentDocument;
    const printWindow = iframe.contentWindow;
    if (!printDocument || !printWindow) {
      iframe.remove();
      return;
    }

    printDocument.open();
    printDocument.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
    printDocument.close();
    copyDocumentStyles(printDocument);

    const clonedDocument = source.cloneNode(true) as HTMLElement;
    clonedDocument.id = paperId;
    clonedDocument.removeAttribute('data-current-page');
    printDocument.body.appendChild(clonedDocument);

    const printStyles = printDocument.createElement('style');
    printStyles.textContent = `
      @page { size: ${dimensions.width} ${dimensions.height}; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; width: ${dimensions.width} !important; min-width: ${dimensions.width} !important; background: #fff !important; }
      #${paperId} {
        display: block !important;
        width: ${dimensions.width} !important;
        min-width: ${dimensions.width} !important;
        max-width: none !important;
        min-height: ${dimensions.height} !important;
        margin: 0 !important;
        padding: 0 !important;
        zoom: 1 !important;
        transform: none !important;
        overflow: visible !important;
        background: #fff !important;
      }
      #${paperId} .print-preview-page {
        display: block !important;
        position: relative !important;
        box-sizing: border-box !important;
        width: ${dimensions.width} !important;
        min-width: ${dimensions.width} !important;
        min-height: ${dimensions.height} !important;
        height: auto !important;
        margin: 0 !important;
        padding: 12mm 13mm !important;
        zoom: 1 !important;
        transform: none !important;
        overflow: visible !important;
        break-after: page;
        page-break-after: always;
      }
      #${paperId} .print-preview-page:last-child { break-after: auto; page-break-after: auto; }
      #${paperId} .print-preview-page,
      #${paperId} .print-preview-page * { visibility: visible !important; }
      #${paperId} .print-preview-page > * { break-inside: avoid; }
      #${paperId} .print-preview-footer {
        display: flex !important;
        justify-content: space-between;
        gap: 8mm;
        margin-top: 8mm;
        padding-top: 3mm;
        border-top: 0.2mm solid #cbd5e1;
        color: #475569;
        font: 9pt Arial, sans-serif;
      }
      #${paperId} .print-preview-page table tr { break-inside: avoid; page-break-inside: avoid; }
      #${paperId} .print-preview-page thead { display: table-header-group; }
      #${paperId} .print-preview-page tfoot { display: table-footer-group; }
      @media print {
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `;
    printDocument.head.appendChild(printStyles);

    const cleanup = () => {
      iframe.remove();
    };
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    printWindow.focus();
    printWindow.print();
    window.setTimeout(cleanup, 120000);
  }

  const printDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-[var(--surface-solid)]">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-[var(--text)]">Pratinjau Cetak</h3>
          <p className="text-xs text-muted">{title} · {dimensions.label}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 dark:border-[var(--border)] dark:text-[var(--text)]" disabled={!pageCount || pageIndex === 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))} type="button">‹ Sebelumnya</button>
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 dark:border-[var(--border)] dark:text-[var(--text)]" disabled={!pageCount || pageIndex >= pageCount - 1} onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))} type="button">Berikutnya ›</button>
          <button className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40" disabled={!pageCount} onClick={printDocument} type="button">Cetak</button>
        </div>
      </div>

      <div className="mb-3 text-center text-xs font-bold tabular-nums text-slate-700 dark:text-[var(--text)]">
        Halaman {pageCount ? currentPageIndex + 1 : 0}/{pageCount}
      </div>

      <div className="print-preview-scroll max-h-[72vh] overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-[var(--border)]">
        <div
          id={paperId}
          className="print-preview-paper mx-auto bg-white text-black shadow-lg"
          data-current-page={currentPageIndex}
          style={{ width: dimensions.width, minHeight: dimensions.height }}
        >
          {pages.map((page, index) => (
            <article
              aria-hidden={index !== currentPageIndex}
              className="print-preview-page relative box-border bg-white px-[13mm] py-[12mm] text-black"
              data-preview-active={index === currentPageIndex ? 'true' : 'false'}
              key={index}
              style={{ display: index === currentPageIndex ? 'block' : 'none', width: dimensions.width, minHeight: dimensions.height }}
            >
              {page}
              <footer className="print-preview-footer mt-8 flex justify-between gap-4 border-t border-slate-300 pt-2 text-[10px] text-slate-600">
                <span>{footerText}</span>
                <span>Tanggal cetak: {printDate} · Hal {index + 1}/{pageCount}</span>
              </footer>
            </article>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .print-preview-paper { zoom: 1; }
        @media (max-width: 480px) {
          .print-preview-paper { zoom: .46; }
        }
        @media (min-width: 481px) and (max-width: 600px) {
          .print-preview-paper { zoom: .56; }
        }
        @media (min-width: 601px) and (max-width: 900px) {
          .print-preview-paper { zoom: .72; }
        }
        @media (min-width: 901px) {
          .print-preview-paper { zoom: 1; }
        }
        .print-preview-page table tr { break-inside: avoid; page-break-inside: avoid; }
      `}</style>
    </section>
  );
}
