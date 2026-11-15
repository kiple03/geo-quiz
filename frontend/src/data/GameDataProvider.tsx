import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  GameDataContext,
  type DatasetEntries,
  type DatasetEntry,
  type GameDataContextValue,
} from './gameDataContext';
import { datasetLoaders, type DatasetId, type DatasetLoaders, type Datasets } from './load';

interface GameDataProviderProps {
  children: ReactNode;
  /** Replaces the real loaders, e.g. in tests. Read once, when the provider mounts. */
  loaders?: DatasetLoaders;
}

/**
 * Loads each dataset once, when a screen first asks for it (`useGameData`), and keeps it
 * for the rest of the session (ADR 0007). The countries start loading as soon as the app
 * mounts, since every game needs them. A failed load is forgotten, so asking again
 * retries it.
 */
export function GameDataProvider({ children, loaders = datasetLoaders }: GameDataProviderProps) {
  const [entries, setEntries] = useState<DatasetEntries>({});
  const [initialLoaders] = useState(loaders);
  // Datasets loading or loaded. A ref, not state, so two requests in one render (or
  // StrictMode's double effects) never start the same load twice.
  const started = useRef(new Set<DatasetId>());

  const request = useCallback(
    (ids: readonly DatasetId[]) => {
      const update = <K extends DatasetId>(id: K, entry: DatasetEntry<Datasets[K]>) =>
        setEntries((current) => ({ ...current, [id]: entry }));

      const load = <K extends DatasetId>(id: K) => {
        if (started.current.has(id)) return;
        started.current.add(id);
        update(id, { status: 'loading' });
        // Not aborted on unmount: a load is shared and cached, so it is never wasted.
        (initialLoaders[id] as () => Promise<Datasets[K]>)().then(
          (value) => update(id, { status: 'ready', value }),
          (error: unknown) => {
            started.current.delete(id);
            update(id, {
              status: 'error',
              error: error instanceof Error ? error : new Error(String(error)),
            });
          },
        );
      };
      ids.forEach(load);
    },
    [initialLoaders],
  );

  useEffect(() => request(['countries']), [request]);

  const value = useMemo<GameDataContextValue>(() => ({ entries, request }), [entries, request]);
  return <GameDataContext value={value}>{children}</GameDataContext>;
}
