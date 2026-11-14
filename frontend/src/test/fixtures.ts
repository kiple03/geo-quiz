import { createGameData } from '../data/load';
import type { Country } from '../data/types';
import { parseWorld } from '../data/validate';

/** Small, made-up test data: two countries and one neutral-land shape. */

const baseCountry = {
  officialName: '',
  capitals: [],
  region: 'Testregion',
  subregion: '',
  unMember: true,
  independent: true,
  area: 100_000,
} satisfies Partial<Country>;

export const fixtureCountries: Country[] = [
  {
    ...baseCountry,
    id: 'AAA',
    iso2: 'AA',
    name: 'Alphaland',
    capitals: ['Alpha City'],
    latlng: [5, 5],
  },
  { ...baseCountry, id: 'BBB', iso2: 'BB', name: 'Betaland', capitals: [], latlng: [5, 25] },
];

/** Three 10°×10° squares (clockwise, as d3-geo expects): AAA, BBB, and neutral NEU. */
const square = (lon: number): number[][] => [
  [lon, 0],
  [lon, 10],
  [lon + 10, 10],
  [lon + 10, 0],
  [lon, 0],
];

export const fixtureWorldJson = {
  type: 'Topology',
  arcs: [square(0), square(20), square(40)],
  objects: {
    world: {
      type: 'GeometryCollection',
      geometries: [
        { type: 'Polygon', id: 'AAA', arcs: [[0]] },
        { type: 'Polygon', id: 'BBB', arcs: [[1]] },
        { type: 'Polygon', id: 'NEU', arcs: [[2]] },
      ],
    },
  },
};

export const fixtureGameData = createGameData(fixtureCountries, parseWorld(fixtureWorldJson));
