import { countryName } from '../../../data/load';
import { buildChoiceQuestions, isTargetAnswer } from '../../choice/choices';
import { describeCapitalQuestion, hasCapital, sharesCapital } from '../capital/capitals';
import type { GameMode } from '../types';
import CapitalCountryPlay from './CapitalCountryPlay';

/**
 * Multiple choice, the reverse of "Name the capital" (ADR 0009): the game names a
 * capital, the player picks its country.
 */
export const capitalCountryMode: GameMode = {
  id: 'capital-country',
  title: 'Whose capital?',
  description: 'A capital is named. Pick the country it belongs to from four options.',
  // No `datasets`: the countries are all it needs.

  questionPool: (data) => data.countries.filter(hasCapital),

  // Options are country names, which are always different. Countries that share a
  // capital are never options together: "Kingston" would fit both Jamaica and Norfolk
  // Island, "Georgetown" both Guyana and the Cayman Islands (George Town). Wrong options come from the target's region first, as in capital mode.
  buildQuestions: (pool, config, data, rng) =>
    buildChoiceQuestions(pool, config, rng, {
      candidates: data.countries.filter(hasCapital),
      labelOf: (country) => country.name,
      conflicts: sharesCapital,
    }),

  isCorrect: isTargetAnswer,

  // As in capital mode, so the results read the same.
  describeQuestion: describeCapitalQuestion,

  describeAnswer: (answer, data) => countryName(data, answer),

  Play: CapitalCountryPlay,
};
