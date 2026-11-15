import countriesRaw from '../../public/data/countries.json?raw';
import { gameModes } from '../game/modes/registry';
import {
  flagsLookAlike,
  hasFlagImage,
  hasOwnFlag,
  LOOK_ALIKE_FLAGS,
  NO_FLAG,
  SHARED_FLAGS,
} from './flags';
import { flagUrl } from './load';
import { parseCountries } from './validate';

const countries = parseCountries(JSON.parse(countriesRaw));
const ids = new Set(countries.map((c) => c.id));
// Only lists the generated files; none are loaded.
const flagFiles = new Set(
  Object.keys(import.meta.glob('../../public/data/flags/*.svg')).map((file) =>
    file.replace(/^.*\/(.+)\.svg$/, '$1'),
  ),
);

describe('flags', () => {
  it('has a generated flag for every country except those without one', () => {
    const expected = countries.map((c) => c.id).filter((id) => !NO_FLAG.has(id));
    expect([...flagFiles].sort()).toEqual(expected.sort());
  });

  it('names only real countries in its rules', () => {
    const named = [
      ...NO_FLAG,
      ...Object.keys(SHARED_FLAGS),
      ...Object.values(SHARED_FLAGS),
      ...LOOK_ALIKE_FLAGS.flat(),
    ];
    for (const id of named) expect(ids, id).toContain(id);
  });

  it('shows shared flags but does not ask about them', () => {
    expect(hasFlagImage('HMD')).toBe(true);
    expect(hasOwnFlag('HMD')).toBe(false);
    expect(hasOwnFlag('AUS')).toBe(true);
    expect(hasFlagImage('ATA')).toBe(false);
    expect(hasOwnFlag('ATA')).toBe(false);
    expect(hasOwnFlag('UNK')).toBe(true); // Kosovo has its own
  });

  it('treats look-alike pairs both ways', () => {
    expect(flagsLookAlike('TCD', 'ROU')).toBe(true);
    expect(flagsLookAlike('ROU', 'TCD')).toBe(true);
    expect(flagsLookAlike('AUS', 'NZL')).toBe(false);
  });

  it('builds the URL from the country id', () => {
    expect(flagUrl('NOR')).toMatch(/\/data\/flags\/NOR\.svg$/);
  });

  it('decorates menu cards with flags that exist', () => {
    for (const mode of gameModes) {
      for (const id of mode.previewFlags ?? []) expect(flagFiles, id).toContain(id);
    }
  });
});
