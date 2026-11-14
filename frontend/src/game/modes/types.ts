/**
 * A game mode is a plugin: the menu lists every registered mode and the game screen
 * runs whichever one the route names (ADR 0003). Adding a mode means adding a folder
 * under `game/modes/` and one entry in `registry.ts`.
 *
 * For now a mode only carries what the menu needs. It grows the hooks the round engine
 * needs (question pool, answer check, play component) when the first mode is playable.
 */
export interface GameModeInfo {
  /** Stable id, used in the URL (`/play/:modeId`) and later in saved results. */
  id: string;
  title: string;
  description: string;
}
