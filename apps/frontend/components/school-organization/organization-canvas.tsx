'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Check, Edit3, Save, Users, X } from 'lucide-react';
import { request } from '../../lib/api-client';

type Teacher = { id: string; name: string; nip?: string | null; photoUrl?: string | null };
type Card = { id: string; title: string; category: string; personName?: string | null; teacherId?: string | null; nip?: string | null; photoUrl?: string | null; sortOrder: number; locked?: boolean; x?: number; y?: number };
type Point = { x: number; y: number };
type Connector = { id: string; start: Point; end: Point; type: 'line' };
type ApiData = { positions: Card[]; classes?: Array<{ id: string; name: string; grade?: string | null; teacherId?: string | null; teacherName?: string | null; nip?: string | null; photoUrl?: string | null }>; schoolYear?: { name: string } | null };

const WIDTH = 1900;
const CARD_W = 220;
const CARD_H = 100;
const GAP_X = 40;
const GAP_Y = 90;

function parseConnectors(position?: Card): Connector[] {
  if (!position?.personName) return [];
  try {
    const raw = JSON.parse(position.personName) as Record<string, { start?: Point; end?: Point }>;
    return Object.entries(raw)
      .filter(([, item]) => item.start && item.end)
      .map(([id, item]) => ({ id: id.replace(/^`|`$/g, ''), start: item.start!, end: item.end!, type: 'line' }));
  } catch { return []; }
}

export function OrganizationCanvas() {
  const [cards, setCards] = useState<Card[]>([]);
  const [classes, setClasses] = useState<ApiData['classes']>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [tool, setTool] = useState<'select' | 'line'>('select');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await request<ApiData>('/school-organization');
      setCards(data.positions.filter((item) => !['__students__', '__connectors__'].includes(item.id)).map((item) => ({ ...item, x: undefined, y: undefined })));
      setClasses(data.classes ?? []);
      setConnectors(parseConnectors(data.positions.find((item) => item.id === '__connectors__')));
      if (editing) setTeachers(await request<Teacher[]>('/school-organization/teachers'));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Gagal memuat bagan organisasi.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!editing) return;
    void request<Teacher[]>('/school-organization/teachers').then(setTeachers).catch(() => undefined);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setEditing(false); setSelectedId(null); setLineStart(null); void load(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const gridCards = useMemo(() => cards.map((card, index) => ({
    card,
    x: card.x ?? (WIDTH - (4 * CARD_W + 3 * GAP_X)) / 2 + (index % 4) * (CARD_W + GAP_X),
    y: card.y ?? 40 + Math.floor(index / 4) * (CARD_H + GAP_Y),
  })), [cards]);
  const classCards = useMemo(() => (classes ?? []).map((item, index) => ({
    ...item,
    x: (WIDTH - (4 * CARD_W + 3 * GAP_X)) / 2 + (index % 4) * (CARD_W + GAP_X),
    y: 40 + Math.ceil(cards.length / 4) * (CARD_H + GAP_Y) + 120 + Math.floor(index / 4) * (CARD_H + GAP_Y),
  })), [classes, cards.length]);
  const selected = cards.find((card) => card.id === selectedId);
  const selectedClass = classes?.find((item) => `class:${item.id}` === selectedId);

  function updateCard(id: string, patch: Partial<Card>) { setCards((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)); }
  function pointFromEvent(event: PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / (rect.width / WIDTH), y: (event.clientY - rect.top) / (rect.width / WIDTH) };
  }
  function handleCanvasClick(event: PointerEvent) {
    if (!editing || tool !== 'line') return;
    const point = pointFromEvent(event);
    if (!lineStart) { setLineStart(point); return; }
    setConnectors((items) => [...items, { id: `shape:${crypto.randomUUID()}`, start: lineStart, end: point, type: 'line' }]);
    setLineStart(null);
  }
  async function save() {
    setSaving(true); setMessage('');
    try {
      const connectorNode: Card = { id: '__connectors__', title: 'Konektor Manual', category: 'System', sortOrder: 99999, personName: JSON.stringify(Object.fromEntries(connectors.map((item) => [item.id, item]))) };
      await request('/school-organization', { method: 'PUT', body: JSON.stringify({ positions: [...cards, connectorNode] }) });
      setEditing(false); setMessage('Bagan organisasi berhasil disimpan.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Gagal menyimpan bagan organisasi.'); }
    finally { setSaving(false); }
  }

  async function updateClassTeacher(classId: string, teacherId: string) {
    const teacher = teachers.find((item) => item.id === teacherId);
    await request(`/academic/classes/${classId}/homeroom-teacher`, { method: 'PATCH', body: JSON.stringify({ teacherId: teacherId || null }) });
    setClasses((items) => (items ?? []).map((item) => item.id === classId ? { ...item, teacherId: teacher?.id ?? null, teacherName: teacher?.name ?? null, nip: teacher?.nip ?? null, photoUrl: teacher?.photoUrl ?? null } : item));
    setMessage('Wali kelas berhasil diperbarui.');
  }

  if (loading) return <div className="rounded-xl border p-5 text-sm text-muted-foreground">Memuat bagan organisasi...</div>;
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3"><Users className="text-primary"/><div><h2 className="font-bold">Bagan Struktur Organisasi Sekolah</h2><p className="text-xs text-muted-foreground">Grid card dan konektor manual</p></div></div>
      {!editing ? <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white"><Edit3 size={16}/> Edit</button> : <div className="flex gap-2"><button type="button" onClick={() => { setEditing(false); void load(); }} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2"><X size={16}/> Batal</button><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"><Save size={16}/>{saving ? 'Menyimpan...' : 'Simpan'}<Check size={16}/></button></div>}
    </header>
    {message && <div className="rounded-xl border p-3 text-sm">{message}</div>}
    {editing && selected && <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4"><input value={selected.title} onChange={(event) => updateCard(selected.id, { title: event.target.value })} className="rounded-lg border px-3 py-2" placeholder="Jabatan"/><select value={selected.teacherId ?? ''} onChange={(event) => { const teacher = teachers.find((item) => item.id === event.target.value); updateCard(selected.id, { teacherId: teacher?.id ?? null, personName: teacher?.name ?? '', nip: teacher?.nip ?? null, photoUrl: teacher?.photoUrl ?? null }); }} className="rounded-lg border px-3 py-2"><option value="">Pilih guru/pegawai</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><input value={selected.personName ?? ''} onChange={(event) => updateCard(selected.id, { personName: event.target.value })} className="rounded-lg border px-3 py-2" placeholder="Nama manual"/><input value={selected.nip ?? ''} onChange={(event) => updateCard(selected.id, { nip: event.target.value })} className="rounded-lg border px-3 py-2" placeholder="NIP"/></div>}
    {editing && selectedClass && <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"><strong>Wali Kelas · {selectedClass.name}</strong><select value={selectedClass.teacherId ?? ''} onChange={(event) => void updateClassTeacher(selectedClass.id, event.target.value)} className="rounded-lg border px-3 py-2"><option value="">Belum ditentukan</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></div>}
    {editing && <div className="flex gap-2"><button type="button" onClick={() => setTool('select')} className={`rounded-lg border px-3 py-2 text-sm ${tool === 'select' ? 'bg-blue-600 text-white' : ''}`}>Pilih card</button><button type="button" onClick={() => { setTool('line'); setLineStart(null); }} className={`rounded-lg border px-3 py-2 text-sm ${tool === 'line' ? 'bg-blue-600 text-white' : ''}`}>Gambar garis</button></div>}
    <div ref={canvasRef} onPointerDown={handleCanvasClick} className="relative aspect-[1900/1100] w-full overflow-hidden rounded-2xl border bg-slate-100" style={{ minHeight: 600 }}>
      <svg viewBox={`0 0 ${WIDTH} 1100`} className="pointer-events-none absolute inset-0 h-full w-full">{connectors.map((line) => <line key={line.id} x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y} stroke="#2563eb" strokeWidth="3"/>)}{lineStart && <circle cx={lineStart.x} cy={lineStart.y} r="8" fill="#2563eb"/>}</svg>
      {gridCards.map(({ card, x, y }) => <article key={card.id} onPointerDown={(event) => { event.stopPropagation(); if (editing && tool === 'select') setSelectedId(card.id); }} className={`absolute rounded-xl border-2 bg-white p-3 shadow-sm ${selectedId === card.id ? 'ring-2 ring-blue-500' : ''}`} style={{ left: `${(x / WIDTH) * 100}%`, top: `${(y / 1100) * 100}%`, width: `${(CARD_W / WIDTH) * 100}%`, minHeight: 70 }}><p className="text-center text-[10px] font-black uppercase">{card.title}</p><p className="mt-1 text-center text-xs font-bold">{card.personName ?? 'Belum ditentukan'}</p><p className="text-center text-[9px] text-muted-foreground">NIP: {card.nip ?? '—'}</p></article>)}
      {classCards.map((item) => <article key={item.id} onPointerDown={(event) => { event.stopPropagation(); if (editing && tool === 'select') setSelectedId(`class:${item.id}`); }} className="absolute rounded-xl border-2 border-amber-400 bg-amber-50 p-3 shadow-sm" style={{ left: `${(item.x / WIDTH) * 100}%`, top: `${(item.y / 1100) * 100}%`, width: `${(CARD_W / WIDTH) * 100}%`, minHeight: 70 }}><p className="text-center text-[10px] font-black uppercase">Wali Kelas</p><p className="text-center text-xs font-bold">{item.teacherName ?? 'Belum ditentukan'}</p><p className="text-center text-[9px]">{item.name}</p></article>)}
    </div>
  </section>;
}
