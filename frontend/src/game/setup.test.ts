import { fixtureCountries, fixtureGameData } from '../test/fixtures';
import { seededRng } from './engine/random';
import type { RoundConfig } from './engine/types';
import { mapClickMode } from './modes/map-click/mode';
import type { GameMode } from './modes/types';
import { applyRoundFilters, countryIdsInRound, createRoundQuestions } from './setup';

const config: RoundConfig = {
  modeId: 'map-click',
  questionCount: 10,
  autoAdvanceMs: null,
  regions: [],
};

// Alphaland is in Europe, Betaland in Africa.
const pool = fixtureCountries;

describe('applyRoundFilters', () => {
  it('keeps the whole pool when no regions are chosen', () => {
    expect(applyRoundFilters(pool, config)).toBe(pool);
  });

  it('keeps only countries in the chosen regions', () => {
    expect(applyRoundFilters(pool, { ...config, regions: ['Africa'] })).toEqual([pool[1]]);
    expect(applyRoundFilters(pool, { ...config, regions: ['Europe', 'Africa'] })).toEqual(pool);
  });
});

describe('countryIdsInRound', () => {
  it("is the dataset's own id set when nothing is filtered", () => {
    expect(countryIdsInRound(fixtureGameData, config)).toBe(fixtureGameData.countryIds);
  });

  it('keeps only the ids in the chosen regions', () => {
    expect([...countryIdsInRound(fixtureGameData, { ...config, regions: ['Europe'] })]).toEqual([
      'AAA',
    ]);
  });
});

describe('createRoundQuestions', () => {
  it('picks distinct countries from the mode pool by default', () => {
    const questions = createRoundQuestions(mapClickMode, fixtureGameData, config, seededRng(1));
    expect(questions.map((q) => q.targetId).sort()).toEqual(['AAA', 'BBB']);
  });

  it('returns no questions when a filter matches nothing or the count is 0', () => {
    expect(
      createRoundQuestions(mapClickMode, fixtureGameData, { ...config, regions: ['Nowhere'] }),
    ).toEqual([]);
    expect(
      createRoundQuestions(mapClickMode, fixtureGameData, { ...config, questionCount: 0 }),
    ).toEqual([]);
  });

  it("uses the mode's own buildQuestions with the filtered pool", () => {
    const buildQuestions = vi.fn<NonNullable<GameMode['buildQuestions']>>((p) =>
      p.map((c) => ({ targetId: c.id, options: ['AAA', 'BBB'] })),
    );
    const mode: GameMode = { ...mapClickMode, buildQuestions };
    const filtered = { ...config, regions: ['Europe', 'Africa'] };

    const questions = createRoundQuestions(mode, fixtureGameData, filtered, seededRng(1));

    expect(questions).toEqual([
      { targetId: 'AAA', options: ['AAA', 'BBB'] },
      { targetId: 'BBB', options: ['AAA', 'BBB'] },
    ]);
    expect(buildQuestions).toHaveBeenCalledWith(
      fixtureCountries,
      filtered,
      fixtureGameData,
      expect.any(Function),
    );
  });
});
