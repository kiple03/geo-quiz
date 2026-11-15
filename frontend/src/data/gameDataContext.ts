import { createContext, useContext, useEffect, useMemo } from 'react';
import {
  createGameData,
  type DatasetId,
  type Datasets,
  type ExtraDatasetId,
  type GameData,
} from './load';

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

  return useMemo(() => stateFor(entries, idsFromKey(key), request), [entries, key, request]);
}

const idsFromKey = (key: string) => (key ? (key.split(',') as ExtraDatasetId[]) : []);

function stateFor(
  entries: DatasetEntries,
  extra: readonly ExtraDatasetId[],
  request: GameDataContextValue['request'],
): GameDataState {
  const ids: DatasetId[] = ['countries', ...extra];
  for (const id of ids) {
    const entry = entries[id];
    if (entry?.status === 'error') {
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
  return { status: 'ready', data: createGameData(countries.value, datasets) };
}
