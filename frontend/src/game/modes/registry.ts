import { capitalMode } from './capital/mode';
import { capitalCountryMode } from './capital-country/mode';
import { flagNameMode } from './flag-name/mode';
import { flagPickMode } from './flag-pick/mode';
import { mapClickMode } from './map-click/mode';
import type { GameMode } from './types';

/** Every playable mode, in menu order. Register new modes here. */
export const gameModes: readonly GameMode[] = [
  mapClickMode,
  capitalMode,
  capitalCountryMode,
  flagNameMode,
  flagPickMode,
];

export function findGameMode(id: string | undefined): GameMode | undefined {
  return gameModes.find((mode) => mode.id === id);
}
