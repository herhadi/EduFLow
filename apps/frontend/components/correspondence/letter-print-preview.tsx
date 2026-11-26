'use client';
import { PrintPreview } from '../print/print-preview';
import type { LetterheadConfig } from './letterhead-settings';
type LetterDocumentData = {
  subject: string; recipient: string; letterDate: string; body: string; letterNumber?: string | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'REVISION_REQUESTED' | 'APPROVED';
  approver?: { name: string } | null; approvedAt?: string | null; signatureMode?: 'MANUAL' | 'TTE'; letterheadSnapshot?: LetterheadConfig | null;
};
type Props = { letter: LetterDocumentData; signatureMode: 'MANUAL' | 'TTE'; letterhead: LetterheadConfig | null; onClose: () => void };
const dateText = (value: string) => {
  const date = new Date(value.length === 10 ? value + 'T00:00:00' : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};
export function LetterPrintPreview({ letter, signatureMode, letterhead, onClose }: Props) {
  const approved = letter.status === 'APPROVED';
  const effectiveMode = letter.signatureMode ?? signatureMode;
  const head = letter.letterheadSnapshot ?? letterhead;
  const bodyParagraphs = letter.body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const page = (
    <div className="relative flex min-h-full flex-col font-serif text-[11pt] leading-[1.55] text-black">
      {!approved && <div className="mb-3 border border-amber-500 px-3 py-1 text-center font-sans text-[9pt] font-bold tracking-[0.18em] text-amber-800">DRAFT - BELUM DISAHKAN</div>}
      <header className={'flex items-center gap-3 pb-3 ' + (head?.borderStyle === 'none' ? '' : head?.borderStyle === 'single' ? 'border-b-2 border-black' : 'border-b-[3px] border-double border-black')}>
        <div className="flex w-[22mm] shrink-0 justify-center">{head?.logoLeft && <img src={head.logoLeft} alt="Logo kiri" style={{width:head.logoSize,height:head.logoSize,objectFit:'contain'}}/>}</div>
        <div className="min-w-0 flex-1">{head?.rows?.filter(row=>row.enabled && row.text.trim()).map((row,index)=><p key={index} style={{fontSize:row.fontSize+'pt',fontWeight:row.bold?700:400,textAlign:row.align,lineHeight:1.25}}>{row.text}</p>)}</div>
        <div className="flex w-[22mm] shrink-0 justify-center">{head?.logoRight && <img src={head.logoRight} alt="Logo kanan" style={{width:head.logoSize,height:head.logoSize,objectFit:'contain'}}/>}</div>
      </header>
      <div className="mt-5 text-center"><h2 className="text-[13pt] font-bold uppercase underline underline-offset-2">Surat</h2><p className="mt-1 text-[10pt]">Nomor: {letter.letterNumber || '........................................'}</p></div>
      <div className="mt-5 grid grid-cols-[92px_1fr] gap-x-2 text-[10.5pt]"><span>Lampiran</span><span>: -</span><span>Perihal</span><span className="font-bold">: {letter.subject}</span></div>
      <div className="mt-6"><p>Kepada Yth.</p><p className="whitespace-pre-wrap font-bold">{letter.recipient}</p><p>di Tempat</p></div>
      <div className="mt-5 space-y-3 text-justify"><p>Dengan hormat,</p>
        {bodyParagraphs.length ? bodyParagraphs.map((paragraph, index) => <p className="whitespace-pre-wrap indent-8" key={index}>{paragraph}</p>) : <p className="indent-8 text-gray-400">Isi surat belum diisi.</p>}
        <p>Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.</p>
      </div>
      <div className="mt-8 ml-auto w-[72mm] text-center text-[10.5pt]"><p>{dateText(letter.letterDate)}</p><p className="font-bold">Kepala Sekolah,</p>
        {effectiveMode === 'MANUAL' ? <div className="h-[28mm]" aria-label="Ruang tanda tangan basah" /> : <div className="my-2 flex h-[28mm] flex-col items-center justify-center border-y border-dashed border-gray-400 px-2 text-[8pt] text-gray-600"><span className="font-bold">AREA TANDA TANGAN ELEKTRONIK</span><span>TTE belum terhubung ke PSrE</span></div>}
        <p className="font-bold underline underline-offset-2">{head?.principalName || (approved ? letter.approver?.name : null) || '........................................'}</p><p>NIP. {head?.principalNip || letterhead?.principalNip || '........................................'}</p>
      </div>
      {approved && effectiveMode === 'MANUAL' && <p className="mt-5 border-t border-dashed border-gray-400 pt-2 text-center font-sans text-[8pt] text-gray-600">Dokumen ini telah memperoleh persetujuan internal melalui EduFlow. Tanda tangan basah dibubuhkan pada dokumen cetak.</p>}
      {approved && effectiveMode === 'TTE' && <p className="mt-5 border-t border-dashed border-gray-400 pt-2 text-center font-sans text-[8pt] text-gray-600">Status persetujuan internal. Dokumen ini belum memiliki tanda tangan elektronik tersertifikasi.</p>}
    </div>
  );
  return <PrintPreview title="Pratinjau Surat Keluar" pages={[page]} paperSize="F4" paperId="correspondence-letter-paper" footerText="Persuratan - EduFlow" onClose={onClose} />;
}
