import type { GameModeInfo } from '../types';

/** The core mode (ADR 0002): the game names a country, the player clicks it on the map. */
export const mapClickMode: GameModeInfo = {
  id: 'map-click',
  title: 'Find the country',
  description: 'A country is named. Click it on the world map.',
};
