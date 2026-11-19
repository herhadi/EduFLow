'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Check, MousePointer2, Save, X } from 'lucide-react';
import { request } from '../../lib/api-client';

type Point = { x: number; y: number };
type Card = { id: string; title: string; personName?: string | null; nip?: string | null; sortOrder: number; x?: number; y?: number; locked?: boolean };
type Connector = { id: string; type: 'line'; points: Point[] };
type Payload = { positions: Card[] };

const CANVAS_WIDTH = 1900;
const CANVAS_HEIGHT = 1200;
const CARD_WIDTH = 220;
const CARD_HEIGHT = 100;
const GRID_GAP = 44;

function normalizeConnectors(position?: Card): Connector[] {
  if (!position?.personName) return [];
  try {
    const stored = JSON.parse(position.personName) as Record<string, { start?: Point; end?: Point; points?: Point[] }>;
    return Object.entries(stored).flatMap(([key, value]) => {
      const points = value.points ?? (value.start && value.end ? [value.start, value.end] : []);
      return points.length >= 2 ? [{ id: key.replace(/^`|`$/g, ''), type: 'line' as const, points }] : [];
    });
  } catch { return []; }
}

function alignPoint(point: Point, previous?: Point): Point {
  const snap = 20;
  const aligned = { x: Math.round(point.x / snap) * snap, y: Math.round(point.y / snap) * snap };
  if (!previous) return aligned;
  if (Math.abs(aligned.x - previous.x) <= 24) aligned.x = previous.x;
  if (Math.abs(aligned.y - previous.y) <= 24) aligned.y = previous.y;
  return aligned;
}

export function OrganizationConnectorEditor() {
  const [cards, setCards] = useState<Card[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<Point[]>([]);
  const [drag, setDrag] = useState<{ id: string; index: number; offset: Point } | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await request<Payload>('/school-organization');
      const connectorNode = data.positions.find((item) => item.id === '__connectors__');
      setCards(data.positions.filter((item) => !['__connectors__', '__students__'].includes(item.id)));
      setConnectors(normalizeConnectors(connectorNode));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Gagal memuat konektor.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!editing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDrawing([]); setSelectedId(null); setEditing(false); void load(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const placedCards = useMemo(() => cards.map((card, index) => ({
    ...card,
    x: card.x ?? ((CANVAS_WIDTH - (4 * CARD_WIDTH + 3 * GRID_GAP)) / 2 + (index % 4) * (CARD_WIDTH + GRID_GAP)),
    y: card.y ?? (40 + Math.floor(index / 4) * (CARD_HEIGHT + 100)),
  })), [cards]);

  function toCanvasPoint(event: PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return alignPoint({ x: (event.clientX - rect.left) * CANVAS_WIDTH / rect.width, y: (event.clientY - rect.top) * CANVAS_HEIGHT / rect.width }, drawing.at(-1));
  }
  function cardAnchor(event: PointerEvent, card: Card & { x: number; y: number }): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * CANVAS_WIDTH / rect.width, y: (event.clientY - rect.top) * CANVAS_HEIGHT / rect.width };
    const sides = [{ x: card.x + CARD_WIDTH / 2, y: card.y }, { x: card.x + CARD_WIDTH / 2, y: card.y + CARD_HEIGHT }, { x: card.x, y: card.y + CARD_HEIGHT / 2 }, { x: card.x + CARD_WIDTH, y: card.y + CARD_HEIGHT / 2 }];
    return sides.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
  }
  function handleCanvasPointerDown(event: PointerEvent) {
    if (!editing) return;
    if (event.target !== event.currentTarget) return;
    const point = toCanvasPoint(event);
    if (!drawing.length) { setDrawing([point]); return; }
    setDrawing((items) => [...items, point]);
  }
  function handleCardPointerDown(event: PointerEvent, card: Card & { x: number; y: number }) {
    event.stopPropagation();
    if (!editing) return;
    const point = cardAnchor(event, card);
    if (drawing.length) {
      const next = [...drawing, point];
      setConnectors((items) => [...items, { id: `shape:${crypto.randomUUID()}`, type: 'line', points: next }]);
      setDrawing([]);
    } else setDrawing([point]);
  }
  function startNodeDrag(event: PointerEvent, connector: Connector, index: number, point: Point) {
    event.stopPropagation();
    if (!editing) return;
    const current = toCanvasPoint(event);
    setSelectedId(connector.id);
    setDrag({ id: connector.id, index, offset: { x: current.x - point.x, y: current.y - point.y } });
    canvasRef.current?.setPointerCapture(event.pointerId);
  }
  function moveNode(event: PointerEvent) {
    if (!drag) return;
    const point = toCanvasPoint(event);
    setConnectors((items) => items.map((item) => item.id !== drag.id ? item : { ...item, points: item.points.map((entry, index) => index === drag.index ? alignPoint({ x: point.x - drag.offset.x, y: point.y - drag.offset.y }, item.points[index - 1]) : entry) }));
  }
  function finishNodeDrag() { setDrag(null); }
  async function save() {
    setSaving(true); setMessage('');
    try {
      const connectorNode: Card = { id: '__connectors__', title: 'Konektor Manual', sortOrder: 99999, personName: JSON.stringify(Object.fromEntries(connectors.map((item) => [item.id, item]))) };
      await request('/school-organization', { method: 'PUT', body: JSON.stringify({ positions: [...cards, connectorNode] }) });
      setEditing(false); setDrawing([]); setMessage('Konektor berhasil disimpan.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Gagal menyimpan konektor.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="rounded-xl border p-5 text-sm text-muted-foreground">Memuat konektor...</div>;
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"><div><h2 className="font-bold">Editor Konektor Organisasi</h2><p className="text-xs text-muted-foreground">Semua garis manual · titik biru dapat ditarik · klik card untuk anchor otomatis</p></div>{editing ? <div className="flex gap-2"><button type="button" onClick={() => { setEditing(false); setDrawing([]); void load(); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2"><X size={15}/> Batal</button><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white"><Save size={15}/>{saving ? 'Menyimpan...' : 'Simpan'}<Check size={15}/></button></div> : <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-bold text-white"><MousePointer2 size={15}/> Edit garis</button>}</header>
    {message && <div className="rounded-lg border p-3 text-sm">{message}</div>}
    {editing && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">Klik sisi card untuk memulai garis. Klik area kosong untuk menambah sudut. Klik sisi card lain untuk menyelesaikan. Klik node biru untuk menariknya. Tekan Esc untuk membatalkan.</p>}
    <div ref={canvasRef} onPointerDown={handleCanvasPointerDown} onPointerMove={moveNode} onPointerUp={finishNodeDrag} onPointerCancel={finishNodeDrag} className="relative aspect-[1900/1200] w-full overflow-hidden rounded-2xl border bg-slate-100" style={{ minHeight: 640 }}>
      <svg viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} className="pointer-events-none absolute inset-0 h-full w-full">{connectors.map((connector) => <g key={connector.id}>{connector.points.slice(1).map((point, index) => <line key={index} x1={connector.points[index].x} y1={connector.points[index].y} x2={point.x} y2={point.y} stroke="#2563eb" strokeWidth="4" strokeLinecap="round" pointerEvents={editing ? 'stroke' : 'none'} onPointerDown={(event) => { event.stopPropagation(); setSelectedId(connector.id); }}/>) }{editing && connector.points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="9" fill="#2563eb" stroke="white" strokeWidth="2" pointerEvents="all" onPointerDown={(event) => startNodeDrag(event, connector, index, point)}/>)}</g>)}{drawing.length > 0 && <polyline points={drawing.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#0f172a" strokeWidth="3" strokeDasharray="8 6"/>}</svg>
      {placedCards.map((card) => <article key={card.id} onPointerDown={(event) => handleCardPointerDown(event, card)} className="absolute rounded-xl border-2 border-sky-400 bg-white p-3 text-center shadow-sm" style={{ left: `${card.x / CANVAS_WIDTH * 100}%`, top: `${card.y / CANVAS_HEIGHT * 100}%`, width: `${CARD_WIDTH / CANVAS_WIDTH * 100}%`, height: CARD_HEIGHT }}><p className="text-[10px] font-black uppercase">{card.title}</p><p className="mt-2 text-xs font-bold">{card.personName ?? 'Belum ditentukan'}</p><p className="text-[9px] text-muted-foreground">NIP: {card.nip ?? '—'}</p></article>)}
    </div>
  </section>;
}
