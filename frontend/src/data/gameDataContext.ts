import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createGameData,
  type DatasetId,
  type Datasets,
  type ExtraDatasetId,
  type GameData,
} from './load';
import type { Country } from './types';

export type GameDataState =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'ready'; data: GameData };

/** One dataset in the provider's cache. No entry yet means it was never requested. */
export type DatasetEntry<T> =
  { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; value: T };

export type DatasetEntries = { [K in DatasetId]?: DatasetEntry<Datasets[K]> };

export interface GameDataContextValue {
  entries: DatasetEntries;
  /** Starts loading the datasets that are not loaded or loading yet (failed ones again). */
  request: (ids: readonly DatasetId[]) => void;
}

export const GameDataContext = createContext<GameDataContextValue | null>(null);

const LOADING: GameDataState = { status: 'loading' };

/**
 * The countries plus the `extra` datasets (e.g. a mode's `datasets`), loading any that
 * are missing. Ready once all of them are; an error in any of them is an error, and
 * `retry` loads the failed ones again. Use inside `<GameDataProvider>`.
 */
export function useGameData(extra: readonly ExtraDatasetId[] = []): GameDataState {
  const context = useContext(GameDataContext);
  if (!context) throw new Error('useGameData must be used inside <GameDataProvider>');
  const { entries, request } = context;

  // Keyed on a string, so a new array with the same ids doesn't reload or rebuild.
  const key = extra.join(',');
  useEffect(() => {
    request(['countries', ...idsFromKey(key)]);
  }, [request, key]);

  // Failed entries that were already there when this screen mounted, from an earlier
  // visit. The request above retries them, so they read as loading: the alert must not
  // flash up before the retry starts. A new failure is a new entry, so it still shows.
  const [staleErrors] = useState(
    () => new Set(Object.values(entries).filter((e) => e?.status === 'error')),
  );

  return useMemo(
    () => stateFor(entries, idsFromKey(key), request, staleErrors),
    [entries, key, request, staleErrors],
  );
}

const idsFromKey = (key: string) => (key ? (key.split(',') as ExtraDatasetId[]) : []);

function stateFor(
  entries: DatasetEntries,
  extra: readonly ExtraDatasetId[],
  request: GameDataContextValue['request'],
  staleErrors: ReadonlySet<unknown>,
): GameDataState {
  const ids: DatasetId[] = ['countries', ...extra];
  for (const id of ids) {
    const entry = entries[id];
    if (entry?.status === 'error') {
      if (staleErrors.has(entry)) return LOADING;
      return { status: 'error', error: entry.error, retry: () => request(ids) };
    }
  }
  const countries = entries.countries;
  if (countries?.status !== 'ready') return LOADING;
  const datasets: GameData['datasets'] = {};
  for (const id of extra) {
    const entry = entries[id];
    if (entry?.status !== 'ready') return LOADING;
    datasets[id] = entry.value;
  }
  return { status: 'ready', data: gameDataFor(countries.value, datasets, extra) };
}

/**
 * One `GameData` per combination of loaded datasets, so its identity only changes when
 * a dataset this screen uses does: another dataset loading in the background (e.g. the
 * map, for a later screen) must not hand a running round new data.
 */
const gameDataCache = new WeakMap<readonly Country[], Map<string, GameData>>();

function gameDataFor(
  countries: readonly Country[],
  datasets: GameData['datasets'],
  extra: readonly ExtraDatasetId[],
): GameData {
  let byIds = gameDataCache.get(countries);
  if (!byIds) gameDataCache.set(countries, (byIds = new Map()));
  const key = extra.join(',');
  const cached = byIds.get(key);
  if (cached && extra.every((id) => cached.datasets[id] === datasets[id])) return cached;
  const data = createGameData(countries, datasets);
  byIds.set(key, data);
  return data;
}
