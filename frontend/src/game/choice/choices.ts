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
  /**
   * Optional: two countries that must never be options in the same question, even
   * with different labels, e.g. flags that look the same (Chad and Romania).
   */
  conflicts?: (a: Country, b: Country) => boolean;
  optionCount?: number;
}

/**
 * What two labels must differ in to count as different: not case, accents, spaces or
 * punctuation. So "George Town" (Cayman Islands) and "Georgetown" (Guyana) are the same
 * label, and never two options in one question.
 */
export const labelKey = (label: string): string =>
  label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

/**
 * `GameMode.isCorrect` for options that are country ids: right if it is the asked
 * country, never by the text shown (Kingston is Jamaica's and Norfolk Island's).
 */
export const isTargetAnswer = (question: Question, answer: string) => answer === question.targetId;

/**
 * Multiple-choice questions for `GameMode.buildQuestions`: `config.questionCount`
 * countries from the (already filtered) pool, each with options that are country ids,
 * in random order. Shared by both capital modes and both flag modes (ADR 0007).
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
 * first (harder, and it keeps region rounds in the region); only if it runs out are the
 * rest topped up from other regions, so a question can then mix regions. Every region
 * the menu offers has enough. Fewer options only if there are not enough candidates
 * with distinct labels and no conflicts.
 */
export function pickOptions(
  target: Country,
  {
    candidates,
    labelOf,
    conflicts = () => false,
    optionCount = DEFAULT_OPTION_COUNT,
  }: ChoiceSettings,
  rng: Rng,
): string[] {
  const key = (country: Country) => labelKey(labelOf(country));
  const chosen = [target];
  const labels = new Set([key(target)]);
  const sameRegion = candidates.filter((c) => c.region === target.region);
  const elsewhere = candidates.filter((c) => c.region !== target.region);

  for (const candidate of [...shuffle(sameRegion, rng), ...shuffle(elsewhere, rng)]) {
    if (chosen.length >= optionCount) break;
    const label = key(candidate);
    if (candidate.id === target.id || labels.has(label)) continue;
    if (chosen.some((option) => conflicts(option, candidate))) continue;
    chosen.push(candidate);
    labels.add(label);
  }
  return shuffle(
    chosen.map((country) => country.id),
    rng,
  );
}
