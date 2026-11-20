'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, ChevronDown, ImagePlus, Save, Trash2, Users, X, ZoomIn, ZoomOut, Maximize2, Printer, FileDown, Minus, Square, MousePointer2, Hand, Undo2, Redo2 } from 'lucide-react';
import { request, upload } from '../../lib/api-client';
import { getCurrentSessionUser } from '../../lib/session';
import { prepareProfilePhotoForUpload } from '../../lib/image-compression';
import { PrintPreview } from '../print/print-preview';
import { HomeroomCardEditor } from './homeroom-card-editor';
import { getOrganizationCardLayout, snapCardPosition } from './card-layout';
import { OrganizationCardEditor } from './organization-card-editor';

type Teacher = { id: string; name: string; nip?: string | null; photoUrl?: string | null };
type Position = { id: string; title: string; personName?: string | null; teacherId?: string | null; category: string; sortOrder: number; locked?: boolean; nip?: string | null; photoUrl?: string | null; x?: number; y?: number };
type OrganizationClass = { id: string; name: string; grade?: string | null; teacherId?: string | null; teacherName?: string | null; nip?: string | null; photoUrl?: string | null };
type OrganizationResponse = { positions: Position[]; defaults: Position[]; schoolYear?: { id: string; name: string } | null; classes?: OrganizationClass[] };
type UploadResponse = { data?: Teacher; message?: string };

type Connector = { start?: { x: number; y: number }; end?: { x: number; y: number }; points?: Array<{ x: number; y: number }>; type?: 'line' | 'rect'; hidden?: boolean };
type ConnectorMap = Record<string, Connector>;

function normalizeConnectors(input: Record<string, Connector>): ConnectorMap {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key, value]) => key.startsWith('shape:') && ((value.start && value.end) || (value.points && value.points.length >= 2)))
      .map(([key, value]) => {
        const cleanKey = key.replace(/^`|`$/g, '');
        const normalizedKey = cleanKey;
        const points = value.points && value.points.length >= 2 ? value.points : undefined;
        return [normalizedKey, {
          ...value,
          start: value.start ?? points?.[0],
          end: value.end ?? points?.[points.length - 1],
          type: value.type === 'rect' ? 'rect' : 'line',
        }];
      }),
  );
}

type CardMove = { from: { x: number; y: number }; to: { x: number; y: number } };

function shiftAttachedConnectors(connectors: ConnectorMap, moves: CardMove[], width: number, height: number): ConnectorMap {
  if (!moves.length) return connectors;
  const endpointDelta = (point: { x: number; y: number }) => {
    let best: { dx: number; dy: number; distance: number } | null = null;
    for (const move of moves) {
      const sides = [
        { old: { x: move.from.x + width / 2, y: move.from.y }, next: { x: move.to.x + width / 2, y: move.to.y } },
        { old: { x: move.from.x + width / 2, y: move.from.y + height }, next: { x: move.to.x + width / 2, y: move.to.y + height } },
        { old: { x: move.from.x, y: move.from.y + height / 2 }, next: { x: move.to.x, y: move.to.y + height / 2 } },
        { old: { x: move.from.x + width, y: move.from.y + height / 2 }, next: { x: move.to.x + width, y: move.to.y + height / 2 } },
      ];
      for (const side of sides) {
        const distance = Math.hypot(side.old.x - point.x, side.old.y - point.y);
        if (distance <= 36 && (!best || distance < best.distance)) best = { dx: side.next.x - point.x, dy: side.next.y - point.y, distance };
      }
    }
    return best ? { dx: best.dx, dy: best.dy } : null;
  };
  return Object.fromEntries(Object.entries(connectors).map(([key, connector]) => {
    if (!key.startsWith('shape:') || connector.type !== 'line') return [key, connector];
    const points = connector.points?.length ? [...connector.points] : [connector.start, connector.end].filter((point): point is { x: number; y: number } => Boolean(point));
    if (points.length < 2) return [key, connector];
    const first = endpointDelta(points[0]);
    const last = endpointDelta(points[points.length - 1]);
    if (!first && !last) return [key, connector];
    const adjusted = points.map((point, index) => {
      const t = points.length <= 1 ? 0 : index / (points.length - 1);
      const dx = first && last ? first.dx + (last.dx - first.dx) * t : (first ?? last)!.dx;
      const dy = first && last ? first.dy + (last.dy - first.dy) * t : (first ?? last)!.dy;
      return { x: point.x + dx, y: point.y + dy };
    });
    return [key, { ...connector, start: adjusted[0], end: adjusted[adjusted.length - 1], points: adjusted }];
  }));
}

export function SchoolOrganization() {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => { setRoles(getCurrentSessionUser()?.roles ?? []); }, []);
  const canManage = roles.includes('operator_sekolah') && !roles.includes('root');
  const [positions, setPositions] = useState<Position[]>([]);
  const [classCards, setClassCards] = useState<OrganizationClass[]>([]);
  const [schoolYearName, setSchoolYearName] = useState('');
  const [printMarkup, setPrintMarkup] = useState<string | null>(null);
  const [studentPosition, setStudentPosition] = useState<{ x?: number; y?: number }>({});
  const [connectorPositions, setConnectorPositions] = useState<ConnectorMap>({});
  const [drawTool, setDrawTool] = useState<'pan' | 'select' | 'line' | 'rect'>('pan');
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ positions: Position[]; connectors: typeof connectorPositions }[]>([]);
  const [future, setFuture] = useState<{ positions: Position[]; connectors: typeof connectorPositions }[]>([]);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const linePointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [linePreview, setLinePreview] = useState<{ x: number; y: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [canEditViewport, setCanEditViewport] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string | null; pointerId: number; startX: number; startY: number; originX: number; originY: number; panX: number; panY: number } | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardWidth, setCardWidth] = useState(220);
  const [cardHeight, setCardHeight] = useState(100);
  const [rowGap, setRowGap] = useState(210);
  const previousRowGapRef = useRef(rowGap);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const pressRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; originX: number; originY: number; groupOrigins: Array<{ id: string; x: number; y: number }>; dragging: boolean } | null>(null);
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
      let parsedConnectors: ConnectorMap = {};
      try {
        const storedConnectors = connectorNode?.personName ? JSON.parse(connectorNode.personName) as ConnectorMap : {};
        parsedConnectors = normalizeConnectors(storedConnectors);
      } catch { parsedConnectors = {}; }
      setConnectorPositions(parsedConnectors);
      setClassCards(data.classes ?? []);
      setSchoolYearName(data.schoolYear?.name ?? '');
      const studentNode = data.positions.find((item) => item.id === '__students__');
      setStudentPosition(studentNode ? { x: studentNode.x, y: studentNode.y } : {});
      setPositions(data.positions.filter((item) => item.id !== '__students__' && item.id !== '__connectors__'));
      if (canManage) setTeachers(await request<Teacher[]>('/school-organization/teachers'));
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat struktur organisasi.'); }
    finally { setLoading(false); }
  }, [canManage]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!editing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      lineStartRef.current = null;
      setLinePreview(null);
      setSelectedCardId(null);
      setSelectedShapeId(null);
      setEditing(false);
      void load();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing, load]);

  useEffect(() => {
    if (!editing || previousRowGapRef.current === rowGap) return;
    const ordered = [...positions].sort((a, b) => a.sortOrder - b.sortOrder);
    const rowById = new Map(ordered.map((item, index) => [item.id, index === 0 ? 0 : 1 + Math.floor((index - 1) / 4)]));
    const moves: CardMove[] = [];
    const nextPositions = positions.map((item) => {
      const oldPoint = nodePositions.get(item.id) ?? { x: item.x ?? 0, y: item.y ?? 0 };
      const row = rowById.get(item.id) ?? 0;
      const nextPoint = { x: oldPoint.x, y: 70 + row * rowGap };
      if (oldPoint.y !== nextPoint.y) moves.push({ from: oldPoint, to: nextPoint });
      return { ...item, x: nextPoint.x, y: nextPoint.y };
    });
    const deepestBottom = Math.max(0, ...nextPositions.map((item) => (item.y ?? 0) + cardHeight));
    const visibleClasses = classCards.filter((item) => !connectorPositions['__homeroom_hidden__:' + item.id]?.hidden);
    const columns = Math.min(4, Math.max(1, visibleClasses.length));
    const classPositions = visibleClasses.map((item, index) => {
      const oldSavedPoint = connectorPositions['__homeroom_position__:' + item.id]?.start;
      const oldClassRow = Math.floor(index / columns), oldClassCol = index % columns;
      const oldClassCount = Math.min(columns, visibleClasses.length - oldClassRow * columns);
      const oldClassWidth = oldClassCount * cardWidth + Math.max(0, oldClassCount - 1) * 40;
      const oldDeepestBottom = Math.max(0, ...positions.map((entry) => (nodePositions.get(entry.id)?.y ?? 0) + cardHeight));
      const oldPoint = oldSavedPoint ?? { x: (canvasWidth - oldClassWidth) / 2 + oldClassCol * (cardWidth + 40), y: oldDeepestBottom + rowGap - cardHeight + oldClassRow * rowGap };
      const row = Math.floor(index / columns), col = index % columns;
      const count = Math.min(columns, visibleClasses.length - row * columns);
      const rowWidth = count * cardWidth + Math.max(0, count - 1) * 40;
      const nextPoint = { x: (canvasWidth - rowWidth) / 2 + col * (cardWidth + 40), y: deepestBottom + rowGap - cardHeight + row * rowGap };
      if (oldPoint.x !== nextPoint.x || oldPoint.y !== nextPoint.y) moves.push({ from: oldPoint, to: nextPoint });
      return { id: item.id, point: nextPoint };
    });
    setConnectorPositions((items) => {
      const shifted = shiftAttachedConnectors(items, moves, cardWidth, cardHeight);
      const next = { ...shifted };
      for (const entry of classPositions) next['__homeroom_position__:' + entry.id] = { ...next['__homeroom_position__:' + entry.id], start: entry.point };
      return next;
    });
    setPositions(nextPositions);
    previousRowGapRef.current = rowGap;
  }, [editing, rowGap]);

  useEffect(() => {
    canvasRef.current?.style.setProperty('--org-card-width', `${cardWidth}px`);
    canvasRef.current?.style.setProperty('--org-card-height', `${cardHeight}px`);
  }, [cardWidth, cardHeight]);

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

  function rememberChange() {
    setHistory((items) => [...items.slice(-49), { positions: structuredClone(positions), connectors: structuredClone(connectorPositions) }]);
    setFuture([]);
  }

  function undoChange() {
    setHistory((items) => {
      if (!items.length) return items;
      const previous = items[items.length - 1];
      setFuture((next) => [{ positions: structuredClone(positions), connectors: structuredClone(connectorPositions) }, ...next].slice(0, 50));
      setPositions(previous.positions); setConnectorPositions(previous.connectors); setSelectedCardId(null); setSelectedShapeId(null);
      return items.slice(0, -1);
    });
  }

  function redoChange() {
    setFuture((items) => {
      if (!items.length) return items;
      const next = items[0];
      setHistory((past) => [...past, { positions: structuredClone(positions), connectors: structuredClone(connectorPositions) }].slice(-50));
      setPositions(next.positions); setConnectorPositions(next.connectors); setSelectedCardId(null); setSelectedShapeId(null);
      return items.slice(1);
    });
  }

  function addOrganizationCard() {
    rememberChange();
    const id = `custom-${crypto.randomUUID()}`;
    const occupied = new Set(positions.map((item) => {
      const point = nodePositions.get(item.id) ?? { x: item.x ?? 0, y: item.y ?? 0 };
      return `${Math.round((point.x - (canvasWidth - (4 * cardWidth + 120)) / 2) / (cardWidth + 40))}:${Math.round((point.y - 70) / rowGap)}`;
    }));
    let cell = 0;
    while (occupied.has(`${cell % 4}:${Math.floor(cell / 4)}`)) cell++;
    const x = (canvasWidth - (4 * cardWidth + 120)) / 2 + (cell % 4) * (cardWidth + 40);
    const y = 70 + Math.floor(cell / 4) * rowGap;
    setPositions((items) => [...items, { id, title: 'Jabatan Baru', category: 'Jabatan Lainnya', sortOrder: items.length + 1, x, y }]);
    setSelectedCardId(id); setSelectedCardIds([id]); setSelectedShapeId(null); setDrawTool('select');
  }

  function update(id: string, patch: Partial<Position>) {
    rememberChange();
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
        return { ...item, ...(point ? { x: point.x, y: point.y } : {}) };
      });
      const deepestOrgBottom = Math.max(0, ...positions.map((item) => {
        const point = nodePositions.get(item.id);
        return point ? point.y + cardHeight : 0;
      }));
      const classRows = Math.ceil(classCards.length / 4);
      const classSectionBottom = classCards.length
        ? deepestOrgBottom + rowGap - cardHeight + Math.max(0, classRows - 1) * rowGap + cardHeight
        : deepestOrgBottom;
      const defaultStudentY = Math.max(900, classSectionBottom + (classCards.length ? 100 : 150));
      const studentNode: Position = { id: '__students__', title: 'Peserta Didik', category: 'Peserta Didik', sortOrder: 9999, locked: true, x: studentPosition.x ?? 840, y: studentPosition.y ?? defaultStudentY };
      const connectorNode: Position = { id: '__connectors__', title: 'Pengaturan Konektor', category: 'Pengaturan', sortOrder: 10000, personName: JSON.stringify(connectorPositions), locked: true };
      const result = await request<OrganizationResponse>('/school-organization', { method: 'PUT', body: JSON.stringify({ positions: [...persistedPositions, studentNode, connectorNode] }) });
      const savedStudentNode = result.positions.find((item) => item.id === '__students__');
      const savedConnectorNode = result.positions.find((item) => item.id === '__connectors__');
      setConnectorPositions(savedConnectorNode?.personName ? normalizeConnectors(JSON.parse(savedConnectorNode.personName) as ConnectorMap) : {});
      setStudentPosition(savedStudentNode ? { x: savedStudentNode.x, y: savedStudentNode.y } : {});
      setPositions(result.positions.filter((item) => item.id !== '__students__' && item.id !== '__connectors__')); lineStartRef.current = null; linePointsRef.current = []; setLinePreview(null); setEditing(false); setNotice('Struktur organisasi berhasil disimpan.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan struktur organisasi.'); }
    finally { setSaving(false); }
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

  async function updateHomeroomTeacher(classId: string, teacherId: string) {
    setError('');
    setNotice('');
    try {
      const response = await request<{ data?: OrganizationClass; message?: string }>(
        `/academic/classes/${classId}/homeroom-teacher`,
        { method: 'PATCH', body: JSON.stringify({ teacherId: teacherId || null }) },
      );
      const teacher = teachers.find((item) => item.id === teacherId);
      setClassCards((items) => items.map((item) => item.id === classId ? {
        ...item,
        teacherId: teacher?.id ?? null,
        teacherName: teacher?.name ?? null,
        nip: teacher?.nip ?? null,
        photoUrl: teacher?.photoUrl ?? null,
      } : item));
      setNotice(response.message ?? 'Wali kelas berhasil diperbarui.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui wali kelas.');
    }
  }

  const expandedCardHeight = cardHeight;
  const contentScale = Math.max(0.65, Math.min(1.8, Math.min(cardWidth / 220, cardHeight / 100)));
  const photoHeight = Math.max(32, 78 * contentScale);
  const photoWidth = photoHeight * 2 / 3;
  const contentGap = Math.max(6, 12 * contentScale);
  const contentPadding = Math.max(4, 10 * contentScale);
  const [cardEditorId, setCardEditorId] = useState<string | null>(null);

  const nodePositions = useMemo(() => {
    const layout = getOrganizationCardLayout(positions, { canvasWidth, cardWidth, cardHeight, rowGap, editing });
    return layout.positions;
  }, [positions, editing, rowGap, cardWidth, cardHeight, canvasWidth]);

  const canvasHeight = useMemo(() => {
    const deepestOrgBottom = Math.max(0, ...positions.map((item) => {
      const point = nodePositions.get(item.id);
      return point ? point.y + (editing && selectedCardId === item.id ? expandedCardHeight : cardHeight) : 0;
    }));
    const classRows = Math.ceil(classCards.length / 4);
    const classSectionBottom = classCards.length ? deepestOrgBottom + rowGap - cardHeight + Math.max(0, classRows - 1) * rowGap + cardHeight + 100 : deepestOrgBottom;
    const studentBottom = Math.max(studentPosition.y ?? 0, classSectionBottom + (classCards.length ? 100 : 0)) + cardHeight;
    return Math.max(900, Math.ceil(Math.max(classSectionBottom, studentBottom) + 260));
  }, [positions, nodePositions, editing, selectedCardId, expandedCardHeight, cardHeight, classCards.length, studentPosition.y]);

  function movePosition(id: string, x: number, y: number) {
    const next = { x: Math.max(0, x), y: Math.max(0, y) };
    const previous = id.startsWith('homeroom:') ? cardPoint(id) : id === '__students__' ? { x: studentPosition.x ?? 840, y: studentPosition.y ?? 900 } : nodePositions.get(id);
    if (previous) {
      const toCanvas = (point: { x: number; y: number }) => ({ x: 950 + (point.x - 950) * (cardWidth / 220), y: point.y });
      setConnectorPositions((items) => shiftAttachedConnectors(items, [{ from: toCanvas(previous), to: toCanvas(next) }], cardWidth, cardHeight));
    }
    if (id.startsWith('homeroom:')) {
      const key = '__homeroom_position__:' + id.slice('homeroom:'.length);
      setConnectorPositions((items) => ({ ...items, [key]: { ...items[key], start: next } }));
    } else if (id === '__students__') setStudentPosition(next);
    else setPositions((items) => items.map((item) => item.id === id ? { ...item, ...next } : item));
  }

  function onCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (editing && drawTool === 'rect' && !target.closest('button,[data-org-card],[data-connector-handle]')) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const point = { x: Math.max(0, (event.clientX - rect.left - pan.x) / effectiveScale), y: Math.max(0, (event.clientY - rect.top - pan.y) / effectiveScale) };
        addOrganizationCard();
      }
      return;
    }
    if (editing && drawTool === 'line' && !target.closest('button,[data-connector-handle]')) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      let point = { x: Math.max(0, (event.clientX - rect.left - pan.x) / effectiveScale), y: Math.max(0, (event.clientY - rect.top - pan.y) / effectiveScale) };
      const cardElement = target.closest<HTMLElement>('[data-org-card],[data-homeroom-card]');
      let cardBounds: { left: number; top: number; width: number; height: number } | null = null;
      if (cardElement) {
        const bounds = cardElement.getBoundingClientRect();
        cardBounds = { left: (bounds.left - rect.left - pan.x) / effectiveScale, top: (bounds.top - rect.top - pan.y) / effectiveScale, width: bounds.width / effectiveScale, height: bounds.height / effectiveScale };
      }
      let lineSnap: { point: { x: number; y: number }; distance: number } | null = null;
      if (!cardBounds) {
        for (const [key, connector] of Object.entries(connectorPositions)) {
          if (!key.startsWith('shape:') || connector.type !== 'line') continue;
          const vertices = connector.points?.length ? connector.points : [connector.start, connector.end].filter((value): value is { x: number; y: number } => Boolean(value));
          for (let index = 0; index < vertices.length - 1; index++) {
            const a = vertices[index]; const b = vertices[index + 1];
            const vx = b.x - a.x; const vy = b.y - a.y;
            const lengthSquared = vx * vx + vy * vy;
            const ratio = lengthSquared ? Math.max(0, Math.min(1, ((point.x - a.x) * vx + (point.y - a.y) * vy) / lengthSquared)) : 0;
            const projected = { x: a.x + ratio * vx, y: a.y + ratio * vy };
            const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
            if (distance <= 16 && (!lineSnap || distance < lineSnap.distance)) lineSnap = { point: projected, distance };
          }
        }
      }
      if (cardBounds) {
        const sides = [
          { x: cardBounds.left + cardBounds.width / 2, y: cardBounds.top },
          { x: cardBounds.left + cardBounds.width / 2, y: cardBounds.top + cardBounds.height },
          { x: cardBounds.left, y: cardBounds.top + cardBounds.height / 2 },
          { x: cardBounds.left + cardBounds.width, y: cardBounds.top + cardBounds.height / 2 },
        ];
        point = sides.reduce((best, side) => Math.hypot(side.x - point.x, side.y - point.y) < Math.hypot(best.x - point.x, best.y - point.y) ? side : best);
      } else if (lineSnap) {
        point = { x: Math.round(lineSnap.point.x / 5) * 5, y: Math.round(lineSnap.point.y / 5) * 5 };
      }
      if (cardBounds || lineSnap) {
        if (!linePointsRef.current.length) {
          linePointsRef.current = [point]; lineStartRef.current = point; setLinePreview(point);
          setNotice(lineSnap ? 'Titik awal menempel pada garis yang sudah ada. Klik titik sudut, lalu klik kartu atau garis tujuan.' : 'Titik awal terpasang pada kartu. Klik titik sudut, lalu klik kartu atau garis tujuan.');
        } else {
          const aligned = [...linePointsRef.current];
          const last = aligned[aligned.length - 1];
          const dx = Math.abs(point.x - last.x);
          const dy = Math.abs(point.y - last.y);
          // Correct small auto-alignment offsets by moving the last corner onto
          // the exact destination axis instead of leaving a short overshooting stub.
          if (dx <= 16 && dy > 5) last.x = point.x;
          else if (dy <= 16 && dx > 5) last.y = point.y;
          else if (dx > 5 && dy > 5) {
            const beforeLast = aligned.length > 1 ? aligned[aligned.length - 2] : null;
            const previousWasHorizontal = beforeLast ? Math.abs(last.x - beforeLast.x) >= Math.abs(last.y - beforeLast.y) : true;
            aligned.push(previousWasHorizontal ? { x: point.x, y: last.y } : { x: last.x, y: point.y });
          }
          // Remove duplicate and redundant collinear vertices for a clean path.
          const points = [...aligned, point].filter((vertex, index, list) => index === 0 || Math.hypot(vertex.x - list[index - 1].x, vertex.y - list[index - 1].y) > 1).filter((vertex, index, list) => {
            if (index === 0 || index === list.length - 1) return true;
            const before = list[index - 1]; const after = list[index + 1];
            return Math.abs((vertex.x - before.x) * (after.y - vertex.y) - (vertex.y - before.y) * (after.x - vertex.x)) > 1;
          });
          rememberChange();
          const key = 'shape:' + crypto.randomUUID();
          setConnectorPositions((items) => ({ ...items, [key]: { type: 'line', start: points[0], end: point, points } }));
          setSelectedShapeId(key); setSelectedCardId(null); linePointsRef.current = []; lineStartRef.current = null;
          setLinePreview(null); setDrawTool('select'); setNotice(lineSnap ? 'Garis berhasil menempel pada garis yang sudah ada.' : 'Garis berhasil terhubung dengan auto alignment.');
        }
      } else if (!linePointsRef.current.length) {
        setNotice('Mulai garis dengan mengeklik sisi kartu asal.');
      } else {
        const previous = linePointsRef.current[linePointsRef.current.length - 1];
        const dx = Math.abs(point.x - previous.x); const dy = Math.abs(point.y - previous.y);
        if (dx <= 24) point.x = previous.x;
        else if (dy <= 24) point.y = previous.y;
        else {
          const beforePrevious = linePointsRef.current.length > 1 ? linePointsRef.current[linePointsRef.current.length - 2] : null;
          const horizontal = beforePrevious ? Math.abs(previous.x - beforePrevious.x) >= Math.abs(previous.y - beforePrevious.y) : true;
          if (horizontal) point.y = previous.y; else point.x = previous.x;
        }
        point = { x: Math.round(point.x / 5) * 5, y: Math.round(point.y / 5) * 5 };
        linePointsRef.current = [...linePointsRef.current, point]; lineStartRef.current = point; setLinePreview(point);
      }
      return;
    }
    if (editing && drawTool === 'pan' && !target.closest('button,[data-connector-handle]')) {
      dragRef.current = { id: null, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: 0, originY: 0, panX: pan.x, panY: pan.y };
      event.currentTarget.setPointerCapture(event.pointerId); return;
    }

    const endpoint = (event.target as HTMLElement).closest<HTMLElement>('[data-connector-handle]');
    if (endpoint) {
      const key = endpoint.dataset.connectorKey!;
      const end = endpoint.dataset.connectorEnd as 'start' | 'end';
      rememberChange();
      dragRef.current = { id: `connector:${key}:${end}`, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: 0, originY: 0, panX: pan.x, panY: pan.y };
      (event.target as Element).setPointerCapture(event.pointerId);
      event.stopPropagation();
      return;
    }
    if ((event.target as HTMLElement).closest('[data-org-card],[data-homeroom-card]')) return;
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
      const deepestOrgBottom = Math.max(0, ...positions.map((item) => {
        const point = nodePositions.get(item.id);
        return point ? point.y + cardHeight : 0;
      }));
      const classRows = Math.ceil(classCards.length / 4);
      const classSectionBottom = classCards.length
        ? deepestOrgBottom + rowGap - cardHeight + Math.max(0, classRows - 1) * rowGap + cardHeight
        : deepestOrgBottom;
      const studentY = studentPosition.y ?? Math.max(900, classSectionBottom + (classCards.length ? 100 : 150));
      anchors.push({ x: studentX + cardWidth / 2, y: studentY }, { x: studentX + cardWidth / 2, y: studentY + cardHeight }, { x: studentX, y: studentY + cardHeight / 2 }, { x: studentX + cardWidth, y: studentY + cardHeight / 2 });
      const nearest = anchors.map((point) => ({ point, distance: Math.hypot(point.x - x, point.y - y) })).sort((a, b) => a.distance - b.distance)[0];
      if (nearest && nearest.distance <= 34) ({ x, y } = nearest.point);
      setConnectorPositions((items) => {
        const connector = items[key];
        if (!connector) return items;
        const points = connector.points ? [...connector.points] : [connector.start ?? { x, y }, connector.end ?? { x, y }];
        points[end === 'start' ? 0 : points.length - 1] = { x, y };
        return { ...items, [key]: { ...connector, [end]: { x, y }, ...(connector.points ? { points } : {}) } };
      });
    } else if (drag.id) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      movePosition(drag.id, drag.originX + (event.clientX - drag.startX) / effectiveScale, drag.originY + (event.clientY - drag.startY) / effectiveScale);
    } else setPan({ x: drag.panX + event.clientX - drag.startX, y: drag.panY + event.clientY - drag.startY });
  }

  function cardPoint(id: string) {
    if (id.startsWith('homeroom:')) {
      const classId = id.slice('homeroom:'.length);
      const saved = connectorPositions['__homeroom_position__:' + classId]?.start;
      if (saved) return saved;
      const visible = classCards.filter((item) => !connectorPositions['__homeroom_hidden__:' + item.id]?.hidden);
      const index = visible.findIndex((item) => item.id === classId);
      const columns = Math.min(4, Math.max(1, visible.length));
      const row = Math.floor(index / columns), col = index % columns;
      const count = Math.min(columns, visible.length - row * columns);
      const rowWidth = count * 220 + Math.max(0, count - 1) * 40;
      const deepestBottom = Math.max(0, ...positions.map((item) => (nodePositions.get(item.id)?.y ?? 0) + cardHeight));
      return { x: (canvasWidth - rowWidth) / 2 + col * 260, y: deepestBottom + rowGap - cardHeight + row * rowGap };
    }
    if (id === '__students__') return { x: studentPosition.x ?? 840, y: studentPosition.y ?? 900 };
    return nodePositions.get(id) ?? { x: 80, y: 80 };
  }
  function beginCardPress(event: ReactPointerEvent<HTMLElement>, item: Position) {
    if (!editing || drawTool === 'pan' || drawTool === 'line' || drawTool === 'rect' || (event.target as HTMLElement).closest('button,input,select')) return;
    event.stopPropagation();
    event.preventDefault();
    let group = selectedCardIds.includes(item.id) ? selectedCardIds : [item.id];
    if (event.shiftKey) {
      group = selectedCardIds.includes(item.id) ? selectedCardIds.filter((id) => id !== item.id) : [...selectedCardIds, item.id];
      setSelectedCardIds(group);
      setSelectedCardId(group[group.length - 1] ?? null);
      return;
    }
    if (!selectedCardIds.includes(item.id)) {
      group = [item.id];
      setSelectedCardIds(group);
    }
    const groupOrigins = group.map((id) => ({ id, ...cardPoint(id) }));
    const point = cardPoint(item.id);
    pressRef.current = { id: item.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: point.x, originY: point.y, groupOrigins, dragging: false };
    canvasRef.current?.setPointerCapture(event.pointerId);
  }
  function moveCardPress(event: ReactPointerEvent<HTMLDivElement>) {
    const press = pressRef.current; if (!press || press.pointerId !== event.pointerId) return;
    const dx = event.clientX - press.startX, dy = event.clientY - press.startY;
    if (!press.dragging && Math.hypot(dx, dy) > 5) { press.dragging = true; rememberChange(); setSelectedCardId(null); }
    if (press.dragging) press.groupOrigins.forEach((origin) => movePosition(origin.id, origin.x + dx / (effectiveScale * (cardWidth / 220)), origin.y + dy / effectiveScale));
  }
  function endCardPress(event: ReactPointerEvent<HTMLDivElement>) {
    const press = pressRef.current; if (!press || press.pointerId !== event.pointerId) return;
    if (!press.dragging) { setSelectedCardId(press.id); if (!press.id.startsWith('homeroom:') && press.id !== '__students__') setCardEditorId(press.id); setSelectedShapeId(null); }
    pressRef.current = null;
  }

  const renderCanvasCard = (item: Position) => {
    const teacher = teachers.find((person) => person.id === item.teacherId);
    const name = item.personName ?? teacher?.name ?? 'Belum ditentukan';
    const nip = item.nip ?? teacher?.nip;
    const photoUrl = teacher?.photoUrl ?? item.photoUrl;
    const point = nodePositions.get(item.id) ?? { x: 80, y: 80 };
    return <article key={item.id} data-org-card="true" onPointerDown={(event) => beginCardPress(event, item)} style={{ position: 'absolute', left: 950 + (point.x - 950) * (cardWidth / 220), top: point.y, width: cardWidth, height: editing && selectedCardId === item.id ? expandedCardHeight : cardHeight, touchAction: 'none', cursor: editing ? 'grab' : 'default' }} className={`org-print-node z-10 overflow-hidden rounded-2xl border-2 shadow-[0_10px_26px_-13px_rgba(15,23,42,0.42)] transition-shadow ${item.id === 'principal' ? 'border-blue-400 bg-gradient-to-br from-blue-100 via-sky-50 to-indigo-100 dark:from-blue-950 dark:via-sky-950/70 dark:to-indigo-950' : item.category === 'Wakil Kepala Sekolah' ? 'border-emerald-300 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-950 dark:via-teal-950/70 dark:to-cyan-950' : item.category === 'Tenaga Kependidikan' ? 'border-orange-300 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-950 dark:via-amber-950/70 dark:to-yellow-950' : item.category === 'Koordinator' ? 'border-violet-300 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-purple-100 dark:from-violet-950 dark:via-fuchsia-950/70 dark:to-purple-950' : 'border-sky-300 bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100 dark:from-sky-950 dark:via-cyan-950/70 dark:to-blue-950'} ${editing && selectedCardId === item.id ? 'ring-2 ring-blue-500 shadow-xl' : editing ? 'ring-1 ring-dashed ring-slate-300' : 'hover:shadow-lg'}`}>
      <div className={`h-2 w-full rounded-t-2xl bg-gradient-to-r ${item.id === 'principal' ? 'from-blue-700 via-indigo-500 to-sky-400' : item.category === 'Wakil Kepala Sekolah' ? 'from-emerald-600 via-teal-500 to-cyan-400' : item.category === 'Tenaga Kependidikan' ? 'from-orange-600 via-amber-500 to-yellow-400' : item.category === 'Koordinator' ? 'from-violet-600 via-fuchsia-500 to-purple-400' : 'from-sky-600 via-cyan-500 to-blue-400'}`} />
      <div className="flex h-[calc(100%-8px)] min-h-0 w-full items-center justify-center" style={{ gap: contentGap, padding: contentPadding }}>
        <div className="relative shrink-0 overflow-hidden rounded-lg border-2 border-background bg-gradient-to-br from-muted to-muted/60 shadow-sm" style={{ width: photoWidth, height: photoHeight, aspectRatio: "4 / 6" }}>
          {photoUrl ? <img src={photoUrl} alt={`Foto ${name}`} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground font-bold" style={{ fontSize: 13 * contentScale }}>{name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") .toUpperCase() || "—"}</div>}
        </div>
        <div className="min-w-0 flex-1 text-center">
          <p className="inline-flex max-w-full justify-center whitespace-normal rounded-full bg-primary/10 px-2 py-0.5 font-extrabold uppercase leading-tight tracking-wider text-primary" style={{ fontSize: 9 * contentScale }}>{item.title || "Jabatan belum diisi"}</p>
          <p className="mt-1 break-words font-extrabold leading-tight text-foreground" style={{ fontSize: 12 * contentScale }}>{name}</p>
          <p className="mt-1 font-medium text-muted-foreground" style={{ fontSize: 9 * contentScale }}>NIP: {nip || "—"}</p>
        </div>
      </div>

    </article>;
  };

  const openPrintView = () => {
    const source = printSourceRef.current;
    if (!source) return;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input,select,button').forEach((node) => node.remove());
    clone.querySelectorAll('.org-print-node > div.border-t').forEach((node) => node.remove());
    clone.querySelectorAll('.org-print-node').forEach((node) => {
      const card = node as HTMLElement;
      card.style.minHeight = '112px'; card.style.height = '112px'; card.style.width = '220px';
      card.style.left = `${950 + ((Number.parseFloat(card.style.left) || 0) - 950) * (220 / cardWidth)}px`;
      card.style.transform = 'none'; card.style.boxShadow = 'none'; card.style.backgroundColor = '#fff';
      card.style.color = '#111'; card.style.borderColor = '#64748b';
      card.querySelectorAll('img').forEach((img) => { (img as HTMLImageElement).style.objectFit = 'cover'; });
    });
    clone.style.cssText = `position:relative;width:1900px;height:${canvasHeight}px;transform:none;overflow:visible;`;
    const inner = clone.firstElementChild as HTMLElement | null;
    if (inner) inner.style.cssText = `position:relative;width:1900px;height:${canvasHeight}px;transform:none;inset:auto;overflow:visible;`;
    const transformLayer = clone.firstElementChild as HTMLElement | null;
    if (transformLayer) { transformLayer.style.transform = 'none'; transformLayer.style.position = 'relative'; transformLayer.style.left = '0'; transformLayer.style.top = '0'; }
    const grid = clone.querySelector('[style*="radial-gradient"]') as HTMLElement | null;
    if (grid) grid.style.display = 'none';
    setPrintMarkup(clone.innerHTML);
  };

  const printOrganization = () => openPrintView();
  const downloadOrganizationPdf = () => openPrintView();


  if (loading) return <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Memuat bagan organisasi...</div>;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Users size={22}/></div><div><h2 className="font-bold">Bagan Struktur Organisasi Sekolah</h2><p className="mt-0.5 text-xs text-muted-foreground">Tata letak organisasi sekolah · visualisasi hierarki dan garis koordinasi{schoolYearName ? ` · Tahun ajaran ${schoolYearName}` : ''}</p></div></div>
        {!editing && <div className="flex flex-wrap gap-2"><button type="button" onClick={printOrganization} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted"><Printer size={16}/> Preview Cetak</button><button type="button" onClick={downloadOrganizationPdf} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted"><FileDown size={16}/> Unduh PDF</button></div>}
        {canManage && !editing && canEditViewport && <button type="button" onClick={() => { previousRowGapRef.current = -1; setEditing(true); setSelectedCardId(null); setSelectedShapeId(null); setHistory([]); setFuture([]); lineStartRef.current = null; linePointsRef.current = []; setLinePreview(null); setDrawTool('pan'); setNotice(''); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"><Users size={17}/> Kelola Struktur <ChevronDown size={16}/></button>}
        {canManage && editing && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditing(false); void load(); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted"><X size={16}/> Batal</button><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"><Save size={17}/>{saving ? 'Menyimpan...' : 'Simpan Perubahan'} <Check size={16}/></button></div>}
      </header>
      {canManage && !canEditViewport && !editing && <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Pengelolaan bagan tersedia melalui desktop atau tablet. Pada perangkat mobile, bagan dapat dilihat dengan zoom dan geser.</div>}
      {editing && <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><ImagePlus size={18} className="mt-0.5 shrink-0"/><p><b>Mode pengelolaan aktif.</b> Klik kartu untuk membuka isian jabatan tersebut. Klik dan geser kartu untuk memindahkannya. Pilih kartu untuk mengubah jabatan, guru/pegawai, identitas, atau foto melalui modal. Foto yang diunggah juga memperbarui foto profil akun guru terkait.</p></div>}
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}
      <div className="overflow-hidden rounded-2xl border bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Hand size={14}/>{editing ? 'Mode tangan: geser kanvas · scroll untuk pan, Ctrl/⌘ + scroll untuk zoom · pilih kartu untuk mengedit · alat kotak untuk menambah jabatan · alat garis: klik kartu asal, klik titik sudut bila perlu, lalu klik kartu tujuan.' : 'Geser kanvas dan gunakan zoom untuk melihat bagan. Garis wali kelas menampilkan seluruh rombel tahun ajaran aktif.'}</p>
          <div className="flex flex-wrap items-center gap-2">{editing && <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground"><label className="flex items-center gap-2">Lebar <input aria-label="Lebar kartu" type="range" min="160" max="280" step="10" value={cardWidth} onChange={(event) => setCardWidth(Number(event.target.value))} className="w-20"/><span className="w-7 tabular-nums">{cardWidth}</span></label><label className="flex items-center gap-2">Tinggi <input aria-label="Tinggi kartu" type="range" min="90" max="180" step="5" value={cardHeight} onChange={(event) => setCardHeight(Number(event.target.value))} className="w-20"/><span className="w-7 tabular-nums">{cardHeight}</span></label><label className="flex items-center gap-2">Jarak baris <input aria-label="Jarak vertikal antarbaris" type="range" min="140" max="500" step="10" value={rowGap} onChange={(event) => setRowGap(Number(event.target.value))} className="w-20"/><span className="w-7 tabular-nums">{rowGap}</span></label></div>}<div className="flex items-center gap-1"><button type="button" onClick={() => setZoom((v) => Math.min(1.5, v + 0.1))} className="rounded-lg border p-2 hover:bg-muted" title="Perbesar"><ZoomIn size={16}/></button><span className="min-w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((v) => Math.max(0.35, v - 0.1))} className="rounded-lg border p-2 hover:bg-muted" title="Perkecil"><ZoomOut size={16}/></button><button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 24 }); }} className="rounded-lg border p-2 hover:bg-muted" title="Atur ulang tampilan"><Maximize2 size={16}/></button></div></div>
        </div>
        <div ref={canvasRef} className="org-print-canvas relative min-h-[680px] w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/70 via-background to-slate-100/70 dark:from-blue-950/20 dark:via-background dark:to-slate-950/30" onPointerDown={onCanvasPointerDown} onPointerMove={(event) => { moveCardPress(event); onCanvasPointerMove(event); if (editing && drawTool === 'line' && lineStartRef.current) { const bounds = canvasRef.current?.getBoundingClientRect(); if (bounds) setLinePreview({ x: Math.max(0, (event.clientX - bounds.left - pan.x) / effectiveScale), y: Math.max(0, (event.clientY - bounds.top - pan.y) / effectiveScale) }); } }} onPointerUp={(event) => { endCardPress(event); if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null; }} onPointerCancel={() => { pressRef.current = null; dragRef.current = null; }} onWheel={(event) => { event.preventDefault(); if (event.ctrlKey || event.metaKey) setZoom((v) => Math.max(0.35, Math.min(1.5, v + (event.deltaY < 0 ? 0.05 : -0.05)))); else setPan((v) => ({ x: v.x - event.deltaX, y: v.y - event.deltaY })); }} style={{ touchAction: 'none', height: Math.max(680, Math.ceil(canvasHeight * effectiveScale + 48)), cursor: editing ? (drawTool === 'pan' ? 'grab' : drawTool === 'line' ? 'crosshair' : 'copy') : undefined }}>
          {editing && <div className="absolute right-3 top-3 z-40 flex flex-col items-center gap-1 rounded-xl border bg-card/95 p-1.5 shadow-lg backdrop-blur" onPointerDown={(event) => event.stopPropagation()} aria-label="Alat bagan"><button type="button" onClick={() => { setDrawTool('pan'); lineStartRef.current = null; linePointsRef.current = []; setLinePreview(null); }} title="Geser bagan" aria-pressed={drawTool === 'pan'} className={`rounded-lg p-2 ${drawTool === 'pan' ? 'bg-blue-600 text-white' : 'hover:bg-muted'}`}><Hand size={18}/></button><button type="button" onClick={() => { setDrawTool('select'); lineStartRef.current = null; linePointsRef.current = []; setLinePreview(null); }} title="Pilih kartu" aria-pressed={drawTool === 'select'} className={`rounded-lg p-2 ${drawTool === 'select' ? 'bg-blue-600 text-white' : 'hover:bg-muted'}`}><MousePointer2 size={18}/></button><button type="button" onClick={() => { setDrawTool('line'); lineStartRef.current = null; linePointsRef.current = []; setLinePreview(null); setSelectedShapeId(null); setSelectedCardId(null); }} title="Gambar konektor" aria-pressed={drawTool === 'line'} className={`rounded-lg p-2 ${drawTool === 'line' ? 'bg-blue-600 text-white' : 'hover:bg-muted'}`}><Minus size={18}/></button><button type="button" onClick={() => { setDrawTool('rect'); lineStartRef.current = null; linePointsRef.current = []; setLinePreview(null); }} title="Tambah kartu jabatan" aria-pressed={drawTool === 'rect'} className={`rounded-lg p-2 ${drawTool === 'rect' ? 'bg-blue-600 text-white' : 'hover:bg-muted'}`}><Square size={18}/></button><span className="my-1 h-px w-7 bg-border"/><button type="button" disabled={!history.length} onClick={undoChange} title="Undo" className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"><Undo2 size={18}/></button><button type="button" disabled={!future.length} onClick={redoChange} title="Redo" className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"><Redo2 size={18}/></button><button type="button" disabled={!selectedShapeId && !selectedCardId} onClick={() => { if (selectedShapeId) { rememberChange(); setConnectorPositions((items) => { const next = {...items}; delete next[selectedShapeId]; return next; }); setSelectedShapeId(null); setNotice('Garis berhasil dihapus.'); } else if (selectedCardId?.startsWith('homeroom:')) { const id = selectedCardId.slice('homeroom:'.length); rememberChange(); setConnectorPositions((items) => ({ ...items, ['__homeroom_hidden__:' + id]: { ...items['__homeroom_hidden__:' + id], hidden: true } })); setSelectedCardId(null); } else if (selectedCardId) { const target = positions.find((item) => item.id === selectedCardId); if (target && !target.locked) { rememberChange(); setPositions((items) => items.filter((item) => item.id !== target.id)); setSelectedCardId(null); } } }} title="Hapus pilihan" className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 size={18}/></button></div>}
          <div ref={printSourceRef} className="org-print-source" style={{ position: 'relative', width: canvasWidth, height: canvasHeight, transform: 'none' }}><div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})`, width: canvasWidth, height: canvasHeight }}>
            <div className={`absolute inset-0 ${editing ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundImage: 'radial-gradient(#94a3b8 0.8px, transparent 0.8px)', backgroundSize: '20px 20px' }}/>
            <svg width={canvasWidth} height={canvasHeight} className="pointer-events-none absolute inset-0 z-30 overflow-visible" style={{ overflow: 'visible' }}>{Object.entries(connectorPositions).filter(([key, value]) => key.startsWith('shape:') && value.start && value.end).map(([key, value]) => { const start = value.start!; const end = value.end!; const points = value.points?.length ? value.points : [start, end]; const pathData = points.map((point, index) => (index ? 'L ' : 'M ') + point.x + ' ' + point.y).join(' '); const selected = selectedShapeId === key; return <g key={key} onPointerDown={(event) => { if (!editing || drawTool !== 'select') return; event.stopPropagation(); setSelectedShapeId(key); setSelectedCardId(null); }} style={{ pointerEvents: 'none', cursor: editing ? 'pointer' : 'default' }}>{value.type === 'rect' ? <><rect x={Math.min(start.x,end.x)} y={Math.min(start.y,end.y)} width={Math.max(1,Math.abs(end.x-start.x))} height={Math.max(1,Math.abs(end.y-start.y))} fill="none" stroke="transparent" strokeWidth="18" style={{ pointerEvents: editing && drawTool === 'select' ? 'stroke' : 'none' }} onPointerDown={(event) => { if (!editing || drawTool !== 'select') return; event.stopPropagation(); setSelectedShapeId(key); setSelectedCardId(null); }}/><rect x={Math.min(start.x,end.x)} y={Math.min(start.y,end.y)} width={Math.max(1,Math.abs(end.x-start.x))} height={Math.max(1,Math.abs(end.y-start.y))} fill="none" stroke="#000000" strokeWidth="1.7" strokeDasharray={editing ? '6 5' : undefined}/></> : <><path d={pathData} fill="none" stroke="transparent" strokeWidth="20" style={{ pointerEvents: editing && drawTool === 'select' ? 'stroke' : 'none' }} onPointerDown={(event) => { if (!editing || drawTool !== 'select') return; event.stopPropagation(); setSelectedShapeId(key); setSelectedCardId(null); }}/><path d={pathData} fill="none" stroke="#000000" strokeWidth="1.7" strokeDasharray={editing ? '6 5' : undefined}/></>}{editing && selected && <><circle cx={start.x} cy={start.y} r="4" fill="#000000" stroke="white" strokeWidth="1.4"/><circle cx={end.x} cy={end.y} r="4" fill="#000000" stroke="white" strokeWidth="1.4"/><circle cx={start.x} cy={start.y} r="14" fill="transparent" style={{ cursor:'grab', pointerEvents: 'all' }} onPointerDown={(event) => { event.stopPropagation(); rememberChange(); dragRef.current = { id:`connector:${key}:start`, pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, originX:0, originY:0, panX:pan.x, panY:pan.y }; canvasRef.current?.setPointerCapture(event.pointerId); }}/><circle cx={end.x} cy={end.y} r="14" fill="transparent" style={{ cursor:'grab', pointerEvents: 'all' }} onPointerDown={(event) => { event.stopPropagation(); rememberChange(); dragRef.current = { id:`connector:${key}:end`, pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, originX:0, originY:0, panX:pan.x, panY:pan.y }; canvasRef.current?.setPointerCapture(event.pointerId); }}/></>}</g>; })}{editing && drawTool === 'line' && linePointsRef.current.length > 0 && linePreview && <polyline points={[...linePointsRef.current, linePreview].map((point) => point.x + ',' + point.y).join(' ')} fill="none" stroke="#000000" strokeWidth="1.7" pointerEvents="none"/>}</svg>

            {positions.map(renderCanvasCard)}{(() => { const columns = Math.min(4, Math.max(1, classCards.length)); const classRows = Math.ceil(classCards.length / columns); const classCardWidth = 220; const classCardHeight = cardHeight; const classGap = 40; const classRowGap = rowGap; const lastOrgY = Math.max(...positions.map((item) => { const point = nodePositions.get(item.id); return point ? point.y + (editing && selectedCardId === item.id ? expandedCardHeight : cardHeight) : 0; }), 0); const classTop = lastOrgY + rowGap - classCardHeight; const classItems = classCards.filter((item) => !connectorPositions['__homeroom_hidden__:' + item.id]?.hidden).map((item, index) => { const row = Math.floor(index / columns); const col = index % columns; const countInRow = Math.min(columns, classCards.length - row * columns); const rowWidth = countInRow * classCardWidth + Math.max(0, countInRow - 1) * classGap; const saved = connectorPositions['__homeroom_position__:' + item.id]?.start; const baseX = saved?.x ?? (canvasWidth - rowWidth) / 2 + col * (classCardWidth + classGap); return { item, x: 950 + (baseX - 950) * (cardWidth / 220), y: saved?.y ?? classTop + row * classRowGap }; }); const classBottom = classCards.length ? classTop + (classRows - 1) * classRowGap + classCardHeight : lastOrgY; const defaultY = Math.max(900, classBottom + (classCards.length ? 100 : 150)); const studentX = Number.isFinite(studentPosition.x) ? Number(studentPosition.x) : 840; const studentY = Math.max(Number.isFinite(studentPosition.y) ? Number(studentPosition.y) : defaultY, classBottom + (classCards.length ? 100 : 0)); const sx = 950 + (studentX - 950) * (cardWidth / 220); return <>{classCards.length > 0 && <>{classItems.map(({ item, x, y }) => <div key={'homeroom-' + item.id} data-homeroom-card="true" onPointerDown={(event) => beginCardPress(event, { id: 'homeroom:' + item.id, title: 'Wali Kelas', category: 'Wali Kelas', sortOrder: 9998 })} className="absolute z-10 overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 text-center shadow-[0_8px_24px_-12px_rgba(180,83,9,0.45)] dark:from-amber-950 dark:via-yellow-950/70 dark:to-orange-950" style={{ left: x, top: y, width: cardWidth, height: cardHeight, boxSizing: 'border-box', touchAction: 'none', cursor: editing ? 'grab' : 'default' }}><div className="h-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-500"/><div className="flex h-[calc(100%-8px)] min-h-0 min-w-0 items-center justify-center" style={{ gap: contentGap, padding: contentPadding }}><div className="relative shrink-0 overflow-hidden rounded-lg border-2 border-white bg-amber-200 shadow" style={{ width: photoWidth, height: photoHeight, aspectRatio: "4 / 6" }}>{item.photoUrl ? <img src={item.photoUrl} alt={`Foto ${item.teacherName ?? "wali kelas"}`} className="h-full w-full object-cover"/> : <div className="grid h-full w-full place-items-center font-black text-amber-800 dark:bg-amber-900 dark:text-amber-100" style={{ fontSize: 13 * contentScale }}>WK</div>}</div><div className="w-full min-w-0 text-center" style={{ fontSize: 9 * contentScale }}><p className="font-black uppercase tracking-wider text-amber-800 dark:text-amber-200" style={{ fontSize: 9 * contentScale }}>Wali Kelas</p><p className="font-extrabold text-slate-900 dark:text-slate-100" style={{ fontSize: 12 * contentScale }}>{item.teacherName ?? "Belum ditentukan"}</p><p className="font-bold text-amber-800 dark:text-amber-200" style={{ fontSize: 10 * contentScale }}>{item.name}</p>{item.nip && <p className="text-muted-foreground" style={{ fontSize: 9 * contentScale }}>NIP: {item.nip}</p>}</div></div></div>)}</>}<div data-org-card="true" onPointerDown={(event) => beginCardPress(event, { id: '__students__', title: 'Peserta Didik', category: 'Peserta Didik', sortOrder: 9999, locked: true })} style={{ position: 'absolute', left: sx, top: studentY, width: cardWidth, height: cardHeight, touchAction: 'none', cursor: editing ? 'grab' : 'default' }} className={`z-10 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-card to-orange-50 px-3 text-center shadow-[0_8px_24px_-12px_rgba(180,83,9,0.45)] dark:from-amber-950/40 dark:to-orange-950/30 ${cardHeight <= 70 ? 'py-1' : 'py-3'} ${editing && selectedCardId === '__students__' ? 'ring-2 ring-blue-500' : ''}`}><Users size={cardHeight <= 70 ? 14 : 22} className="mx-auto mb-1 text-amber-600"/><p className="text-xs font-bold">PESERTA DIDIK</p><p className="mt-0.5 text-[10px] text-muted-foreground">Seluruh peserta didik</p>{editing && selectedCardId === '__students__' && <p className="mt-1 text-[9px] font-bold text-blue-700 dark:text-blue-300">Hubungkan dengan garis manual</p>}</div></>; })()}
          </div></div>
        </div>
      </div>
      {editing && canManage && cardEditorId && (() => {
        const item = positions.find((candidate) => candidate.id === cardEditorId);
        if (!item) return null;
        const teacher = teachers.find((person) => person.id === item.teacherId);
        return <OrganizationCardEditor item={item} teacher={teacher} teachers={teachers} positions={positions} uploading={uploadingId === item.id}
          onChange={(patch) => update(item.id, patch)} onPhoto={(file) => void changePhoto(item, file)}
          onDelete={() => { if (!window.confirm('Hapus kartu jabatan ini?')) return; rememberChange(); setPositions((items) => items.filter((candidate) => candidate.id !== item.id)); setCardEditorId(null); setSelectedCardId(null); }}
          onClose={() => setCardEditorId(null)} />;
      })()}
      {editing && selectedCardId?.startsWith('homeroom:') && (() => {
        const selectedClass = classCards.find((item) => item.id === selectedCardId.slice('homeroom:'.length));
        return selectedClass ? <HomeroomCardEditor selectedClass={selectedClass} classes={classCards.filter((item) => !connectorPositions['__homeroom_hidden__:' + item.id]?.hidden)} teachers={teachers} onChange={(classId, teacherId) => void updateHomeroomTeacher(classId, teacherId)} onClose={() => setSelectedCardId(null)} /> : null;
      })()}
      <style>{`.org-print-source svg[style*="display: none"] { display: none !important; } .org-print-source svg.z-20 { display: none !important; } .org-print-source svg.z-30 circle[r="4"] { fill: #2563eb !important; }`}</style>
      <p className="text-center text-xs text-muted-foreground">Foto dan identitas mengikuti data profil guru/pegawai. NIP ditampilkan jika tersedia. Penetapan jabatan tidak mengubah role akun EduFlow.</p>
      {printMarkup !== null && <PrintPreview title="Bagan Struktur Organisasi Sekolah" paperSize="A4" paperId="school-organization-print" footerText="Bagan Struktur Organisasi Sekolah" onClose={() => setPrintMarkup(null)} pages={[<div key="organization-chart" className="relative mx-auto" style={{ width: `${1900 * Math.min(696 / 1900, 1024 / canvasHeight)}px`, height: `${canvasHeight * Math.min(696 / 1900, 1024 / canvasHeight)}px` }}><div style={{ width: 1900, height: canvasHeight, transform: `scale(${Math.min(696 / 1900, 1024 / canvasHeight)})`, transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: printMarkup }} /></div>]}/>}
    </section>
  );
}
