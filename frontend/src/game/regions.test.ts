import countriesRaw from '../../public/data/countries.json?raw';
import worldRaw from '../../public/data/world.topo.json?raw';
import { parseCountries, parseWorld } from '../data/validate';
import { getMapGeometry, projectBox } from '../map/geometry';
import { REGIONS, regionsFrame, regionsLabel } from './regions';

describe('regionsLabel', () => {
  it('names the chosen regions, or null for the whole world', () => {
    expect(regionsLabel([])).toBeNull();
    expect(regionsLabel(['Europe'])).toBe('Europe');
    expect(regionsLabel(['Africa', 'Asia'])).toBe('Africa, Asia');
  });
});

describe('regionsFrame', () => {
  it("is a region's own frame, or the box around several", () => {
    expect(regionsFrame([])).toBeUndefined();
    expect(regionsFrame(['Europe'])).toEqual([
      [-25, 34],
      [50, 72],
    ]);
    expect(regionsFrame(['Europe', 'Africa'])).toEqual([
      [-26, -36],
      [75, 72],
    ]);
  });

  it('has no frame for a region it does not know', () => {
    expect(regionsFrame(['Europe', 'Antarctic'])).toBeUndefined();
  });
});

describe('REGIONS with the real data', () => {
  const countries = parseCountries(JSON.parse(countriesRaw));
  const world = parseWorld(JSON.parse(worldRaw));
  const shapes = new Map(getMapGeometry(world).shapes.map((s) => [s.id, s]));

  it('covers every region in countries.json except Antarctic', () => {
    const inData = new Set(countries.map((c) => c.region));
    inData.delete('Antarctic');
    expect(REGIONS.map((r) => r.name).sort()).toEqual([...inData].sort());
  });

  // Guards the hand-picked frames (ADR 0006): each region's countries start in view,
  // apart from the known exceptions.
  it("frames each region's countries, apart from Russia and the far Pacific", () => {
    const outside = REGIONS.flatMap((region) => {
      const [[x0, y0], [x1, y1]] = projectBox(world, region.frame);
      return countries
        .filter((c) => c.region === region.name)
        .filter((c) => {
          const [x, y] = shapes.get(c.id)!.labelPoint;
          return x < x0 || x > x1 || y < y0 || y > y1;
        })
        .map((c) => c.id);
    });
    expect(outside.sort()).toEqual(
      // Russia (Europe); Oceania east of 180°: American Samoa, Cook Islands, French
      // Polynesia, Kiribati, Niue, Pitcairn, Samoa, Tonga, Wallis and Futuna.
      ['ASM', 'COK', 'KIR', 'NIU', 'PCN', 'PYF', 'RUS', 'TON', 'WLF', 'WSM'].sort(),
    );
  });
});
