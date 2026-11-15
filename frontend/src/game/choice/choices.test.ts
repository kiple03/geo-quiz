import type { Country } from '../../data/types';
import { seededRng } from '../engine/random';
import { defaultRoundConfig } from '../engine/types';
import { buildChoiceQuestions, pickOptions } from './choices';

function country(id: string, region: string, capital: string): Country {
  return {
    id,
    iso2: id.slice(0, 2),
    name: id,
    officialName: id,
    capitals: [capital],
    region,
    subregion: '',
    unMember: true,
    independent: true,
    area: 1,
    latlng: [0, 0],
  };
}

const europe = [
  country('NOR', 'Europe', 'Oslo'),
  country('SWE', 'Europe', 'Stockholm'),
  country('DNK', 'Europe', 'Copenhagen'),
  country('FIN', 'Europe', 'Helsinki'),
  country('ISL', 'Europe', 'Reykjavik'),
];
const americas = [
  country('JAM', 'Americas', 'Kingston'),
  country('CAN', 'Americas', 'Ottawa'),
  country('VCT', 'Americas', 'Kingstown'),
];
const oceania = [country('NFK', 'Oceania', 'Kingston'), country('FJI', 'Oceania', 'Suva')];
const all = [...europe, ...americas, ...oceania];
const byId = new Map(all.map((c) => [c.id, c]));
const settings = { candidates: all, labelOf: (c: Country) => c.capitals[0] };
const labelsOf = (ids: readonly string[]) => ids.map((id) => byId.get(id)!.capitals[0]);

describe('pickOptions', () => {
  it('gives the target and three others from its region, all different', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = pickOptions(byId.get('NOR')!, settings, seededRng(seed));
      expect(options).toHaveLength(4);
      expect(options).toContain('NOR');
      expect(new Set(options).size).toBe(4);
      for (const id of options) expect(byId.get(id)!.region).toBe('Europe');
    }
  });

  it('puts the right answer in different places', () => {
    const positions = new Set(
      Array.from({ length: 50 }, (_, seed) =>
        pickOptions(byId.get('NOR')!, settings, seededRng(seed)).indexOf('NOR'),
      ),
    );
    expect(positions).toEqual(new Set([0, 1, 2, 3]));
  });

  it('fills up from other regions when the region is too small', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = pickOptions(byId.get('CAN')!, settings, seededRng(seed));
      expect(options).toHaveLength(4);
      // Both other Americas countries come first, then one from elsewhere.
      expect(options).toEqual(expect.arrayContaining(['CAN', 'JAM', 'VCT']));
    }
  });

  it('never shows the same label twice (Kingston is Jamaica and Norfolk Island)', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const target of ['JAM', 'NFK', 'FJI']) {
        const labels = labelsOf(pickOptions(byId.get(target)!, settings, seededRng(seed)));
        expect(new Set(labels).size, `${target} seed ${seed}: ${labels.join()}`).toBe(
          labels.length,
        );
      }
    }
  });

  it('compares labels ignoring case and spaces', () => {
    const candidates = [country('AAA', 'X', 'Alpha'), country('BBB', 'X', ' alpha ')];
    const options = pickOptions(candidates[0], { ...settings, candidates }, seededRng(1));
    expect(options).toEqual(['AAA']);
  });

  it('never puts two conflicting countries in the same question', () => {
    // Sweden conflicts with Denmark, e.g. two flags that look the same.
    const conflicts = (a: Country, b: Country) => [a.id, b.id].sort().join() === 'DNK,SWE';
    for (let seed = 0; seed < 100; seed++) {
      for (const target of ['NOR', 'SWE', 'DNK']) {
        const options = pickOptions(byId.get(target)!, { ...settings, conflicts }, seededRng(seed));
        expect(options).toHaveLength(4);
        expect(options.includes('SWE') && options.includes('DNK'), options.join()).toBe(false);
      }
    }
  });

  it('gives fewer options when there are not enough candidates', () => {
    const candidates = europe.slice(0, 2);
    const options = pickOptions(candidates[0], { ...settings, candidates }, seededRng(1));
    expect(options.sort()).toEqual(['NOR', 'SWE']);
  });

  it('can be asked for another number of options', () => {
    const options = pickOptions(byId.get('NOR')!, { ...settings, optionCount: 3 }, seededRng(1));
    expect(options).toHaveLength(3);
  });
});

describe('buildChoiceQuestions', () => {
  const config = { ...defaultRoundConfig('test'), questionCount: 3 };

  it('asks about distinct countries from the pool, each with its own options', () => {
    const questions = buildChoiceQuestions(europe, config, seededRng(7), settings);
    expect(questions).toHaveLength(3);
    expect(new Set(questions.map((q) => q.targetId)).size).toBe(3);
    for (const q of questions) {
      expect(europe.map((c) => c.id)).toContain(q.targetId);
      expect(q.options).toContain(q.targetId);
      expect(q.options).toHaveLength(4);
    }
  });

  it('asks fewer questions when the pool is small', () => {
    expect(buildChoiceQuestions(oceania, config, seededRng(7), settings)).toHaveLength(2);
  });

  it('is repeatable with a seeded RNG', () => {
    expect(buildChoiceQuestions(all, config, seededRng(3), settings)).toEqual(
      buildChoiceQuestions(all, config, seededRng(3), settings),
    );
  });
});
