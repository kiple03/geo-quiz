import type { Country } from '../../data/types';
import { pickRandom, shuffle, type Rng } from '../engine/random';
import type { Question, RoundConfig } from '../engine/types';

/** Options per multiple-choice question: the right one and three wrong ones. */
export const DEFAULT_OPTION_COUNT = 4;

export interface ChoiceSettings {
  /** Countries the wrong options come from, e.g. every country that has a capital. */
  candidates: readonly Country[];
  /**
   * What an option shows, e.g. a capital. No two options in a question show the same
   * label (Jamaica and Norfolk Island both have Kingston), so the player can always tell
   * them apart; the answer is still checked by country id.
   */
  labelOf: (country: Country) => string;
  optionCount?: number;
}

/**
 * Multiple-choice questions for `GameMode.buildQuestions`: `config.questionCount`
 * countries from the (already filtered) pool, each with options that are country ids,
 * in random order. Shared by the capital and flag modes (ADR 0007).
 */
export function buildChoiceQuestions(
  pool: readonly Country[],
  config: RoundConfig,
  rng: Rng,
  settings: ChoiceSettings,
): Question[] {
  return pickRandom(pool, config.questionCount, rng).map((target) => ({
    targetId: target.id,
    options: pickOptions(target, settings, rng),
  }));
}

/**
 * The target plus wrong options, shuffled. Wrong options come from the target's region
 * when it has enough (harder, and it fits region rounds), else from anywhere. Fewer
 * options only if there are not enough candidates with distinct labels.
 */
export function pickOptions(
  target: Country,
  { candidates, labelOf, optionCount = DEFAULT_OPTION_COUNT }: ChoiceSettings,
  rng: Rng,
): string[] {
  const key = (country: Country) => labelOf(country).trim().toLocaleLowerCase();
  const chosen = [target.id];
  const labels = new Set([key(target)]);
  const sameRegion = candidates.filter((c) => c.region === target.region);
  const elsewhere = candidates.filter((c) => c.region !== target.region);

  for (const candidate of [...shuffle(sameRegion, rng), ...shuffle(elsewhere, rng)]) {
    if (chosen.length >= optionCount) break;
    const label = key(candidate);
    if (candidate.id === target.id || labels.has(label)) continue;
    chosen.push(candidate.id);
    labels.add(label);
  }
  return shuffle(chosen, rng);
}
