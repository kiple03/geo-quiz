/**
 * Keyboard navigation on a map (ADR 0005): arrow keys move a cursor from country to
 * country. Pure functions on points in map units, so they work for any map layer.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface NavPoint {
  id: string;
  x: number;
  y: number;
}

/** Arrow keys and the direction they move in; other keys are not navigation. */
export const ARROW_KEYS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * How far a point may lie off the arrow's direction: up to this many times as far
 * sideways as forwards (1.5 ≈ 56° to either side). The four directions together cover
 * every angle, so no country is out of reach, but "right" does not jump to something
 * that is mostly above or below.
 */
const MAX_SIDEWAYS = 1.5;

/** Sideways distance counts this much more than forward distance when choosing. */
const SIDEWAYS_COST = 2;

/** `(dx, dy)` split into the distance along the arrow and the distance across it. */
function alongAndAcross(dx: number, dy: number, direction: Direction): [number, number] {
  switch (direction) {
    case 'right':
      return [dx, dy];
    case 'left':
      return [-dx, dy];
    // SVG y grows downwards.
    case 'down':
      return [dy, dx];
    case 'up':
      return [-dy, dx];
  }
}

/**
 * The point an arrow key moves to from `from`: the closest one in that direction,
 * preferring points straight ahead over ones off to the side. Null if there is none.
 */
export function nextInDirection(
  points: readonly NavPoint[],
  from: NavPoint,
  direction: Direction,
): NavPoint | null {
  let best: NavPoint | null = null;
  let bestCost = Infinity;
  for (const point of points) {
    if (point.id === from.id) continue;
    const [along, across] = alongAndAcross(point.x - from.x, point.y - from.y, direction);
    if (along <= 0 || Math.abs(across) > along * MAX_SIDEWAYS) continue;
    const cost = along + SIDEWAYS_COST * Math.abs(across);
    if (cost < bestCost) {
      best = point;
      bestCost = cost;
    }
  }
  return best;
}

/** The point closest to `(x, y)`, e.g. to the middle of the view; null if there are none. */
export function nearestTo(points: readonly NavPoint[], x: number, y: number): NavPoint | null {
  let best: NavPoint | null = null;
  let bestDistance = Infinity;
  for (const point of points) {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}
