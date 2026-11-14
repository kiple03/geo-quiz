import { createContext, useContext } from 'react';
import type { GameData } from './load';

export type GameDataState =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'ready'; data: GameData };

export const GameDataContext = createContext<GameDataState | null>(null);

/** The shared game data and its loading state. Use inside `<GameDataProvider>`. */
export function useGameData(): GameDataState {
  const state = useContext(GameDataContext);
  if (!state) throw new Error('useGameData must be used inside <GameDataProvider>');
  return state;
}
