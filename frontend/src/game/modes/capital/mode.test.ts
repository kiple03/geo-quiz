import countriesRaw from '../../../../public/data/countries.json?raw';
import { createGameData } from '../../../data/load';
import { parseCountries } from '../../../data/validate';
import { labelKey } from '../../choice/choices';
import { seededRng } from '../../engine/random';
import { defaultRoundConfig } from '../../engine/types';
import { createRoundQuestions } from '../../setup';
import { capitalOf, capitalsText } from './capitals';
import { capitalMode } from './mode';

// The real data, since its edge cases are what this mode must handle.
const data = createGameData(parseCountries(JSON.parse(countriesRaw)));
const country = (id: string) => data.countriesById.get(id)!;

describe('capital mode', () => {
  it('needs no dataset besides the countries', () => {
    expect(capitalMode.datasets ?? []).toEqual([]);
  });

  it('asks about every country with a capital, and only those', () => {
    const pool = new Set(capitalMode.questionPool(data).map((c) => c.id));
    // Antarctica, Heard Island and McDonald Islands, Macau.
    for (const id of ['ATA', 'HMD', 'MAC']) expect(pool, id).not.toContain(id);
    for (const id of ['NOR', 'ZAF', 'JAM', 'NFK']) expect(pool, id).toContain(id);
    expect(pool.size).toBe(data.countries.filter((c) => c.capitals.length > 0).length);
  });

  it('checks the answer by country, not by capital name', () => {
    // Jamaica and Norfolk Island both have Kingston.
    expect(capitalOf(data, 'JAM')).toBe(capitalOf(data, 'NFK'));
    expect(capitalMode.isCorrect({ targetId: 'JAM' }, 'JAM', data)).toBe(true);
    expect(capitalMode.isCorrect({ targetId: 'JAM' }, 'NFK', data)).toBe(false);
  });

  it('shows South Africa as Pretoria, and names all three capitals in the results', () => {
    expect(capitalOf(data, 'ZAF')).toBe('Pretoria');
    expect(capitalsText(country('ZAF'))).toBe('Pretoria (also Bloemfontein and Cape Town)');
    expect(capitalMode.describeQuestion({ targetId: 'ZAF' }, data)).toBe(
      'South Africa: Pretoria (also Bloemfontein and Cape Town)',
    );
    expect(capitalMode.describeQuestion({ targetId: 'NOR' }, data)).toBe('Norway: Oslo');
  });

  it('describes an answer by the capital that was picked', () => {
    expect(capitalMode.describeAnswer('SWE', data)).toBe('Stockholm');
    expect(capitalMode.describeAnswer('XYZ', data)).toBe('XYZ');
  });

  it('lists two or more extra capitals with commas and "and"', () => {
    const many = { ...country('NOR'), capitals: ['A', 'B', 'C', 'D'] };
    expect(capitalsText(many)).toBe('A (also B, C and D)');
  });

  describe('questions from the real data', () => {
    const config = defaultRoundConfig('capital');

    it('has four options with four different capitals in every question', () => {
      for (let seed = 0; seed < 30; seed++) {
        const questions = createRoundQuestions(capitalMode, data, config, seededRng(seed));
        expect(questions).toHaveLength(config.questionCount);
        for (const { targetId, options = [] } of questions) {
          expect(options).toHaveLength(4);
          expect(options).toContain(targetId);
          // Different also when written differently: never George Town and Georgetown.
          const labels = options.map((id) => capitalOf(data, id));
          expect(new Set(labels.map(labelKey)).size, labels.join()).toBe(4);
        }
      }
    });

    it('keeps a region round, and its options, in the region', () => {
      const europe = { ...config, regions: ['Europe'] };
      for (let seed = 0; seed < 10; seed++) {
        for (const q of createRoundQuestions(capitalMode, data, europe, seededRng(seed))) {
          for (const id of q.options ?? []) expect(country(id).region, id).toBe('Europe');
        }
      }
    });
  });
});
