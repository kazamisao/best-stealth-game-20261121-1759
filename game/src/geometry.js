// Pure geometry for the stealth rules: vision cones and line-of-sight.
// Nothing here touches the browser, so the tests import it directly.

/** True when the point (px, py) lies inside the cone from (gx, gy). */
export function pointInCone(px, py, gx, gy, dir, range, halfAngle) {
  const dx = px - gx;
  const dy = py - gy;
  const distSq = dx * dx + dy * dy;
  if (distSq > range * range) return false;
  if (distSq < 1) return true;
  const angle = Math.atan2(dy, dx);
  let diff = angle - dir;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfAngle;
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  // Non-strict: a sight line that exactly grazes a crate's edge or corner is
  // blocked too — a guard must not spot the player through a crate's edge.
  return ((d1 >= 0 && d2 <= 0) || (d1 <= 0 && d2 >= 0)) && ((d3 >= 0 && d4 <= 0) || (d3 <= 0 && d4 >= 0));
}

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

/** True when the segment from (x1, y1) to (x2, y2) touches the rectangle. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  const { x, y, w, h } = rect;
  return (
    segmentsCross(x1, y1, x2, y2, x, y, x + w, y) ||
    segmentsCross(x1, y1, x2, y2, x + w, y, x + w, y + h) ||
    segmentsCross(x1, y1, x2, y2, x + w, y + h, x, y + h) ||
    segmentsCross(x1, y1, x2, y2, x, y + h, x, y)
  );
}

/**
 * True when nothing in `blockers` (rects) stands between (x1, y1) and (x2, y2).
 * A closed curtain blocks sight; an open one does not.
 */
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (const blocker of blockers) {
    if (blocker.open) continue;
    if (segmentHitsRect(x1, y1, x2, y2, blocker)) return false;
  }
  return true;
}

/** Distance from (px, py) to the closest point of the rectangle. */
export function distanceToRect(px, py, rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(py, rect.y + rect.h));
  return Math.hypot(px - cx, py - cy);
}
