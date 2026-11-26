'use client';
import { useCallback, useEffect, useState } from 'react';
import { LetterPrintPreview } from './letter-print-preview';
import type { LetterheadConfig } from './letterhead-settings';
import { request } from '../../lib/api-client';

type Letter = {
  id: string; subject: string; recipient: string; letterDate: string; body: string;
  status: 'DRAFT'|'PENDING_APPROVAL'|'REVISION_REQUESTED'|'APPROVED';
  letterNumber?: string|null; revisionNote?: string|null; approvalCode?: string|null;
  contentHash?: string|null; submittedAt?: string|null; approvedAt?: string|null; signatureMode?: 'MANUAL'|'TTE';
  creator?: { name: string }; approver?: { name: string }; letterheadSnapshot?: LetterheadConfig | null;
};
type Incoming = { id:string; referenceNumber?:string|null; sender:string; subject:string; letterDate?:string|null; receivedAt:string; notes?:string|null };
type Props = { mode: 'tu'|'principal' };
type SignatureSettings = { mode: 'MANUAL'|'TTE'; tteProviderConfigured: boolean; tteStatus: string };
const statusLabel: Record<Letter['status'], string> = { DRAFT:'Draft', PENDING_APPROVAL:'Menunggu persetujuan', REVISION_REQUESTED:'Perlu revisi', APPROVED:'Disetujui' };
const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const buttonClass = 'rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50';
export function CorrespondenceWorkspace({ mode }: Props) {
  const [outgoing,setOutgoing]=useState<Letter[]>([]);
  const [incoming,setIncoming]=useState<Incoming[]>([]);
  const [approvals,setApprovals]=useState<Letter[]>([]);
  const [signatureSettings,setSignatureSettings]=useState<SignatureSettings|null>(null);
  const [letterhead,setLetterhead]=useState<LetterheadConfig|null>(null);
  const [previewLetter,setPreviewLetter]=useState<Letter|null>(null);
  const [subject,setSubject]=useState(''); const [recipient,setRecipient]=useState('');
  const [letterDate,setLetterDate]=useState(new Date().toISOString().slice(0,10)); const [body,setBody]=useState('');
  const [sender,setSender]=useState(''); const [referenceNumber,setReferenceNumber]=useState(''); const [incomingSubject,setIncomingSubject]=useState('');
  const [revision,setRevision]=useState<Record<string,string>>({});
  const [editingId,setEditingId]=useState<string|null>(null);
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    try {
      const [o,i,signature,head]=await Promise.all([request<{data:Letter[]}>('/correspondence/outgoing'),request<{data:Incoming[]}>('/correspondence/incoming'),request<{data:SignatureSettings}>('/correspondence/signature-settings'),request<{data:LetterheadConfig}>('/correspondence/letterhead-settings')]);
      setOutgoing(o.data??[]); setIncoming(i.data??[]); setSignatureSettings(signature.data); setLetterhead(head.data);
      if(mode==='principal'){ const a=await request<{data:Letter[]}>('/correspondence/approvals'); setApprovals(a.data??[]); }
    } catch(e){setError(e instanceof Error?e.message:'Gagal memuat data persuratan');}
  },[mode]);
  useEffect(()=>{void refresh();},[refresh]);
  const run=async(fn:()=>Promise<unknown>,success:string)=>{setBusy(true);setError('');setMessage('');try{await fn();setMessage(success);await refresh();}catch(e){setError(e instanceof Error?e.message:'Proses gagal');}finally{setBusy(false);}};
  const createOutgoing=()=>run(async()=>{const payload=JSON.stringify({subject,recipient,letterDate,body});if(editingId){await request('/correspondence/outgoing/'+editingId,{method:'PATCH',body:payload});setEditingId(null);}else{await request('/correspondence/outgoing',{method:'POST',body:payload});}setSubject('');setRecipient('');setBody('');},editingId?'Draft surat berhasil diperbarui.':'Draft surat berhasil disimpan.');
  const createIncoming=()=>run(async()=>{await request('/correspondence/incoming',{method:'POST',body:JSON.stringify({sender,referenceNumber,subject:incomingSubject})});setSender('');setReferenceNumber('');setIncomingSubject('');},'Surat masuk berhasil dicatat.');
  const submit=(id:string)=>run(()=>request('/correspondence/outgoing/'+id+'/submit',{method:'POST'}),'Surat dikirim kepada Kepala Sekolah.');
  const decide=(id:string,status:'APPROVED'|'REVISION_REQUESTED')=>run(()=>request('/correspondence/outgoing/'+id+'/decision',{method:'PATCH',body:JSON.stringify({status,revisionNote:revision[id]})}),status==='APPROVED'?'Surat disetujui dan nomor diterbitkan.':'Surat dikembalikan untuk revisi.');
  return <div className="mt-6 space-y-8">
    {signatureSettings&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><b>Model tanda tangan aktif:</b> {signatureSettings.mode==='MANUAL'?'Manual - cetak surat untuk ditandatangani Kepala Sekolah.':'TTE - penyedia TTE/PSrE belum terhubung; persetujuan TTE belum dapat diproses.'}</div>}
    {message&&<p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
    {error&&<p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
    {mode==='tu'?<>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingId?'Edit Draft Surat':'Buat Surat Keluar'}</h2>
        <p className="mt-1 text-sm text-muted">Surat harus disetujui Kepala Sekolah sebelum nomor surat diterbitkan.</p>
        <details className="mt-4 rounded-xl border border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-sky-900 marker:hidden dark:text-sky-200">
            <span className="flex items-center gap-2"><span aria-hidden="true">ⓘ</span> Petunjuk penulisan surat</span>
            <span className="shrink-0 text-xs font-medium text-sky-700 dark:text-sky-300">Klik untuk melihat ▾</span>
          </summary>
          <div className="space-y-2 border-t border-sky-200 px-4 py-3 text-sm leading-6 text-sky-950 dark:border-sky-900 dark:text-sky-100">
            <p><b>Paragraf baru:</b> tekan Enter dua kali sehingga ada satu baris kosong di antara paragraf.</p>
            <p><b>Baris berikutnya dalam paragraf yang sama:</b> tekan Enter satu kali.</p>
            <p><b>Surat panjang:</b> isi surat akan berlanjut ke halaman berikutnya saat dicetak. Periksa hasilnya melalui tombol Pratinjau Cetak.</p>
            <p><b>Jarak penutup dan tanda tangan:</b> atur jumlah baris kosong serta posisi tanggal dan tanda tangan melalui menu Kop Surat → Format Surat dan Penandatangan.</p>
          </div>
        </details>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className={fieldClass} placeholder="Perihal surat" value={subject} onChange={e=>setSubject(e.target.value)}/>
          <input className={fieldClass} placeholder="Tujuan / penerima" value={recipient} onChange={e=>setRecipient(e.target.value)}/>
          <input className={fieldClass} type="date" value={letterDate} onChange={e=>setLetterDate(e.target.value)}/>
          <label className="sm:col-span-2"><textarea className={fieldClass+' min-h-40'} placeholder="Isi surat. Pisahkan setiap paragraf dengan satu baris kosong." value={body} onChange={e=>setBody(e.target.value)}/><span className="mt-1 block text-xs text-muted">Gunakan petunjuk penulisan di atas jika memerlukan bantuan.</span></label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" disabled={!subject.trim()||!recipient.trim()||!body.trim()} onClick={()=>setPreviewLetter({id:'draft-preview',subject,recipient,letterDate,body,status:'DRAFT'})}>Pratinjau Cetak</button><button className={buttonClass} disabled={busy||!subject.trim()||!recipient.trim()||!body.trim()} onClick={()=>void createOutgoing()}>{editingId?'Simpan Perubahan':'Simpan Draft'}</button></div>{editingId&&<button className="ml-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700" onClick={()=>{setEditingId(null);setSubject('');setRecipient('');setBody('');}}>Batal</button>}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Surat Keluar</h2>
        <div className="space-y-3">{outgoing.map(letter=><article key={letter.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-900 dark:text-white">{letter.subject}</h3><p className="mt-1 text-sm text-muted">Kepada {letter.recipient} · {new Date(letter.letterDate).toLocaleDateString('id-ID')}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{statusLabel[letter.status]}</span></div>
          {letter.letterNumber&&<p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Nomor: {letter.letterNumber}</p>}
          <button type="button" className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" onClick={()=>setPreviewLetter(letter)}>Pratinjau Cetak</button>
          {letter.revisionNote&&<p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Catatan revisi: {letter.revisionNote}</p>}
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{letter.body}</p>
          {letter.status==='APPROVED'&&<div className="mt-4 border-t border-dashed border-slate-300 pt-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"><p>Persetujuan internal oleh <b>{letter.approver?.name??'Kepala Sekolah'}</b></p><p>{letter.approvedAt?new Date(letter.approvedAt).toLocaleString('id-ID'):''} · Kode verifikasi {letter.approvalCode?.slice(0,8).toUpperCase()}</p></div>}
          {(letter.status==='DRAFT'||letter.status==='REVISION_REQUESTED')&&<div className="mt-3 flex flex-wrap gap-2"><button className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700" onClick={()=>{setEditingId(letter.id);setSubject(letter.subject);setRecipient(letter.recipient);setLetterDate(new Date(letter.letterDate).toISOString().slice(0,10));setBody(letter.body);window.scrollTo({top:0,behavior:'smooth'});}}>Edit Draft</button><button className={buttonClass} disabled={busy} onClick={()=>void submit(letter.id)}>Ajukan ke Kepala Sekolah</button></div>}
        </article>)}{!outgoing.length&&<p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-muted dark:border-slate-700">Belum ada surat keluar.</p>}</div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Catat Surat Masuk</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><input className={fieldClass} placeholder="Nomor surat" value={referenceNumber} onChange={e=>setReferenceNumber(e.target.value)}/><input className={fieldClass} placeholder="Pengirim" value={sender} onChange={e=>setSender(e.target.value)}/><input className={fieldClass} placeholder="Perihal" value={incomingSubject} onChange={e=>setIncomingSubject(e.target.value)}/></div><button className={buttonClass+' mt-3'} disabled={busy||!sender.trim()||!incomingSubject.trim()} onClick={()=>void createIncoming()}>Catat Surat Masuk</button></section>
      <section><h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Register Surat Masuk</h2><div className="space-y-2">{incoming.map(item=><article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="font-semibold text-slate-900 dark:text-white">{item.subject}</p><p className="text-sm text-muted">{item.sender} · {item.referenceNumber||'Tanpa nomor'} · diterima {new Date(item.receivedAt).toLocaleDateString('id-ID')}</p></article>)}{!incoming.length&&<p className="text-sm text-muted">Belum ada surat masuk.</p>}</div></section>
    </>:<section><h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Persetujuan Surat Keluar</h2><p className="mb-4 text-sm text-muted">Periksa isi surat sebelum menyetujui. Nomor surat diterbitkan setelah persetujuan.</p><div className="space-y-4">{approvals.map(letter=><article key={letter.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold text-slate-900 dark:text-white">{letter.subject}</h3><p className="text-sm text-muted">Kepada {letter.recipient} · diajukan {letter.creator?.name}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">Menunggu persetujuan</span></div><div className="my-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-800 dark:bg-slate-950 dark:text-slate-200">{letter.body}</div><button type="button" className="mb-3 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={()=>setPreviewLetter(letter)}>Pratinjau Cetak</button><textarea className={fieldClass} placeholder="Catatan revisi (wajib jika dikembalikan)" value={revision[letter.id]??''} onChange={e=>setRevision(v=>({...v,[letter.id]:e.target.value}))}/><div className="mt-3 flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={()=>void decide(letter.id,'APPROVED')}>Setujui & Terbitkan Nomor</button><button className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300" disabled={busy||!(revision[letter.id]??'').trim()} onClick={()=>void decide(letter.id,'REVISION_REQUESTED')}>Minta Revisi</button></div></article>)}{!approvals.length&&<p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-muted dark:border-slate-700">Tidak ada surat yang menunggu persetujuan.</p>}</div></section>}
    <p className="text-xs text-muted">Persetujuan internal mencatat akun penyetuju dan waktu persetujuan. TTE tersertifikasi hanya aktif setelah penyedia PSrE dikonfigurasi.</p>
    {previewLetter&&<LetterPrintPreview letter={previewLetter} signatureMode={signatureSettings?.mode??'MANUAL'} letterhead={letterhead} onClose={()=>setPreviewLetter(null)}/> }
  </div>;
}
