import { countryName } from '../../../data/load';
import { buildChoiceQuestions, isTargetAnswer } from '../../choice/choices';
import type { GameMode } from '../types';
import CapitalPlay from './CapitalPlay';
import { capitalOf, capitalsText, hasCapital, mainCapital } from './capitals';

/** Multiple choice (ADR 0007): the game names a country, the player picks its capital. */
export const capitalMode: GameMode = {
  id: 'capital',
  title: 'Name the capital',
  description: 'A country is named. Pick its capital from four options.',
  // No `datasets`: the countries are all it needs, so the map is never loaded for it.

  questionPool: (data) => data.countries.filter(hasCapital),

  // Wrong options can be any country with a capital, also outside the round's regions
  // when a region has too few; they are picked from the target's region first.
  buildQuestions: (pool, config, data, rng) =>
    buildChoiceQuestions(pool, config, rng, {
      candidates: data.countries.filter(hasCapital),
      labelOf: mainCapital,
    }),

  // By country, not by name: Kingston is the capital of Jamaica and Norfolk Island.
  isCorrect: isTargetAnswer,

  describeQuestion: (question, data) => {
    const country = data.countriesById.get(question.targetId);
    const name = countryName(data, question.targetId);
    return country ? `${name}: ${capitalsText(country)}` : name;
  },

  describeAnswer: (answer, data) => capitalOf(data, answer),

  Play: CapitalPlay,
};
