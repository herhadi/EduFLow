export type CardPoint = { x: number; y: number };

export function getOrganizationCardLayout<T extends { id: string; sortOrder: number; x?: number; y?: number }>(
  positions: T[], options: { canvasWidth: number; cardWidth: number; cardHeight: number; rowGap: number; editing: boolean },
) {
  const { canvasWidth, cardHeight } = options;
  const ordered = [...positions].sort((a, b) => a.sortOrder - b.sortOrder);
  const columns = Math.max(1, Math.min(4, ordered.length));
  const baseCardWidth = 220;
  const gapX = 40;
  const stepX = baseCardWidth + gapX;
  const safeRowGap = Math.max(options.editing ? options.rowGap : 190, cardHeight + 40);
  const rows = Math.ceil(ordered.length / columns);
  const result = new Map<string, CardPoint>();
  ordered.forEach((item, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const countInRow = Math.min(columns, ordered.length - row * columns);
    const rowWidth = countInRow * baseCardWidth + (countInRow - 1) * gapX;
    const defaultX = (canvasWidth - rowWidth) / 2 + col * stepX;
    result.set(item.id, {
      x: Number.isFinite(item.x) ? Number(item.x) : defaultX,
      y: Number.isFinite(item.y) ? Number(item.y) : 70 + row * safeRowGap,
    });
  });
  return { positions: result, columns, rows, rowGap: safeRowGap };
}

export function snapCardPosition(point: CardPoint, peers: CardPoint[], grid = 20, tolerance = 14): CardPoint {
  let x = Math.round(Math.max(0, point.x) / grid) * grid;
  let y = Math.round(Math.max(0, point.y) / grid) * grid;
  const alignX = peers.find((peer) => Math.abs(peer.x - point.x) <= tolerance);
  const alignY = peers.find((peer) => Math.abs(peer.y - point.y) <= tolerance);
  if (alignX) x = alignX.x;
  if (alignY) y = alignY.y;
  return { x, y };
}
