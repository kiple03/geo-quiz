import type { GameData } from '../data/load';
import type { Country } from '../data/types';
import type { Rng } from './engine/random';
import { pickQuestions } from './engine/round';
import type { Question, RoundConfig } from './engine/types';
import type { GameMode } from './modes/types';

/**
 * Filters that apply to every mode, driven by `RoundConfig` (ADR 0003). New shared
 * filters (subregion, UN members only, ...) belong here, not in the modes.
 */
export function applyRoundFilters(
  pool: readonly Country[],
  config: RoundConfig,
): readonly Country[] {
  if (config.regions.length === 0) return pool;
  const regions = new Set(config.regions);
  return pool.filter((country) => regions.has(country.region));
}

/**
 * The ids of every country the round's filters let in, from the whole dataset (not
 * just a mode's pool). A map mode makes these clickable and draws the rest as neutral
 * land (ADR 0006). The same set as `data.countryIds` when nothing is filtered.
 */
export function countryIdsInRound(data: GameData, config: RoundConfig): ReadonlySet<string> {
  if (config.regions.length === 0) return data.countryIds;
  return new Set(applyRoundFilters(data.countries, config).map((country) => country.id));
}

/**
 * The questions for one round: the mode's pool, narrowed by the shared filters, then
 * turned into questions by the mode (or picked at random). Can be empty, e.g. when a
 * filter matches nothing; callers must handle that.
 */
export function createRoundQuestions(
  mode: GameMode,
  data: GameData,
  config: RoundConfig,
  rng: Rng = Math.random,
): Question[] {
  const pool = applyRoundFilters(mode.questionPool(data), config);
  if (pool.length === 0 || config.questionCount < 1) return [];
  if (mode.buildQuestions) return mode.buildQuestions(pool, config, data, rng);
  return pickQuestions(
    pool.map((country) => country.id),
    config.questionCount,
    rng,
  );
}
