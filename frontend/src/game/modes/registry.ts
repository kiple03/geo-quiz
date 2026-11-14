import { mapClickMode } from './map-click/mode';
import type { GameModeInfo } from './types';

/** Every playable mode, in menu order. Register new modes here. */
export const gameModes: readonly GameModeInfo[] = [mapClickMode];

export function findGameMode(id: string | undefined): GameModeInfo | undefined {
  return gameModes.find((mode) => mode.id === id);
}
