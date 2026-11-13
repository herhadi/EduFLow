'use client';

import { type ReactNode } from 'react';

export type PrintPaperSize = 'F4' | 'A4' | 'A4_LANDSCAPE';

type PrintPreviewProps = {
  title: string;
  pages: ReactNode[];
  paperSize?: PrintPaperSize;
  paperId?: string;
  footerText?: string;
  onClose: () => void;
  onDownloadExcel?: () => void;
};

const PAPER_DIMENSIONS: Record<PrintPaperSize, { width: string; height: string; label: string }> = {
  F4: { width: '210mm', height: '330mm', label: 'F4 Portrait (210 × 330 mm)' },
  A4: { width: '210mm', height: '297mm', label: 'A4 Portrait (210 × 297 mm)' },
  A4_LANDSCAPE: { width: '297mm', height: '210mm', label: 'A4 Landscape (297 × 210 mm)' },
};

async function copyDocumentStyles(target: Document) {
  const pending: Promise<void>[] = [];
  document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    if (clone instanceof HTMLLinkElement) {
      pending.push(new Promise((resolve) => {
        clone.addEventListener('load', () => resolve(), { once: true });
        clone.addEventListener('error', () => resolve(), { once: true });
        if (clone.sheet) resolve();
      }));
    }
    target.head.appendChild(clone);
  });
  await Promise.all(pending);
  if (target.fonts?.ready) await target.fonts.ready;
}

export function PrintPreview({
  title,
  pages,
  paperSize = 'F4',
  paperId = 'jimpitan-print-paper',
  footerText = 'Dokumen administrasi sekolah',
  onClose,
  onDownloadExcel,
}: PrintPreviewProps) {
  const pageCount = pages.length;
  const dimensions = PAPER_DIMENSIONS[paperSize];

  async function printDocument() {
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
    await copyDocumentStyles(printDocument);

    const clonedDocument = source.cloneNode(true) as HTMLElement;
    clonedDocument.id = paperId;
    clonedDocument.removeAttribute('data-current-page');
    printDocument.body.appendChild(clonedDocument);

    const printStyles = printDocument.createElement('style');
    printStyles.textContent = `
      @page { size: ${dimensions.width} ${dimensions.height}; margin: 0; @bottom-right { content: "Hal " counter(page) "/" counter(pages); margin: 6mm 13mm; color: #475569; font: 9pt Arial, sans-serif; } }
      html, body { margin: 0 !important; padding: 0 !important; width: ${dimensions.width} !important; min-width: ${dimensions.width} !important; background: #fff !important; }
      #${paperId} {
        display: block !important; width: ${dimensions.width} !important; min-width: ${dimensions.width} !important;
        max-width: none !important; min-height: ${dimensions.height} !important; margin: 0 !important;
        padding: 0 !important; zoom: 1 !important; transform: none !important; overflow: visible !important;
        background: #fff !important; box-shadow: none !important;
      }
      #${paperId} .print-preview-page {
        display: block !important; position: relative !important; box-sizing: border-box !important;
        width: ${dimensions.width} !important; min-width: ${dimensions.width} !important;
        min-height: ${dimensions.height} !important; height: auto !important; margin: 0 !important;
        padding: 12mm 13mm !important; zoom: 1 !important; transform: none !important;
        overflow: visible !important; break-after: page; page-break-after: always;
      }
      #${paperId} .print-preview-page:last-child { break-after: auto; page-break-after: auto; }
      #${paperId} .print-preview-page, #${paperId} .print-preview-page * { visibility: visible !important; }
      #${paperId} .print-preview-page > * { break-inside: avoid; }
      #${paperId} .print-preview-footer { display: flex !important; justify-content: space-between; gap: 8mm; margin-top: 8mm; padding-top: 3mm; border-top: 0.2mm solid #cbd5e1; color: #475569; font: 9pt Arial, sans-serif; }
      #${paperId} .print-preview-page table tr { break-inside: avoid; page-break-inside: avoid; }
      #${paperId} .print-preview-page thead { display: table-header-group; }
      #${paperId} .print-preview-page tfoot { display: table-footer-group; }
      @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `;
    printDocument.head.appendChild(printStyles);

    const cleanup = () => iframe.remove();
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    printWindow.focus();
    printWindow.print();
    window.setTimeout(cleanup, 120000);
  }

  const printDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());

  return (
    <section aria-label={`Pratinjau cetak ${title}`} aria-modal="true" className="fixed inset-0 z-[120] flex flex-col bg-slate-200 text-slate-900" role="dialog">
      <header className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-base font-black">{title}</h2>
          <p className="text-xs text-slate-500">{dimensions.label} · {pageCount} halaman</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100" disabled={!pageCount || !onDownloadExcel} onClick={onDownloadExcel} type="button">Download Excel</button>
          <button className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-40" disabled={!pageCount} onClick={printDocument} type="button">Cetak</button>
          <button aria-label="Tutup pratinjau" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100" onClick={onClose} type="button">Tutup</button>
        </div>
      </header>

      <div className="print-preview-scroll min-h-0 flex-1 overflow-auto px-2 py-5 sm:px-6 sm:py-8">
        <div
          className="print-preview-paper mx-auto flex w-fit flex-col gap-5 bg-transparent text-black"
          id={paperId}
          style={{ width: dimensions.width }}
        >
          {pages.map((page, index) => (
            <article
              className="print-preview-page relative box-border bg-white px-[13mm] py-[12mm] text-black shadow-xl"
              key={index}
              style={{ width: dimensions.width, minHeight: dimensions.height }}
            >
              {page}
              <footer className="print-preview-footer mt-8 flex justify-between gap-4 border-t border-slate-300 pt-2 text-[10px] text-slate-600">
                <span>{footerText}</span>
                <span>Tanggal cetak: {printDate}</span>
              </footer>
            </article>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .print-preview-paper { zoom: 1; }
        @media (max-width: 480px) { .print-preview-paper { zoom: .46; } }
        @media (min-width: 481px) and (max-width: 600px) { .print-preview-paper { zoom: .56; } }
        @media (min-width: 601px) and (max-width: 900px) { .print-preview-paper { zoom: .72; } }
        @media (min-width: 901px) { .print-preview-paper { zoom: 1; } }
        .print-preview-page table tr { break-inside: avoid; page-break-inside: avoid; }
      `}</style>
    </section>
  );
}
