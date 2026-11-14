import countriesRaw from '../../public/data/countries.json?raw';
import worldRaw from '../../public/data/world.topo.json?raw';
import { parseCountries, parseWorld } from './validate';

// Tests the generated files in public/data/ (see data/README.md).
const countries = parseCountries(JSON.parse(countriesRaw));
const world = parseWorld(JSON.parse(worldRaw));
const shapeIds = world.objects.world.geometries.map((g) => g.id);
const shapeIdSet = new Set(shapeIds);

describe('countries.json', () => {
  it('contains all UN members', () => {
    expect(countries.filter((c) => c.unMember).length).toBeGreaterThanOrEqual(193);
  });

  it('has unique ids', () => {
    expect(new Set(countries.map((c) => c.id)).size).toBe(countries.length);
  });

  it('has the expected data for a known country', () => {
    expect(countries.find((c) => c.id === 'NOR')).toMatchObject({
      iso2: 'NO',
      name: 'Norway',
      capitals: ['Oslo'],
      region: 'Europe',
      unMember: true,
    });
  });
});

describe('world.topo.json', () => {
  it('is a TopoJSON topology with a "world" object', () => {
    expect(world.type).toBe('Topology');
    expect(world.objects.world.type).toBe('GeometryCollection');
  });

  it('has exactly one shape per country', () => {
    const missing = countries.filter((c) => !shapeIdSet.has(c.id)).map((c) => c.id);
    expect(missing).toEqual([]);
    expect(shapeIdSet.size).toBe(shapeIds.length);
  });

  it('has only a few neutral-land shapes without a country', () => {
    const countryIds = new Set(countries.map((c) => c.id));
    const neutral = shapeIds.filter((id) => !countryIds.has(id));
    expect(neutral.sort()).toEqual(['ATC', 'CYN', 'IOA', 'KAS', 'SOL']);
  });
});

describe('parseCountries', () => {
  it('rejects malformed entries with a useful message', () => {
    expect(() => parseCountries([{ id: 'NOR', name: 'Norway' }])).toThrow(/NOR: invalid iso2/);
    expect(() => parseCountries({})).toThrow(/expected an array/);
  });

  it('rejects coordinates that are not finite or out of range', () => {
    const norway = countries.find((c) => c.id === 'NOR');
    expect(() => parseCountries([{ ...norway, latlng: [Number.NaN, 10] }])).toThrow(
      /NOR: invalid latlng/,
    );
    expect(() => parseCountries([{ ...norway, latlng: [62, 200] }])).toThrow(/NOR: invalid latlng/);
  });
});

describe('parseWorld', () => {
  it('rejects data that is not a topology with a world collection', () => {
    expect(() => parseWorld([])).toThrow(/expected a TopoJSON Topology/);
    expect(() => parseWorld({ type: 'Topology', objects: {} })).toThrow(/missing arcs/);
    expect(() => parseWorld({ type: 'Topology', arcs: [], objects: {} })).toThrow(
      /objects.world to be a GeometryCollection/,
    );
  });

  it('lists geometries without a valid id', () => {
    const topology = {
      type: 'Topology',
      arcs: [],
      objects: {
        world: {
          type: 'GeometryCollection',
          geometries: [{ type: 'Polygon', id: 'NOR' }, { type: 'Polygon' }, { id: '' }],
        },
      },
    };
    expect(() => parseWorld(topology)).toThrow(/without a valid id or type: #1, #2/);
  });
});
