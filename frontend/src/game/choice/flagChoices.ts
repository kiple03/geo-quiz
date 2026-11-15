import { flagsLookAlike, hasFlagImage, hasOwnFlag } from '../../data/flags';
import { countryName, flagUrl, type GameData } from '../../data/load';
import type { Country } from '../../data/types';
import type { Rng } from '../engine/random';
import type { Question, RoundConfig } from '../engine/types';
import type { GameMode, GameModeInfo } from '../modes/types';
import { buildChoiceQuestions, isTargetAnswer } from './choices';

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

/**
 * Fetches the round's flags at its start, so later questions don't wait for them: the
 * asked flags, plus every option's when the options are flags.
 */
export function preloadFlags(questions: readonly Question[], withOptions: boolean): void {
  const ids = new Set(
    questions.flatMap((q) => (withOptions ? [q.targetId, ...(q.options ?? [])] : [q.targetId])),
  );
  for (const id of ids) {
    if (hasFlagImage(id)) new Image().src = flagUrl(id);
  }
}

interface FlagModeSettings extends GameModeInfo {
  /** Whether the options are flags (pick the flag), not names (name the flag). */
  flagOptions: boolean;
  Play: GameMode['Play'];
}

/** A flag mode: everything but its texts and `Play` is shared. */
export const flagMode = ({ flagOptions, ...settings }: FlagModeSettings): GameMode => ({
  ...settings,
  // No `datasets`: flags are images, fetched one by one (ADR 0008).
  questionPool: flagPool,
  buildQuestions: buildFlagQuestions,
  preload: (questions) => preloadFlags(questions, flagOptions),
  isCorrect: isTargetAnswer,
  describeQuestion: (question, data) => countryName(data, question.targetId),
  describeAnswer: (answer, data) => countryName(data, answer),
});
