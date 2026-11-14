import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { GameDataContext, type GameDataState } from './gameDataContext';
import { loadGameData, type GameData } from './load';

type Outcome = { attempt: number } & ({ ok: true; data: GameData } | { ok: false; error: Error });

interface GameDataProviderProps {
  children: ReactNode;
  /** Replaces the real loader, e.g. in tests. Must be a stable function. */
  load?: (signal: AbortSignal) => Promise<GameData>;
}

/**
 * Loads the game data once and shares it with every screen. Loading starts as soon as
 * the app mounts, so the data is usually ready by the time a game is picked.
 */
export function GameDataProvider({ children, load = loadGameData }: GameDataProviderProps) {
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setOutcome({ attempt, ok: true, data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setOutcome({ attempt, ok: false, error: err });
      },
    );
    return () => controller.abort();
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // An outcome from an earlier attempt means a retry is still loading.
  const state = useMemo<GameDataState>(() => {
    if (!outcome || outcome.attempt !== attempt) return { status: 'loading' };
    return outcome.ok
      ? { status: 'ready', data: outcome.data }
      : { status: 'error', error: outcome.error, retry };
  }, [outcome, attempt, retry]);

  return <GameDataContext value={state}>{children}</GameDataContext>;
}
