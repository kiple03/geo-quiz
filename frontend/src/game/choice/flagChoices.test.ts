import countriesRaw from '../../../public/data/countries.json?raw';
import { flagsLookAlike } from '../../data/flags';
import { createGameData } from '../../data/load';
import { parseCountries } from '../../data/validate';
import { seededRng } from '../engine/random';
import { defaultRoundConfig } from '../engine/types';
import { flagNameMode } from '../modes/flag-name/mode';
import { flagPickMode } from '../modes/flag-pick/mode';
import { createRoundQuestions } from '../setup';
import { flagPool, preloadFlags } from './flagChoices';

// The real data, since its shared and look-alike flags are what these modes must handle.
const data = createGameData(parseCountries(JSON.parse(countriesRaw)));
const regionOf = (id: string) => data.countriesById.get(id)!.region;

describe('flag questions', () => {
  it('asks only about countries with a flag of their own', () => {
    const pool = new Set(flagPool(data).map((c) => c.id));
    for (const id of ['ATA', 'HMD', 'SHN', 'BLM', 'MAF', 'SPM', 'WLF']) {
      expect(pool, id).not.toContain(id);
    }
    for (const id of ['AUS', 'GBR', 'FRA', 'UNK', 'ATF', 'NCL']) expect(pool, id).toContain(id);
    expect(pool.size).toBe(data.countries.length - 7);
  });

  for (const mode of [flagNameMode, flagPickMode]) {
    describe(mode.id, () => {
      const config = defaultRoundConfig(mode.id);

      it('needs no dataset besides the countries, and checks answers by country', () => {
        expect(mode.datasets ?? []).toEqual([]);
        expect(mode.isCorrect({ targetId: 'TCD' }, 'TCD', data)).toBe(true);
        expect(mode.isCorrect({ targetId: 'TCD' }, 'ROU', data)).toBe(false);
        expect(mode.describeQuestion({ targetId: 'NOR' }, data)).toBe('Norway');
        expect(mode.describeAnswer('SWE', data)).toBe('Sweden');
      });

      it('has four options per question, never two look-alike flags', () => {
        for (let seed = 0; seed < 40; seed++) {
          for (const { targetId, options = [] } of createRoundQuestions(
            mode,
            data,
            config,
            seededRng(seed),
          )) {
            expect(options).toHaveLength(4);
            expect(options).toContain(targetId);
            for (const a of options) {
              for (const b of options) expect(flagsLookAlike(a, b), `${a}/${b}`).toBe(false);
            }
          }
        }
      });

      it('never offers Chad and Romania together', () => {
        // Five countries, so without the rule Romania would often be one of Chad's options.
        const few = createGameData(
          ['TCD', 'ROU', 'NOR', 'KEN', 'JPN'].map((id) => data.countriesById.get(id)!),
        );
        for (let seed = 0; seed < 50; seed++) {
          for (const q of mode.buildQuestions!(flagPool(few), config, few, seededRng(seed))) {
            expect(q.options).toHaveLength(4);
            expect(q.options).not.toEqual(expect.arrayContaining(['TCD', 'ROU']));
          }
        }
      });

      it('keeps a region round, and its options, in the region', () => {
        const europe = { ...config, regions: ['Europe'] };
        for (let seed = 0; seed < 10; seed++) {
          for (const q of createRoundQuestions(mode, data, europe, seededRng(seed))) {
            for (const id of q.options ?? []) expect(regionOf(id), id).toBe('Europe');
          }
        }
      });
    });
  }

  it('preloads every flag a round shows, once each', () => {
    const created: string[] = [];
    const RealImage = globalThis.Image;
    globalThis.Image = class {
      set src(url: string) {
        created.push(url);
      }
    } as unknown as typeof Image;
    try {
      preloadFlags([
        { targetId: 'NOR', options: ['NOR', 'SWE', 'ATA'] },
        { targetId: 'SWE', options: ['SWE', 'DNK'] },
      ]);
    } finally {
      globalThis.Image = RealImage;
    }
    // Antarctica has no flag image.
    expect(created.map((url) => url.replace(/^.*\//, ''))).toEqual([
      'NOR.svg',
      'SWE.svg',
      'DNK.svg',
    ]);
  });
});
