import countriesRaw from '../../public/data/countries.json?raw';
import worldRaw from '../../public/data/world.topo.json?raw';
import { parseCountries, parseWorld } from '../data/validate';
import { getMapGeometry } from './geometry';
import { nearestTo, nextInDirection, type Direction, type NavPoint } from './keyboardNav';

//      N
//   W  C  E      far-east (FE) is further right than E;
//      S         NE sits up and to the right of C.
const C = { id: 'C', x: 0, y: 0 };
const points: NavPoint[] = [
  C,
  { id: 'N', x: 0, y: -10 },
  { id: 'S', x: 0, y: 10 },
  { id: 'W', x: -10, y: 0 },
  { id: 'E', x: 10, y: 0 },
  { id: 'FE', x: 30, y: 0 },
  { id: 'NE', x: 8, y: -8 },
];

describe('nextInDirection', () => {
  it('moves to the closest point in each direction (SVG y grows downwards)', () => {
    expect(nextInDirection(points, C, 'up')?.id).toBe('N');
    expect(nextInDirection(points, C, 'down')?.id).toBe('S');
    expect(nextInDirection(points, C, 'left')?.id).toBe('W');
    expect(nextInDirection(points, C, 'right')?.id).toBe('E');
  });

  it('prefers a point straight ahead over a closer one off to the side', () => {
    // NE (distance 11.3) is closer than FE would be, but E is straight ahead.
    const withoutE = points.filter((p) => p.id !== 'E');
    expect(nextInDirection(withoutE, C, 'right')?.id).toBe('NE');
    const onlyFarAndDiagonal = [C, { id: 'FE', x: 30, y: 0 }, { id: 'D', x: 6, y: -11 }];
    expect(nextInDirection(onlyFarAndDiagonal, C, 'right')?.id).toBe('FE');
  });

  it('ignores points that lie mostly sideways or behind', () => {
    const sideways = [C, { id: 'A', x: 1, y: -10 }, { id: 'B', x: -5, y: 0 }];
    expect(nextInDirection(sideways, C, 'right')).toBeNull();
  });

  it('returns null at the edge of the map', () => {
    expect(nextInDirection(points, { id: 'FE', x: 30, y: 0 }, 'right')).toBeNull();
  });
});

describe('nearestTo', () => {
  it('finds the point closest to a position', () => {
    expect(nearestTo(points, 26, 2)?.id).toBe('FE');
    expect(nearestTo([], 0, 0)).toBeNull();
  });
});

describe('with the real world map', () => {
  it('reaches every country with the arrow keys, starting from Norway', () => {
    const countryIds = new Set(parseCountries(JSON.parse(countriesRaw)).map((c) => c.id));
    const navPoints = getMapGeometry(parseWorld(JSON.parse(worldRaw)))
      .shapes.filter((s) => countryIds.has(s.id))
      .map(({ id, labelPoint: [x, y] }) => ({ id, x, y }));
    const directions: Direction[] = ['up', 'down', 'left', 'right'];

    const start = navPoints.find((p) => p.id === 'NOR')!;
    const reached = new Set([start.id]);
    const queue = [start];
    for (let point = queue.shift(); point; point = queue.shift()) {
      for (const direction of directions) {
        const next = nextInDirection(navPoints, point, direction);
        if (next && !reached.has(next.id)) {
          reached.add(next.id);
          queue.push(next);
        }
      }
    }
    expect(navPoints.filter((p) => !reached.has(p.id)).map((p) => p.id)).toEqual([]);
    expect(reached.size).toBe(countryIds.size);
  });
});
