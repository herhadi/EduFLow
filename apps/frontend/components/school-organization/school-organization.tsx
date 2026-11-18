'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, ChevronDown, ImagePlus, Plus, Save, Trash2, Users, X, ZoomIn, ZoomOut, Maximize2, Move, Printer, FileDown } from 'lucide-react';
import { request, upload } from '../../lib/api-client';
import { getCurrentSessionUser } from '../../lib/session';
import { prepareProfilePhotoForUpload } from '../../lib/image-compression';

type Teacher = { id: string; name: string; nip?: string | null; photoUrl?: string | null };
type Position = { id: string; title: string; personName?: string | null; teacherId?: string | null; parentId?: string | null; category: string; sortOrder: number; locked?: boolean; nip?: string | null; photoUrl?: string | null; x?: number; y?: number };
type OrganizationClass = { id: string; name: string; grade?: string | null; teacherId?: string | null; teacherName?: string | null; nip?: string | null; photoUrl?: string | null };
type OrganizationResponse = { positions: Position[]; defaults: Position[]; schoolYear?: { id: string; name: string } | null; classes?: OrganizationClass[] };
type UploadResponse = { data?: Teacher; message?: string };

const categoryOptions = ['Pimpinan', 'Wakil Kepala Sekolah', 'Tenaga Kependidikan', 'Koordinator', 'Jabatan Lainnya'];

export function SchoolOrganization() {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => { setRoles(getCurrentSessionUser()?.roles ?? []); }, []);
  const canManage = roles.includes('operator_sekolah') && !roles.includes('root');
  const [positions, setPositions] = useState<Position[]>([]);
  const [classCards, setClassCards] = useState<OrganizationClass[]>([]);
  const [schoolYearName, setSchoolYearName] = useState('');
  const [studentPosition, setStudentPosition] = useState<{ x?: number; y?: number }>({});
  const [studentParentId, setStudentParentId] = useState('vice-student');
  const [connectorPositions, setConnectorPositions] = useState<Record<string, { start?: { x: number; y: number }; end?: { x: number; y: number } }>>({});
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [canEditViewport, setCanEditViewport] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string | null; pointerId: number; startX: number; startY: number; originX: number; originY: number; panX: number; panY: number } | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardWidth, setCardWidth] = useState(220);
  const [cardHeight, setCardHeight] = useState(100);
  const [rowGap, setRowGap] = useState(300);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; originX: number; originY: number; dragging: boolean } | null>(null);
  const canvasWidth = 1900;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 24 });
  const fitScale = Math.min(1, Math.max(0.12, (viewportWidth - 24) / canvasWidth));
  const effectiveScale = fitScale * zoom;
  const printSourceRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request<OrganizationResponse>('/school-organization');
      const connectorNode = data.positions.find((item) => item.id === '__connectors__');
      let parsedConnectors: Record<string, { start?: { x: number; y: number }; end?: { x: number; y: number } }> = {};
      try { parsedConnectors = connectorNode?.personName ? JSON.parse(connectorNode.personName) : {}; } catch { parsedConnectors = {}; }
      setConnectorPositions(parsedConnectors);
      setClassCards(data.classes ?? []);
      setSchoolYearName(data.schoolYear?.name ?? '');
      const studentNode = data.positions.find((item) => item.id === '__students__');
      setStudentPosition(studentNode ? { x: studentNode.x, y: studentNode.y } : {});
      setStudentParentId(studentNode?.parentId ?? (data.positions.some((item) => item.id === 'vice-student') ? 'vice-student' : 'principal'));
      setPositions(data.positions.filter((item) => item.id !== '__students__' && item.id !== '__connectors__'));
      if (canManage) setTeachers(await request<Teacher[]>('/school-organization/teachers'));
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat struktur organisasi.'); }
    finally { setLoading(false); }
  }, [canManage]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (loading) return;
    const updateViewport = () => {
      const width = canvasRef.current?.clientWidth ?? window.innerWidth;
      setViewportWidth(width);
      setCanEditViewport(window.innerWidth >= 768);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    const observer = typeof ResizeObserver !== 'undefined' && canvasRef.current
      ? new ResizeObserver(updateViewport) : null;
    if (observer && canvasRef.current) observer.observe(canvasRef.current);
    return () => { window.removeEventListener('resize', updateViewport); observer?.disconnect(); };
  }, [loading]);

  function update(id: string, patch: Partial<Position>) {
    setPositions((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function save() {
    setSaving(true); setError(''); setNotice('');
    try {
      // Persist the currently rendered coordinates for every card, including cards
      // that have never been dragged. This prevents the view-mode layout from
      // recalculating their positions with a different row gap after save.
      const persistedPositions = positions.map((item) => {
        const point = nodePositions.get(item.id);
        return point ? { ...item, x: point.x, y: point.y } : item;
      });
      const studentParent = positions.find((item) => item.id === studentParentId) ?? positions.find((item) => item.id === 'principal');
      const studentParentPoint = studentParent ? nodePositions.get(studentParent.id) : null;
      const defaultStudentY = studentParentPoint ? Math.max(70 + 4 * rowGap, studentParentPoint.y + cardHeight + 150) : 900;
      const studentNode: Position = { id: '__students__', title: 'Peserta Didik', category: 'Peserta Didik', sortOrder: 9999, parentId: studentParent?.id ?? 'principal', locked: true, x: studentPosition.x ?? 840, y: studentPosition.y ?? defaultStudentY };
      const connectorNode: Position = { id: '__connectors__', title: 'Pengaturan Konektor', category: 'Pengaturan', sortOrder: 10000, parentId: 'principal', personName: JSON.stringify(connectorPositions), locked: true };
      const result = await request<OrganizationResponse>('/school-organization', { method: 'PUT', body: JSON.stringify({ positions: [...persistedPositions, studentNode, connectorNode] }) });
      const savedStudentNode = result.positions.find((item) => item.id === '__students__');
      const savedConnectorNode = result.positions.find((item) => item.id === '__connectors__');
      setConnectorPositions(savedConnectorNode?.personName ? JSON.parse(savedConnectorNode.personName) as typeof connectorPositions : {});
      setStudentPosition(savedStudentNode ? { x: savedStudentNode.x, y: savedStudentNode.y } : {});
      setPositions(result.positions.filter((item) => item.id !== '__students__' && item.id !== '__connectors__')); setEditing(false); setNotice('Struktur organisasi berhasil disimpan.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan struktur organisasi.'); }
    finally { setSaving(false); }
  }

  function addPosition() {
    const id = `custom-${Date.now()}`;
    setPositions((items) => [...items, { id, title: '', personName: '', teacherId: null, parentId: 'principal', category: 'Jabatan Lainnya', sortOrder: items.length }]);
    setSelectedCardId(id);
  }

  async function changePhoto(position: Position, file?: File) {
    if (!position.teacherId || !file) return;
    setUploadingId(position.id); setError(''); setNotice('');
    try {
      const prepared = await prepareProfilePhotoForUpload(file);
      const response = await upload<UploadResponse>(`/school-organization/teachers/${position.teacherId}/photo`, prepared);
      const teacher = response.data;
      if (teacher) {
        setTeachers((items) => items.map((item) => item.id === teacher.id ? { ...item, ...teacher } : item));
        setPositions((items) => items.map((item) => item.teacherId === teacher.id ? { ...item, photoUrl: teacher.photoUrl ?? null } : item));
      }
      setNotice('Foto bagan dan foto profil akun berhasil diperbarui.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memperbarui foto.'); }
    finally { setUploadingId(null); }
  }

  const nodePositions = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>();
    const children = new Map<string | null, Position[]>();
    positions.forEach((item) => children.set(item.parentId ?? null, [...(children.get(item.parentId ?? null) ?? []), item]));
    const depthCounts = new Map<number, number>();
    const countDepth = (parentId: string | null, depth: number) => {
      const items = children.get(parentId) ?? [];
      depthCounts.set(depth, (depthCounts.get(depth) ?? 0) + items.length);
      items.forEach((item) => countDepth(item.id, depth + 1));
    };
    countDepth(null, 0);
    const rows = new Map<number, number>();
    const place = (parentId: string | null, depth: number) => {
      const items = children.get(parentId) ?? [];
      items.forEach((item) => {
        const index = rows.get(depth) ?? 0;
        const rowStart = (canvasWidth - ((depthCounts.get(depth) ?? 1) * 260 - 40)) / 2;
        const x = Number.isFinite(item.x) ? Number(item.x) : rowStart + index * 260;
        const y = Number.isFinite(item.y) ? Number(item.y) : 70 + depth * (editing ? rowGap : 190);
        rows.set(depth, index + 1); result.set(item.id, { x, y }); place(item.id, depth + 1);
      });
    };
    place(null, 0);
    return result;
  }, [positions, editing, rowGap]);

  const expandedCardHeight = Math.max(cardHeight, 310);
  const canvasHeight = useMemo(() => {
    const deepestOrgBottom = Math.max(0, ...positions.map((item) => {
      const point = nodePositions.get(item.id);
      return point ? point.y + (editing && selectedCardId === item.id ? expandedCardHeight : cardHeight) : 0;
    }));
    const classRows = Math.ceil(classCards.length / 4);
    const classSectionBottom = classCards.length ? deepestOrgBottom + 170 + Math.max(0, classRows - 1) * 150 + Math.max(86, Math.min(112, cardHeight)) + 100 : deepestOrgBottom;
    const studentBottom = Math.max(studentPosition.y ?? 0, classSectionBottom + (classCards.length ? 100 : 0)) + cardHeight;
    return Math.max(900, Math.ceil(Math.max(classSectionBottom, studentBottom) + 120));
  }, [positions, nodePositions, editing, selectedCardId, expandedCardHeight, cardHeight, classCards.length, studentPosition.y]);

  function movePosition(id: string, x: number, y: number) {
    if (id === '__students__') {
      const peers = [...nodePositions.values()];
      let snappedX = Math.round(Math.max(0, x) / 20) * 20;
      let snappedY = Math.round(Math.max(0, y) / 20) * 20;
      const alignX = peers.find((point) => Math.abs(point.x - x) <= 14);
      const alignY = peers.find((point) => Math.abs(point.y - y) <= 14);
      if (alignX) snappedX = alignX.x;
      if (alignY) snappedY = alignY.y;
      setStudentPosition({ x: snappedX, y: snappedY });
      return;
    }
    setPositions((items) => {
      const others = items.filter((item) => item.id !== id).map((item) => nodePositions.get(item.id)).filter((point): point is { x: number; y: number } => Boolean(point));
      let snappedX = Math.round(Math.max(0, x) / 20) * 20;
      let snappedY = Math.round(Math.max(0, y) / 20) * 20;
      const alignX = others.find((point) => Math.abs(point.x - x) <= 14);
      const alignY = others.find((point) => Math.abs(point.y - y) <= 14);
      if (alignX) snappedX = alignX.x;
      if (alignY) snappedY = alignY.y;
      return items.map((item) => item.id === id ? { ...item, x: snappedX, y: snappedY } : item);
    });
  }

  function onCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const endpoint = (event.target as HTMLElement).closest<HTMLElement>('[data-connector-handle]');
    if (endpoint) {
      const key = endpoint.dataset.connectorKey!;
      const end = endpoint.dataset.connectorEnd as 'start' | 'end';
      dragRef.current = { id: `connector:${key}:${end}`, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: 0, originY: 0, panX: pan.x, panY: pan.y };
      (event.target as Element).setPointerCapture(event.pointerId);
      event.stopPropagation();
      return;
    }
    if ((event.target as HTMLElement).closest('[data-org-card]')) return;
    dragRef.current = { id: null, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: 0, originY: 0, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.id?.startsWith('connector:')) {
      const separator = drag.id.lastIndexOf(':');
      const key = drag.id.slice('connector:'.length, separator);
      const end = drag.id.slice(separator + 1) as 'start' | 'end';
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      let x = Math.max(0, (event.clientX - rect.left - pan.x) / effectiveScale);
      let y = Math.max(0, (event.clientY - rect.top - pan.y) / effectiveScale);
      const anchors = positions.flatMap((item) => { const point = nodePositions.get(item.id); if (!point) return []; const left = 950 + (point.x - 950) * (cardWidth / 220); const top = point.y; const width = cardWidth; const height = editing && selectedCardId === item.id ? expandedCardHeight : cardHeight; return [{ x: left + width / 2, y: top }, { x: left + width / 2, y: top + height }, { x: left, y: top + height / 2 }, { x: left + width, y: top + height / 2 }]; });
      const studentX = 950 + ((studentPosition.x ?? 840) - 950) * (cardWidth / 220);
      const studentY = studentPosition.y ?? Math.max(70 + 4 * (editing ? rowGap : 190), 900);
      anchors.push({ x: studentX + cardWidth / 2, y: studentY }, { x: studentX + cardWidth / 2, y: studentY + cardHeight }, { x: studentX, y: studentY + cardHeight / 2 }, { x: studentX + cardWidth, y: studentY + cardHeight / 2 });
      const nearest = anchors.map((point) => ({ point, distance: Math.hypot(point.x - x, point.y - y) })).sort((a, b) => a.distance - b.distance)[0];
      if (nearest && nearest.distance <= 34) ({ x, y } = nearest.point);
      setConnectorPositions((items) => ({ ...items, [key]: { ...items[key], [end]: { x, y } } }));
    } else if (drag.id) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      movePosition(drag.id, drag.originX + (event.clientX - drag.startX) / effectiveScale, drag.originY + (event.clientY - drag.startY) / effectiveScale);
    } else setPan({ x: drag.panX + event.clientX - drag.startX, y: drag.panY + event.clientY - drag.startY });
  }

  function beginCardPress(event: ReactPointerEvent<HTMLElement>, item: Position) {
    if (!editing || (event.target as HTMLElement).closest('button,input,select')) return;
    event.stopPropagation();
    const studentParent = positions.find((candidate) => candidate.id === studentParentId) ?? positions.find((candidate) => candidate.id === 'principal');
    const studentParentPoint = studentParent ? nodePositions.get(studentParent.id) : null;
    const defaultStudentY = studentParentPoint ? Math.max(70 + 4 * (editing ? rowGap : 190), studentParentPoint.y + cardHeight + 150) : 900;
    const point = item.id === '__students__'
      ? { x: studentPosition.x ?? 840, y: studentPosition.y ?? defaultStudentY }
      : nodePositions.get(item.id) ?? { x: 80, y: 80 };
    pressRef.current = { id: item.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: point.x, originY: point.y, dragging: false };
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      const press = pressRef.current;
      if (!press || press.pointerId !== event.pointerId) return;
      press.dragging = true;
      setSelectedCardId(null);
      canvasRef.current?.setPointerCapture(press.pointerId);
    }, 420);
  }

  function moveCardPress(event: ReactPointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    const dx = event.clientX - press.startX;
    const dy = event.clientY - press.startY;
    if (!press.dragging && Math.hypot(dx, dy) > 8) {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = null;
      return;
    }
    if (press.dragging) movePosition(press.id, press.originX + dx / (effectiveScale * (cardWidth / 220)), press.originY + dy / effectiveScale);
  }

  function endCardPress(event: ReactPointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (!press.dragging) setSelectedCardId(press.id);
    pressRef.current = null;
  }


  const renderCanvasCard = (item: Position) => {
    const teacher = teachers.find((person) => person.id === item.teacherId);
    const name = teacher?.name ?? item.personName ?? 'Belum ditentukan';
    const nip = teacher?.nip ?? item.nip;
    const photoUrl = teacher?.photoUrl ?? item.photoUrl;
    const point = nodePositions.get(item.id) ?? { x: 80, y: 80 };
    return <article key={item.id} data-org-card="true" onPointerDown={(event) => beginCardPress(event, item)} style={{ position: 'absolute', left: 950 + (point.x - 950) * (cardWidth / 220), top: point.y, width: cardWidth, minHeight: editing && selectedCardId === item.id ? expandedCardHeight : cardHeight, touchAction: 'none', cursor: editing ? 'grab' : 'default' }} className={`org-print-node z-10 overflow-visible rounded-2xl border-2 shadow-[0_10px_26px_-13px_rgba(15,23,42,0.42)] transition-shadow ${item.id === 'principal' ? 'border-blue-400 bg-gradient-to-br from-blue-100 via-sky-50 to-indigo-100 dark:from-blue-950 dark:via-sky-950/70 dark:to-indigo-950' : item.category === 'Wakil Kepala Sekolah' ? 'border-emerald-300 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-950 dark:via-teal-950/70 dark:to-cyan-950' : item.category === 'Tenaga Kependidikan' ? 'border-orange-300 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-950 dark:via-amber-950/70 dark:to-yellow-950' : item.category === 'Koordinator' ? 'border-violet-300 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-purple-100 dark:from-violet-950 dark:via-fuchsia-950/70 dark:to-purple-950' : 'border-sky-300 bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100 dark:from-sky-950 dark:via-cyan-950/70 dark:to-blue-950'} ${editing && selectedCardId === item.id ? 'ring-2 ring-blue-500 shadow-xl' : editing ? 'ring-1 ring-dashed ring-slate-300' : 'hover:shadow-lg'}`}>
      <div className={`h-2 w-full rounded-t-2xl bg-gradient-to-r ${item.id === 'principal' ? 'from-blue-700 via-indigo-500 to-sky-400' : item.category === 'Wakil Kepala Sekolah' ? 'from-emerald-600 via-teal-500 to-cyan-400' : item.category === 'Tenaga Kependidikan' ? 'from-orange-600 via-amber-500 to-yellow-400' : item.category === 'Koordinator' ? 'from-violet-600 via-fuchsia-500 to-purple-400' : 'from-sky-600 via-cyan-500 to-blue-400'}`} />
      <div className={`flex min-w-0 items-center justify-center gap-3 ${cardHeight <= 70 ? 'p-1.5' : 'p-2.5'}`}>
        <div className={`relative shrink-0 overflow-hidden rounded-xl border-2 border-background bg-gradient-to-br from-muted to-muted/60 shadow-sm size-12`}>
          {photoUrl ? <img src={photoUrl} alt={`Foto ${name}`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm font-bold text-muted-foreground">{name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '—'}</div>}
          {editing && canManage && item.teacherId && <button type="button" title="Ganti foto" onClick={() => fileInputRefs.current[item.id]?.click()} className="absolute inset-x-0 bottom-0 bg-slate-950/80 py-1 text-[9px] text-white"><ImagePlus size={11} className="mx-auto"/></button>}
        </div>
        <div className="min-w-0 flex-1 text-center"><p className="inline-flex max-w-full justify-center whitespace-normal rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-extrabold uppercase leading-tight tracking-wider text-primary">{item.title || 'Jabatan belum diisi'}</p><p className="mt-1 break-words text-xs font-extrabold leading-tight text-foreground">{name}</p><p className="mt-1 text-[9px] font-medium text-muted-foreground">NIP: {nip || '—'}</p></div>
      </div>
      {editing && canManage && item.teacherId && <input ref={(node) => { fileInputRefs.current[item.id] = node; }} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void changePhoto(item, event.target.files?.[0]); event.currentTarget.value = ''; }} />}
      {editing && canManage && selectedCardId === item.id && <div className="space-y-2 border-t bg-muted/20 p-2 text-left">
        <label className="block space-y-1 text-[10px] font-semibold"><span>Nama Jabatan</span><input value={item.title} disabled={item.locked} onChange={(event) => update(item.id, { title: event.target.value })} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-normal" /></label>
        <label className="block space-y-1 text-[10px] font-semibold"><span>Kelompok Jabatan</span><select value={item.category} disabled={item.locked} onChange={(event) => update(item.id, { category: event.target.value })} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-normal">{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="block space-y-1 text-[10px] font-semibold"><span>Guru/Pegawai</span><select value={item.teacherId ?? ''} disabled={item.locked} onChange={(event) => { const selected = teachers.find((person) => person.id === event.target.value); update(item.id, { teacherId: selected?.id ?? null, personName: selected?.name ?? '', nip: selected?.nip ?? null, photoUrl: selected?.photoUrl ?? null }); }} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-normal"><option value="">Belum ditentukan / manual</option>{teachers.map((person) => <option key={person.id} value={person.id}>{person.name}{person.nip ? ` · ${person.nip}` : ''}</option>)}</select></label>
        {!item.teacherId && !item.locked && <><input value={item.personName ?? ''} onChange={(event) => update(item.id, { personName: event.target.value })} placeholder="Nama pegawai" className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"/><input value={item.nip ?? ''} onChange={(event) => update(item.id, { nip: event.target.value })} placeholder="NIP (opsional)" className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"/></>}
        <label className="block space-y-1 text-[10px] font-semibold"><span>Atasan langsung</span><select value={item.parentId ?? ''} disabled={item.locked} onChange={(event) => update(item.id, { parentId: event.target.value || null })} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-normal"><option value="">Tanpa atasan</option>{positions.filter((candidate) => candidate.id !== item.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title || 'Jabatan belum diisi'}</option>)}</select></label>
        {!item.locked && <button type="button" onClick={() => setPositions((items) => items.filter((candidate) => candidate.id !== item.id).map((candidate) => candidate.parentId === item.id ? { ...candidate, parentId: item.parentId ?? null } : candidate))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50"><Trash2 size={12}/> Hapus</button>}
      </div>}
    </article>;
  };

  const openPrintView = () => {
    const source = printSourceRef.current;
    if (!source) return;
    const popup = window.open('', '_blank', 'width=1400,height=1000');
    if (!popup) { setError('Popup diblokir browser. Izinkan popup untuk membuka preview cetak.'); return; }
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((node) => node.outerHTML).join('\n');
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input,select,button').forEach((node) => node.remove());
    clone.querySelectorAll('.org-print-node > div.border-t').forEach((node) => node.remove());
    clone.querySelectorAll('.org-print-node').forEach((node) => { node.querySelectorAll('div.absolute.inset-x-0').forEach((overlay) => overlay.remove()); });
    clone.querySelectorAll('.org-print-node').forEach((node) => {
      const card = node as HTMLElement;
      card.style.minHeight = '112px';
      card.style.height = '112px';
      card.style.width = '220px';
      card.style.left = `${950 + ((Number.parseFloat(card.style.left) || 0) - 950) * (220 / cardWidth)}px`;
      card.style.transform = 'none';
      card.style.boxShadow = 'none';
      card.style.backgroundColor = '#fff';
      card.style.color = '#111';
      card.style.borderColor = '#64748b';
      card.querySelectorAll('img').forEach((img) => { (img as HTMLImageElement).style.objectFit = 'cover'; });
    });
    clone.style.cssText = `position:relative;width:1900px;height:${canvasHeight}px;transform:none;overflow:visible;`;
    const inner = clone.firstElementChild as HTMLElement | null;
    if (inner) inner.style.cssText = `position:relative;width:1900px;height:${canvasHeight}px;transform:none;inset:auto;overflow:visible;`;
    const transformLayer = clone.firstElementChild as HTMLElement | null;
    if (transformLayer) { transformLayer.style.transform = 'none'; transformLayer.style.position = 'relative'; transformLayer.style.left = '0'; transformLayer.style.top = '0'; }
    const grid = clone.querySelector('[style*="radial-gradient"]') as HTMLElement | null;
    if (grid) grid.style.display = 'none';
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bagan Struktur Organisasi Sekolah</title>${styles}<style>@page{size:A3 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}html,body{margin:0;background:#fff;color:#111;font-family:Arial,sans-serif}.print-sheet{width:100%;overflow:hidden;display:flex;flex-direction:column;align-items:center}.org-print-title{text-align:center;font-size:22px;font-weight:700;margin:0 0 8mm}.print-canvas{width:1900px;height:${canvasHeight}px;transform:scale(.43);transform-origin:top left;position:relative;overflow:visible;margin:0 auto}.org-print-node{position:absolute!important;break-inside:avoid;box-shadow:none!important}.print-help{font:12px Arial;color:#666;margin:8px 0 16px}.print-toolbar{display:flex;justify-content:flex-end;margin-bottom:10px}.print-toolbar button{padding:9px 16px;background:#1d4ed8;color:#fff;border:0;border-radius:6px;cursor:pointer}@media screen{body{padding:24px}.print-sheet{width:100%;overflow:auto}.print-canvas{margin:auto}}@media print{.print-help,.print-toolbar{display:none}}</style></head><body><main class="print-sheet"><h1 class="org-print-title">BAGAN STRUKTUR ORGANISASI SEKOLAH</h1><div class="print-toolbar"><button onclick="window.print()">Cetak / Simpan PDF</button></div><p class="print-help">Kertas A3 Landscape. Pilih Save as PDF untuk menyimpan dokumen.</p><div class="print-canvas">${clone.innerHTML}</div></main><script>window.onload=()=>{document.title='Preview Bagan Struktur Organisasi';}<\/script></body></html>`);
    popup.document.close();
  };

  const printOrganization = () => {
    openPrintView();
    // Preview is displayed first; user starts printing from its browser print command.
  };

  const downloadOrganizationPdf = () => {
    openPrintView();
    // Browser's Save as PDF destination generates a vector PDF without rasterizing the chart.
  };


  if (loading) return <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Memuat bagan organisasi...</div>;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Users size={22}/></div><div><h2 className="font-bold">Bagan Struktur Organisasi Sekolah</h2><p className="mt-0.5 text-xs text-muted-foreground">Tata letak organisasi sekolah · visualisasi hierarki dan garis koordinasi{schoolYearName ? ` · Tahun ajaran ${schoolYearName}` : ''}</p></div></div>
        {!editing && <div className="flex flex-wrap gap-2"><button type="button" onClick={printOrganization} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted"><Printer size={16}/> Preview Cetak</button><button type="button" onClick={downloadOrganizationPdf} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted"><FileDown size={16}/> Unduh PDF</button></div>}
        {canManage && !editing && canEditViewport && <button type="button" onClick={() => { setEditing(true); setSelectedCardId(null); setNotice(''); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"><Users size={17}/> Kelola Struktur <ChevronDown size={16}/></button>}
        {canManage && editing && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditing(false); void load(); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted"><X size={16}/> Batal</button><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"><Save size={17}/>{saving ? 'Menyimpan...' : 'Simpan Perubahan'} <Check size={16}/></button></div>}
      </header>
      {canManage && !canEditViewport && !editing && <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Pengelolaan bagan tersedia melalui desktop atau tablet. Pada perangkat mobile, bagan dapat dilihat dengan zoom dan geser.</div>}
      {editing && <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><ImagePlus size={18} className="mt-0.5 shrink-0"/><p><b>Mode pengelolaan aktif.</b> Klik kartu untuk membuka isian jabatan tersebut. Tekan dan tahan sekitar setengah detik lalu geser untuk memindahkan kartu. Ubah jabatan, tentukan guru/pegawai, atau klik <b>Ganti foto</b> pada kartu. Foto yang diunggah juga memperbarui foto profil akun guru terkait.</p></div>}
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}
      {editing && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3"><div><p className="text-sm font-bold">Tambah posisi organisasi</p><p className="text-xs text-muted-foreground">Posisi baru otomatis ditempatkan di bawah Kepala Sekolah. Atasan dapat diubah pada kartu.</p></div><button type="button" onClick={addPosition} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-blue-400 bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200"><Plus size={17}/> Tambah Jabatan</button></div>}
      <div className="overflow-hidden rounded-2xl border bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Move size={14}/>{editing ? 'Klik kartu untuk mengisi data · tekan dan tahan 0,4 detik untuk memindahkan kartu · seret titik biru di garis untuk mengatur ujung konektor · geser area kosong untuk pan.' : 'Geser kanvas dan gunakan zoom untuk melihat bagan. Garis wali kelas menampilkan seluruh rombel tahun ajaran aktif.'}</p>
          <div className="flex flex-wrap items-center gap-2">{editing && <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground"><label className="flex items-center gap-2">Lebar <input aria-label="Lebar kartu" type="range" min="160" max="280" step="10" value={cardWidth} onChange={(event) => setCardWidth(Number(event.target.value))} className="w-20"/><span className="w-7 tabular-nums">{cardWidth}</span></label><label className="flex items-center gap-2">Tinggi <input aria-label="Tinggi kartu" type="range" min="50" max="180" step="5" value={cardHeight} onChange={(event) => setCardHeight(Number(event.target.value))} className="w-20"/><span className="w-7 tabular-nums">{cardHeight}</span></label><label className="flex items-center gap-2">Jarak baris <input aria-label="Jarak vertikal antarbaris" type="range" min="180" max="380" step="10" value={rowGap} onChange={(event) => setRowGap(Number(event.target.value))} className="w-20"/><span className="w-7 tabular-nums">{rowGap}</span></label></div>}<div className="flex items-center gap-1"><button type="button" onClick={() => setZoom((v) => Math.min(1.5, v + 0.1))} className="rounded-lg border p-2 hover:bg-muted" title="Perbesar"><ZoomIn size={16}/></button><span className="min-w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((v) => Math.max(0.35, v - 0.1))} className="rounded-lg border p-2 hover:bg-muted" title="Perkecil"><ZoomOut size={16}/></button><button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 24 }); }} className="rounded-lg border p-2 hover:bg-muted" title="Atur ulang tampilan"><Maximize2 size={16}/></button></div></div>
        </div>
        <div ref={canvasRef} className="org-print-canvas relative h-[680px] w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/70 via-background to-slate-100/70 dark:from-blue-950/20 dark:via-background dark:to-slate-950/30" onPointerDown={onCanvasPointerDown} onPointerMove={(event) => { moveCardPress(event); onCanvasPointerMove(event); }} onPointerUp={(event) => { endCardPress(event); if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null; }} onPointerCancel={() => { if (holdTimer.current) clearTimeout(holdTimer.current); pressRef.current = null; dragRef.current = null; }} onWheel={(event) => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); setZoom((v) => Math.max(0.35, Math.min(1.5, v + (event.deltaY < 0 ? 0.05 : -0.05)))); } }} style={{ touchAction: 'none' }}>
          <div ref={printSourceRef} className="org-print-source" style={{ position: 'relative', width: canvasWidth, height: canvasHeight, transform: 'none' }}><div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})`, width: canvasWidth, height: canvasHeight }}>
            <div className={`absolute inset-0 ${editing ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundImage: 'radial-gradient(#94a3b8 0.8px, transparent 0.8px)', backgroundSize: '20px 20px' }}/>
            <svg width={canvasWidth} height={canvasHeight} className="absolute inset-0 z-20 overflow-visible pointer-events-none">{positions.filter((item) => item.parentId && nodePositions.has(item.parentId)).map((item) => { const child = nodePositions.get(item.id)!; const parent = nodePositions.get(item.parentId!)!; const baseStart = { x: 950 + (parent.x - 950) * (cardWidth / 220) + cardWidth / 2, y: parent.y + (editing && selectedCardId === item.parentId ? expandedCardHeight : cardHeight) }; const baseEnd = { x: 950 + (child.x - 950) * (cardWidth / 220) + cardWidth / 2, y: child.y }; const key = `${item.parentId}:${item.id}`; const start = connectorPositions[key]?.start ?? baseStart; const end = connectorPositions[key]?.end ?? baseEnd; const midY = (start.y + end.y) / 2; return <g key={key}><path d={`M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`} fill="none" stroke={editing ? '#3b82f6' : '#94a3b8'} strokeWidth={editing ? 2 : 1.7} strokeDasharray={editing ? '6 5' : undefined}/>{editing && <><circle style={{ pointerEvents: 'auto', cursor: 'grab', touchAction: 'none' }} data-connector-handle="true" data-connector-key={key} data-connector-end="start" onPointerDown={(event) => { event.stopPropagation(); const target = event.currentTarget as SVGCircleElement; const key = target.dataset.connectorKey!; const side = target.dataset.connectorEnd as 'start' | 'end'; dragRef.current = { id: `connector:${key}:${side}`, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: 0, originY: 0, panX: pan.x, panY: pan.y }; canvasRef.current?.setPointerCapture(event.pointerId); }} cx={start.x} cy={start.y} r="12" fill="#2563eb" stroke="white" strokeWidth="2"/><circle style={{ pointerEvents: 'auto', cursor: 'grab', touchAction: 'none' }} data-connector-handle="true" data-connector-key={key} data-connector-end="end" onPointerDown={(event) => { event.stopPropagation(); const target = event.currentTarget as SVGCircleElement; const key = target.dataset.connectorKey!; const side = target.dataset.connectorEnd as 'start' | 'end'; dragRef.current = { id: `connector:${key}:${side}`, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: 0, originY: 0, panX: pan.x, panY: pan.y }; canvasRef.current?.setPointerCapture(event.pointerId); }} cx={end.x} cy={end.y} r="12" fill="#2563eb" stroke="white" strokeWidth="2"/></>}</g>; })}</svg>
            {positions.map(renderCanvasCard)}{(() => { const studentParent = positions.find((item) => item.id === studentParentId) ?? positions.find((item) => item.id === 'principal'); const parent = classCards.length ? (positions.find((item) => item.id === 'principal') ?? studentParent) : studentParent; const point = parent ? nodePositions.get(parent.id) : null; if (!parent || !point) return null; const px = 950 + (point.x - 950) * (cardWidth / 220) + cardWidth / 2; const py = point.y + cardHeight; const columns = Math.min(4, Math.max(1, classCards.length)); const classRows = Math.ceil(classCards.length / columns); const classCardWidth = Math.min(220, Math.max(170, cardWidth)); const classCardHeight = Math.max(86, Math.min(112, cardHeight)); const classGap = 34; const lastOrgY = Math.max(...positions.map((item) => { const point = nodePositions.get(item.id); return point ? point.y + (editing && selectedCardId === item.id ? expandedCardHeight : cardHeight) : 0; }), py); const classTop = lastOrgY + 170; const classItems = classCards.map((item, index) => { const row = Math.floor(index / columns); const col = index % columns; const countInRow = Math.min(columns, classCards.length - row * columns); const rowWidth = countInRow * classCardWidth + Math.max(0, countInRow - 1) * classGap; return { item, x: (canvasWidth - rowWidth) / 2 + col * (classCardWidth + classGap), y: classTop + row * 150 }; }); const classBottom = classCards.length ? classTop + (classRows - 1) * 150 + classCardHeight : lastOrgY; const defaultY = Math.max(70 + 4 * (editing ? rowGap : 190), py + 150, classBottom + 100); const studentX = Number.isFinite(studentPosition.x) ? Number(studentPosition.x) : 840; const studentY = Math.max(Number.isFinite(studentPosition.y) ? Number(studentPosition.y) : defaultY, classBottom + (classCards.length ? 100 : 0)); const sx = 950 + (studentX - 950) * (cardWidth / 220); const specialKey = `${parent.id}:__students__`; const specialStart = connectorPositions[specialKey]?.start ?? { x: px, y: py }; const specialEnd = classCards.length ? { x: canvasWidth / 2, y: classTop - 28 } : connectorPositions[specialKey]?.end ?? { x: sx + cardWidth / 2, y: studentY }; return <><svg width={canvasWidth} height={canvasHeight} className="pointer-events-none absolute inset-0 z-20 overflow-visible"><path d={`M ${specialStart.x} ${specialStart.y} L ${specialStart.x} ${(specialStart.y + specialEnd.y) / 2} L ${specialEnd.x} ${(specialStart.y + specialEnd.y) / 2} L ${specialEnd.x} ${specialEnd.y}`} fill="none" stroke={editing ? '#3b82f6' : '#94a3b8'} strokeWidth="2" strokeDasharray={editing ? '6 5' : undefined}/>{editing && <><circle style={{ pointerEvents: 'auto', cursor: 'grab', touchAction: 'none' }} data-connector-handle="true" data-connector-key={specialKey} data-connector-end="start" onPointerDown={(event) => { event.stopPropagation(); const target = event.currentTarget as SVGCircleElement; const key = target.dataset.connectorKey!; const side = target.dataset.connectorEnd as 'start' | 'end'; dragRef.current = { id: `connector:${key}:${side}`, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: 0, originY: 0, panX: pan.x, panY: pan.y }; canvasRef.current?.setPointerCapture(event.pointerId); }} cx={specialStart.x} cy={specialStart.y} r="12" fill="#2563eb" stroke="white" strokeWidth="2"/><circle style={{ pointerEvents: 'auto', cursor: 'grab', touchAction: 'none' }} data-connector-handle="true" data-connector-key={specialKey} data-connector-end="end" onPointerDown={(event) => { event.stopPropagation(); const target = event.currentTarget as SVGCircleElement; const key = target.dataset.connectorKey!; const side = target.dataset.connectorEnd as 'start' | 'end'; dragRef.current = { id: `connector:${key}:${side}`, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: 0, originY: 0, panX: pan.x, panY: pan.y }; canvasRef.current?.setPointerCapture(event.pointerId); }} cx={specialEnd.x} cy={specialEnd.y} r="12" fill="#2563eb" stroke="white" strokeWidth="2"/></>}</svg>{classCards.length > 0 && <><svg width={canvasWidth} height={canvasHeight} className="pointer-events-none absolute inset-0 z-20 overflow-visible">{Array.from({ length: classRows }, (_, row) => { const rowItems = classItems.filter((entry) => Math.floor(classCards.findIndex((item) => item.id === entry.item.id) / columns) === row); const centers = rowItems.map((entry) => entry.x + classCardWidth / 2); const rowTrunkY = rowItems[0]?.y - 20; return <g key={`class-row-${row}`}><path d={`M ${Math.min(...centers)} ${rowTrunkY} L ${Math.max(...centers)} ${rowTrunkY}`} fill="none" stroke="#d97706" strokeWidth="2.5"/>{rowItems.map((entry) => <path key={`class-drop-${entry.item.id}`} d={`M ${entry.x + classCardWidth / 2} ${rowTrunkY} L ${entry.x + classCardWidth / 2} ${entry.y}`} fill="none" stroke="#d97706" strokeWidth="2"/>)}<path d={`M ${canvasWidth / 2} ${rowTrunkY} L ${canvasWidth / 2} ${row === classRows - 1 ? studentY : classItems.filter((entry) => Math.floor(classCards.findIndex((item) => item.id === entry.item.id) / columns) === row + 1)[0]?.y - 20}`} fill="none" stroke="#d97706" strokeWidth="2.5"/></g>; })}</svg>{classItems.map(({ item, x, y }) => <div key={`homeroom-${item.id}`} className="absolute z-10 overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 text-center shadow-[0_8px_24px_-12px_rgba(180,83,9,0.45)] dark:from-amber-950 dark:via-yellow-950/70 dark:to-orange-950" style={{ left: x, top: y, width: classCardWidth, minHeight: classCardHeight }}><div className="h-1.5 bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-500"/><div className="flex min-w-0 items-center justify-center gap-3 p-2">{item.photoUrl ? <img src={item.photoUrl} alt={`Foto ${item.teacherName ?? 'wali kelas'}`} className="size-12 shrink-0 rounded-xl border-2 border-white object-cover shadow"/> : <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-200 text-sm font-black text-amber-800 dark:bg-amber-900 dark:text-amber-100">{item.teacherName?.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join('').toUpperCase() || 'WK'}</div>}<div className="min-w-0 flex-1 text-center"><p className="text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200">Wali Kelas</p><p className="truncate text-xs font-extrabold text-slate-900 dark:text-slate-100">{item.teacherName ?? 'Belum ditentukan'}</p><p className="truncate text-[10px] font-bold text-amber-800 dark:text-amber-200">{item.name}</p>{item.nip && <p className="truncate text-[9px] text-muted-foreground">NIP: {item.nip}</p>}</div></div></div>)}</>}<div data-org-card="true" onPointerDown={(event) => beginCardPress(event, { id: '__students__', title: 'Peserta Didik', category: 'Peserta Didik', sortOrder: 9999, parentId: 'vice-student', locked: true })} style={{ position: 'absolute', left: sx, top: studentY, width: cardWidth, minHeight: cardHeight, touchAction: 'none', cursor: editing ? 'grab' : 'default' }} className={`z-10 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-card to-orange-50 px-3 text-center shadow-[0_8px_24px_-12px_rgba(180,83,9,0.45)] dark:from-amber-950/40 dark:to-orange-950/30 ${cardHeight <= 70 ? 'py-1' : 'py-3'} ${editing && selectedCardId === '__students__' ? 'ring-2 ring-blue-500' : ''}`}><Users size={cardHeight <= 70 ? 14 : 22} className="mx-auto mb-1 text-amber-600"/><p className="text-xs font-bold">PESERTA DIDIK</p><p className="mt-0.5 text-[10px] text-muted-foreground">Seluruh peserta didik</p>{editing && selectedCardId === '__students__' && <p className="mt-1 text-[9px] font-bold text-blue-700 dark:text-blue-300">Pilih atasan langsung di bawah</p>}{editing && selectedCardId === '__students__' && <div className="absolute left-0 top-full z-30 mt-2 w-full rounded-xl border bg-card p-2 text-left shadow-xl"><label className="block text-[10px] font-semibold">Terhubung langsung ke<select value={studentParentId} onChange={(event) => setStudentParentId(event.target.value)} className="mt-1 w-full rounded-lg border bg-background px-2 py-2 text-xs">{positions.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title || 'Jabatan belum diisi'}</option>)}</select></label></div>}</div></>; })()}
          </div></div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Foto dan identitas mengikuti data profil guru/pegawai. NIP ditampilkan jika tersedia. Penetapan jabatan tidak mengubah role akun EduFlow.</p>
    </section>
  );
}
