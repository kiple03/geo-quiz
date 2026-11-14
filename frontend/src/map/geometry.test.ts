import worldRaw from '../../public/data/world.topo.json?raw';
import { parseWorld } from '../data/validate';
import { fixtureGameData } from '../test/fixtures';
import { getMapGeometry, MAP_WIDTH, projectBox } from './geometry';

describe('getMapGeometry', () => {
  it('projects one shape per geometry, in a viewBox about twice as wide as high', () => {
    const geometry = getMapGeometry(fixtureGameData.world);
    expect(geometry.shapes.map((s) => s.id)).toEqual(['AAA', 'BBB', 'NEU']);
    expect(geometry.width).toBe(MAP_WIDTH);
    expect(geometry.height).toBeGreaterThan(450);
    expect(geometry.height).toBeLessThan(500);
    expect(geometry.sphere).toMatch(/^M/);
  });

  it('is cached per topology', () => {
    expect(getMapGeometry(fixtureGameData.world)).toBe(getMapGeometry(fixtureGameData.world));
  });

  // A shape with the wrong winding order is drawn as "the whole globe except the shape".
  it('gives the fixture squares small, equal areas (correct winding)', () => {
    const { shapes, width, height } = getMapGeometry(fixtureGameData.world);
    for (const shape of shapes) {
      expect(shape.area).toBeGreaterThan(0);
      expect(shape.area).toBeLessThan((width * height) / 100);
    }
    expect(shapes[0].area).toBeCloseTo(shapes[1].area, 6);
  });

  it('gives each shape its bounds and a centroid inside them', () => {
    const [a] = getMapGeometry(fixtureGameData.world).shapes;
    const [[x0, y0], [x1, y1]] = a.bounds;
    expect(x1).toBeGreaterThan(x0);
    expect(y1).toBeGreaterThan(y0);
    const [cx, cy] = a.centroid;
    expect(cx).toBeGreaterThan(x0);
    expect(cx).toBeLessThan(x1);
    expect(cy).toBeGreaterThan(y0);
    expect(cy).toBeLessThan(y1);
  });

  describe('projectBox', () => {
    it('gives the bounds of a lon/lat box, the same as a shape that fills it', () => {
      // AAA is the square 0–10°E, 0–10°N.
      const [aaa] = getMapGeometry(fixtureGameData.world).shapes;
      const [[x0, y0], [x1, y1]] = projectBox(fixtureGameData.world, [
        [0, 0],
        [10, 10],
      ]);
      expect(x0).toBeCloseTo(aaa.bounds[0][0], 6);
      expect(y0).toBeCloseTo(aaa.bounds[0][1], 6);
      expect(x1).toBeCloseTo(aaa.bounds[1][0], 6);
      expect(y1).toBeCloseTo(aaa.bounds[1][1], 6);
    });

    it('includes the bulge of curved meridians, not just the corners', () => {
      // At 60°N the west edge of a box from 60°S is further in than at the equator.
      const box = projectBox(fixtureGameData.world, [
        [-90, -60],
        [-60, 60],
      ]);
      const corners = projectBox(fixtureGameData.world, [
        [-90, 60],
        [-60, 60],
      ]);
      expect(box[0][0]).toBeLessThan(corners[0][0] - 10);
    });
  });

  describe('with the real world map', () => {
    const geometry = getMapGeometry(parseWorld(JSON.parse(worldRaw)));
    const byId = new Map(geometry.shapes.map((s) => [s.id, s]));

    it('draws every shape inside the map with a plausible size', () => {
      const mapArea = geometry.width * geometry.height;
      for (const shape of geometry.shapes) {
        expect(shape.d, shape.id).not.toBe('');
        expect(shape.area, shape.id).toBeGreaterThan(0);
        expect(shape.area, shape.id).toBeLessThan(mapArea / 4);
      }
    });

    it('puts the label point on the main part of a country with far-off parts', () => {
      // SVG y grows downwards, so "north of" means a smaller y.
      // Alaska pulls the US centroid north; the label point is in the contiguous states.
      const usa = byId.get('USA')!;
      expect(usa.labelPoint[1]).toBeGreaterThan(usa.centroid[1]);

      // French Guiana pulls France's centroid south-west, onto Spain. The label point is
      // where France is: north-east of Spain.
      const fra = byId.get('FRA')!;
      const esp = byId.get('ESP')!;
      expect(fra.centroid[1]).toBeGreaterThan(esp.labelPoint[1]);
      expect(fra.labelPoint[0]).toBeGreaterThan(esp.labelPoint[0]);
      expect(fra.labelPoint[1]).toBeLessThan(esp.labelPoint[1]);
      // Its label bounds are those of metropolitan France, not France with Guiana.
      const width = ([[x0], [x1]]: [[number, number], [number, number]]) => x1 - x0;
      expect(width(fra.labelBounds)).toBeLessThan(width(fra.bounds) / 5);
    });

    it('keeps relative sizes (equal-area projection)', () => {
      expect(byId.get('RUS')!.area).toBeGreaterThan(byId.get('NOR')!.area * 30);
      expect(byId.get('NOR')!.area).toBeGreaterThan(byId.get('VAT')?.area ?? 0);
    });
  });
});
