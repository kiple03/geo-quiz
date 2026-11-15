import { flagsLookAlike, hasFlagImage, hasOwnFlag } from '../../data/flags';
import { countryName, flagUrl, type GameData } from '../../data/load';
import type { Country } from '../../data/types';
import type { Rng } from '../engine/random';
import type { Question, RoundConfig } from '../engine/types';
import { buildChoiceQuestions } from './choices';

/**
 * Shared by the two flag modes (ADR 0008). Only countries with a flag of their own are
 * asked or offered: not Antarctica (no official flag) or the territories that fly
 * another country's flag (Heard Island, the French tricolour ones, Saint Helena).
 */
export const flagPool = (data: GameData): readonly Country[] =>
  data.countries.filter((country) => hasOwnFlag(country.id));

/**
 * Four options each, the wrong ones from the target's region first, and never two flags
 * that look the same (Chad and Romania). Wrong options may come from outside the
 * round's regions, as in capital mode.
 */
export const buildFlagQuestions = (
  pool: readonly Country[],
  config: RoundConfig,
  data: GameData,
  rng: Rng,
): Question[] =>
  buildChoiceQuestions(pool, config, rng, {
    candidates: flagPool(data),
    labelOf: (country) => country.name,
    conflicts: (a, b) => flagsLookAlike(a.id, b.id),
  });

/** Fetches every flag the round shows, so later questions don't wait for them. */
export function preloadFlags(questions: readonly Question[]): void {
  const ids = new Set(questions.flatMap((q) => [q.targetId, ...(q.options ?? [])]));
  for (const id of ids) {
    if (hasFlagImage(id)) new Image().src = flagUrl(id);
  }
}

/** The answer is checked by country. */
export const isSameCountry = (question: Question, answer: string) => answer === question.targetId;

export const describeCountry = (id: string, data: GameData) => countryName(data, id);
