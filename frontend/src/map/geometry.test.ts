import worldRaw from '../../public/data/world.topo.json?raw';
import { parseWorld } from '../data/validate';
import { fixtureGameData } from '../test/fixtures';
import { getMapGeometry, MAP_WIDTH } from './geometry';

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

    it('keeps relative sizes (equal-area projection)', () => {
      expect(byId.get('RUS')!.area).toBeGreaterThan(byId.get('NOR')!.area * 30);
      expect(byId.get('NOR')!.area).toBeGreaterThan(byId.get('VAT')?.area ?? 0);
    });
  });
});
