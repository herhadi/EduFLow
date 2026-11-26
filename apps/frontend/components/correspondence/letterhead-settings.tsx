'use client';
import { useEffect, useState } from 'react';
import { request } from '../../lib/api-client';

type HeaderRow = { text: string; fontSize: number; bold: boolean; align: 'left'|'center'|'right'; enabled: boolean };
export type LetterheadConfig = { logoLeft: string|null; logoRight: string|null; rows: HeaderRow[]; textAlign: 'left'|'center'|'right'; borderStyle: 'single'|'double'|'none'; logoSize: number; principalName?: string|null; principalNip?: string|null; documentTitle?: string; numberLabel?: string; openingText?: string; closingText?: string; signatureCity?: string; signatureTitle?: string; signatureName?: string; signatureNip?: string; signatureAlign?: 'left'|'center'|'right' };
const initial: LetterheadConfig = { logoLeft: null, logoRight: null, rows: [{text:'PEMERINTAH KABUPATEN BATANG',fontSize:12,bold:true,align:'center',enabled:true},{text:'DINAS PENDIDIKAN DAN KEBUDAYAAN',fontSize:12,bold:true,align:'center',enabled:true},{text:'NAMA SEKOLAH',fontSize:18,bold:true,align:'center',enabled:true},{text:'Alamat sekolah · Telepon · Email',fontSize:10,bold:false,align:'center',enabled:true}], textAlign:'center', borderStyle:'double', logoSize:88, documentTitle:'SURAT', numberLabel:'Nomor', openingText:'Dengan hormat,', closingText:'Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.', signatureCity:'Batang', signatureTitle:'Kepala Sekolah', signatureName:'', signatureNip:'', signatureAlign:'center' };
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
function LogoField({title,value,onChange}:{title:string;value:string|null;onChange:(v:string|null)=>void}) {
  const choose = async (file?:File) => {
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){alert('Gunakan file PNG, JPG, atau WebP.');return;}
    if(file.size>2*1024*1024){alert('Ukuran file asli maksimal 2 MB.');return;}
    try {
      const bitmap=await createImageBitmap(file);
      const scale=Math.min(1,180/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const context=canvas.getContext('2d');if(!context)throw new Error('Gagal memproses gambar.');
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const optimized=canvas.toDataURL('image/webp',0.68);
      if(optimized.length>42000){alert('Logo terlalu kompleks. Gunakan gambar yang lebih sederhana atau beresolusi lebih kecil.');return;}
      onChange(optimized);
    } catch { alert('Gambar tidak dapat diproses. Coba gunakan PNG atau JPG lain.'); }
  };
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">{value?<img src={value} alt={title} className="max-h-14 max-w-14 object-contain"/>:<span className="text-xs text-muted">Logo</span>}</div>
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p><label className="mt-1 inline-block cursor-pointer text-sm font-semibold text-brand-600">Pilih gambar<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e=>choose(e.target.files?.[0])}/></label>{value&&<button type="button" className="ml-3 text-sm font-semibold text-red-600" onClick={()=>onChange(null)}>Hapus</button>}<p className="text-xs text-muted">PNG/JPG/WebP, otomatis dioptimalkan</p></div>
  </div>;
}
export function LetterheadSettings() {
  const [config,setConfig]=useState<LetterheadConfig>(initial);
  const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [message,setMessage]=useState('');const [error,setError]=useState('');
  useEffect(()=>{request<{data:LetterheadConfig}>('/correspondence/letterhead-settings').then(r=>{const data=r.data;setConfig({...initial,...data,rows:data.rows??initial.rows});}).catch(e=>setError(e instanceof Error?e.message:'Gagal memuat pengaturan kop.')).finally(()=>setLoading(false));},[]);
  const updateRow=(index:number,patch:Partial<HeaderRow>)=>setConfig(c=>({...c,rows:c.rows.map((r,i)=>i===index?{...r,...patch}:r)}));
  const moveRow=(index:number,delta:number)=>setConfig(c=>{const rows=[...c.rows];const target=index+delta;if(target<0||target>=rows.length)return c;[rows[index],rows[target]]=[rows[target],rows[index]];return {...c,rows};});
  const save=async()=>{setBusy(true);setMessage('');setError('');try{const r=await request<{data:LetterheadConfig;message:string}>('/correspondence/letterhead-settings',{method:'PATCH',body:JSON.stringify(config)});setConfig(r.data);setMessage(r.message);}catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan kop surat.');}finally{setBusy(false);}};
  const border=config.borderStyle==='double'?'border-b-[3px] border-double':config.borderStyle==='single'?'border-b-2':'';
  return <div className="mt-6 space-y-5">
    {message&&<p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
    {error&&<p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
    <section className={panel}>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Logo kop surat</h2><p className="mt-1 text-sm text-muted">Gunakan logo sekolah atau instansi. Logo kiri dan kanan dapat digunakan bersamaan.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><LogoField title="Logo kiri" value={config.logoLeft} onChange={v=>setConfig(c=>({...c,logoLeft:v}))}/><LogoField title="Logo kanan" value={config.logoRight} onChange={v=>setConfig(c=>({...c,logoRight:v}))}/></div>
      <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Ukuran logo: {config.logoSize}px<input type="range" min="48" max="140" value={config.logoSize} onChange={e=>setConfig(c=>({...c,logoSize:Number(e.target.value)}))} className="mt-2 w-full"/></label>
    </section>
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Susunan teks kop</h2><p className="text-sm text-muted">Tambahkan dan atur setiap baris sesuai identitas sekolah (maksimal 10 baris).</p></div><button type="button" disabled={config.rows.length>=10} onClick={()=>setConfig(c=>({...c,rows:[...c.rows,{text:'',fontSize:11,bold:false,align:c.textAlign,enabled:true}]}))} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">+ Tambah Baris</button></div>
      <div className="mt-4 space-y-3">{config.rows.map((row,index)=><div key={index} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Baris {index+1}</span><div className="flex items-center gap-2"><button type="button" disabled={!index} onClick={()=>moveRow(index,-1)} className="rounded border px-2 py-1 text-xs disabled:opacity-30 dark:border-slate-700">Naik</button><button type="button" disabled={index===config.rows.length-1} onClick={()=>moveRow(index,1)} className="rounded border px-2 py-1 text-xs disabled:opacity-30 dark:border-slate-700">Turun</button><button type="button" onClick={()=>setConfig(c=>({...c,rows:c.rows.filter((_,i)=>i!==index)}))} className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 dark:border-red-900">Hapus</button></div></div>
        <input className={field} value={row.text} maxLength={200} placeholder="Isi teks baris kop" onChange={e=>updateRow(index,{text:e.target.value})}/>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><label className="text-xs text-muted">Ukuran huruf<select className={field+' mt-1'} value={row.fontSize} onChange={e=>updateRow(index,{fontSize:Number(e.target.value)})}>{[9,10,11,12,14,16,18,20,22].map(n=><option key={n} value={n}>{n} pt</option>)}</select></label><label className="text-xs text-muted">Perataan<select className={field+' mt-1'} value={row.align} onChange={e=>updateRow(index,{align:e.target.value as HeaderRow['align']})}><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></label><label className="flex items-end gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={row.bold} onChange={e=>updateRow(index,{bold:e.target.checked})}/> Tebal (Bold)</label><label className="flex items-end gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={row.enabled} onChange={e=>updateRow(index,{enabled:e.target.checked})}/> Tampilkan</label></div>
      </div>)}</div>
    </section>
    <section className={panel}>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Format surat dan penandatangan</h2>
      <p className="mt-1 text-sm text-muted">Atur judul setelah kop, label nomor, paragraf pembuka/penutup, serta blok tanggal dan tanda tangan.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-muted">Judul surat<input className={field+' mt-1'} maxLength={80} value={config.documentTitle??'SURAT'} onChange={e=>setConfig(c=>({...c,documentTitle:e.target.value}))}/></label>
        <label className="text-sm text-muted">Label nomor surat<input className={field+' mt-1'} maxLength={50} value={config.numberLabel??'Nomor'} onChange={e=>setConfig(c=>({...c,numberLabel:e.target.value}))}/></label>
        <label className="text-sm text-muted sm:col-span-2">Kalimat pembuka<textarea className={field+' mt-1 min-h-16'} maxLength={1000} value={config.openingText??''} onChange={e=>setConfig(c=>({...c,openingText:e.target.value}))}/></label>
        <label className="text-sm text-muted sm:col-span-2">Kalimat penutup<textarea className={field+' mt-1 min-h-24'} maxLength={2000} value={config.closingText??''} onChange={e=>setConfig(c=>({...c,closingText:e.target.value}))}/></label>
        <label className="text-sm text-muted">Kota/kabupaten pada tanggal<input className={field+' mt-1'} maxLength={80} value={config.signatureCity??'Batang'} onChange={e=>setConfig(c=>({...c,signatureCity:e.target.value}))}/></label>
        <label className="text-sm text-muted">Jabatan penandatangan<input className={field+' mt-1'} maxLength={120} value={config.signatureTitle??'Kepala Sekolah'} onChange={e=>setConfig(c=>({...c,signatureTitle:e.target.value}))}/></label>
        <label className="text-sm text-muted">Nama penandatangan<input className={field+' mt-1'} maxLength={120} placeholder={config.principalName??'Otomatis dari data Kepala Sekolah'} value={config.signatureName??''} onChange={e=>setConfig(c=>({...c,signatureName:e.target.value}))}/><span className="mt-1 block text-xs">Kosongkan untuk mengikuti nama Kepala Sekolah di data Guru.</span></label>
        <label className="text-sm text-muted">NIP penandatangan<input className={field+' mt-1'} maxLength={40} placeholder={config.principalNip??'Otomatis dari data Kepala Sekolah'} value={config.signatureNip??''} onChange={e=>setConfig(c=>({...c,signatureNip:e.target.value}))}/><span className="mt-1 block text-xs">Kosongkan untuk mengikuti NIP Kepala Sekolah di data Guru.</span></label>
        <label className="text-sm text-muted">Posisi dan perataan blok tanda tangan<select className={field+' mt-1'} value={config.signatureAlign??'center'} onChange={e=>setConfig(c=>({...c,signatureAlign:e.target.value as LetterheadConfig['signatureAlign']}))}><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></label>
      </div>
    </section>
    <section className={panel}>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tata letak dan pratinjau</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm text-muted">Perataan teks default<select className={field+' mt-1'} value={config.textAlign} onChange={e=>setConfig(c=>({...c,textAlign:e.target.value as LetterheadConfig['textAlign']}))}><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></label><label className="text-sm text-muted">Garis bawah kop<select className={field+' mt-1'} value={config.borderStyle} onChange={e=>setConfig(c=>({...c,borderStyle:e.target.value as LetterheadConfig['borderStyle']}))}><option value="double">Dua garis</option><option value="single">Satu garis</option><option value="none">Tanpa garis</option></select></label></div>
      <div className="mt-4 rounded-lg border border-slate-300 bg-white p-4 text-black shadow-sm"><div className={'flex items-center gap-3 pb-3 '+border}><div className="flex w-1/5 justify-center">{config.logoLeft&&<img src={config.logoLeft} alt="Logo kiri" style={{width:config.logoSize,height:config.logoSize}} className="object-contain"/>}</div><div className="min-w-0 flex-1">{config.rows.filter(r=>r.enabled&&r.text.trim()).map((r,i)=><p key={i} style={{fontSize:r.fontSize+'pt',fontWeight:r.bold?700:400,textAlign:r.align,lineHeight:1.25}}>{r.text}</p>)}</div><div className="flex w-1/5 justify-center">{config.logoRight&&<img src={config.logoRight} alt="Logo kanan" style={{width:config.logoSize,height:config.logoSize}} className="object-contain"/>}</div></div><p className="pt-3 text-center text-xs text-slate-400">Pratinjau tampilan kop surat</p></div>
    </section>
    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={()=>void save()} disabled={busy||loading} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy?'Menyimpan...':'Simpan Pengaturan Kop'}</button><span className="text-xs text-muted">Berlaku untuk seluruh surat keluar. Surat yang sudah disahkan mempertahankan kop saat pengesahan.</span></div>
  </div>;
}
