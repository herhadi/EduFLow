export type CardPoint = { x: number; y: number };

export function getOrganizationCardLayout<T extends { id: string; sortOrder: number; x?: number; y?: number }>(
  positions: T[], options: { canvasWidth: number; cardWidth: number; cardHeight: number; rowGap: number; editing: boolean },
) {
  const { canvasWidth, cardWidth, cardHeight } = options;
  const ordered = [...positions].sort((a, b) => a.sortOrder - b.sortOrder);
  const baseCardWidth = cardWidth;
  const gapX = 40;
  const stepX = baseCardWidth + gapX;
  const safeRowGap = Math.max(options.editing ? options.rowGap : cardHeight + 40, cardHeight + 40);
  const rows = ordered.length ? 1 + Math.ceil(Math.max(0, ordered.length - 1) / 4) : 0;
  const result = new Map<string, CardPoint>();

  ordered.forEach((item, index) => {
    // The first card occupies its own visual row. Remaining cards flow in
    // independent rows of up to four; this is a layout convention only,
    // not a parent/child or reporting hierarchy.
    const row = index === 0 ? 0 : 1 + Math.floor((index - 1) / 4);
    const col = index === 0 ? 0 : (index - 1) % 4;
    const countInRow = index === 0 ? 1 : Math.min(4, ordered.length - 1 - Math.floor((index - 1) / 4) * 4);
    const rowWidth = countInRow * baseCardWidth + Math.max(0, countInRow - 1) * gapX;
    const defaultX = (canvasWidth - rowWidth) / 2 + col * stepX;
    result.set(item.id, {
      x: Number.isFinite(item.x) ? Number(item.x) : defaultX,
      y: Number.isFinite(item.y) ? Number(item.y) : 70 + row * safeRowGap,
    });
  });

  return { positions: result, columns: Math.min(4, Math.max(1, ordered.length - 1)), rows, rowGap: safeRowGap };
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
