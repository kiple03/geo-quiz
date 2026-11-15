import countriesRaw from '../../../../public/data/countries.json?raw';
import { createGameData } from '../../../data/load';
import { parseCountries } from '../../../data/validate';
import { seededRng } from '../../engine/random';
import { defaultRoundConfig } from '../../engine/types';
import { createRoundQuestions } from '../../setup';
import { sharesCapital } from '../capital/capitals';
import { capitalCountryMode } from './mode';

// The real data, since its edge cases (Kingston, South Africa) are what matter here.
const data = createGameData(parseCountries(JSON.parse(countriesRaw)));
const country = (id: string) => data.countriesById.get(id)!;

describe('capital-country mode', () => {
  it('needs no dataset besides the countries', () => {
    expect(capitalCountryMode.datasets ?? []).toEqual([]);
  });

  it('asks about every country with a capital, and only those', () => {
    const pool = new Set(capitalCountryMode.questionPool(data).map((c) => c.id));
    for (const id of ['ATA', 'HMD', 'MAC']) expect(pool, id).not.toContain(id);
    for (const id of ['NOR', 'ZAF', 'JAM', 'NFK']) expect(pool, id).toContain(id);
  });

  it('finds countries that share a capital', () => {
    expect(sharesCapital(country('JAM'), country('NFK'))).toBe(true);
    expect(sharesCapital(country('JAM'), country('NOR'))).toBe(false);
    // Written differently: George Town (Cayman Islands) and Georgetown (Guyana).
    expect(sharesCapital(country('CYM'), country('GUY'))).toBe(true);
    // Any of South Africa's capitals counts, not only the first.
    const other = { ...country('NOR'), capitals: [' cape town'] };
    expect(sharesCapital(country('ZAF'), other)).toBe(true);
  });

  it('checks the answer by country', () => {
    expect(capitalCountryMode.isCorrect({ targetId: 'JAM' }, 'JAM', data)).toBe(true);
    expect(capitalCountryMode.isCorrect({ targetId: 'JAM' }, 'NFK', data)).toBe(false);
  });

  it('describes questions with all capitals, and answers by country name', () => {
    expect(capitalCountryMode.describeQuestion({ targetId: 'ZAF' }, data)).toBe(
      'South Africa: Pretoria (also Bloemfontein and Cape Town)',
    );
    expect(capitalCountryMode.describeAnswer('SWE', data)).toBe('Sweden');
    expect(capitalCountryMode.describeAnswer('XYZ', data)).toBe('XYZ');
  });

  describe('questions from the real data', () => {
    const config = defaultRoundConfig('capital-country');

    it('has four different countries in every question, never two with one capital', () => {
      for (let seed = 0; seed < 30; seed++) {
        const questions = createRoundQuestions(capitalCountryMode, data, config, seededRng(seed));
        expect(questions).toHaveLength(config.questionCount);
        for (const { targetId, options = [] } of questions) {
          expect(options).toHaveLength(4);
          expect(options).toContain(targetId);
          expect(new Set(options).size).toBe(4);
          for (const a of options) {
            for (const b of options) {
              if (a !== b) expect(sharesCapital(country(a), country(b)), `${a} ${b}`).toBe(false);
            }
          }
        }
      }
    });

    // Jamaica and Norfolk Island are in different regions, so with the full data the
    // region-first options hide the problem. With four countries, every one is a
    // candidate for each other.
    it.each([
      ['JAM', 'NFK'],
      ['GUY', 'CYM'],
    ])('never offers %s and %s together, even with few candidates', (a, b) => {
      const few = createGameData([a, b, 'NOR', 'SWE'].map(country));
      for (let seed = 0; seed < 20; seed++) {
        const questions = capitalCountryMode.buildQuestions!(
          few.countries,
          { ...config, questionCount: 4 },
          few,
          seededRng(seed),
        );
        expect(questions).toHaveLength(4);
        for (const { options = [] } of questions) {
          expect(options).toHaveLength(3);
          expect(options.includes(a) && options.includes(b), options.join()).toBe(false);
        }
      }
    });

    it('keeps a region round, and its options, in the region', () => {
      const europe = { ...config, regions: ['Europe'] };
      for (let seed = 0; seed < 10; seed++) {
        for (const q of createRoundQuestions(capitalCountryMode, data, europe, seededRng(seed))) {
          for (const id of q.options ?? []) expect(country(id).region, id).toBe('Europe');
        }
      }
    });
  });
});
