import { getMapGeometry } from '../../../map/geometry';
import type { GameMode } from '../types';
import MapClickPlay from './MapClickPlay';

/**
 * Countries smaller than this on the map (in viewBox units², about px² at normal size)
 * are too small to click, so they are not asked about. 5 leaves out e.g. Luxembourg,
 * Gambia and Cyprus, and keeps Lebanon and Jamaica. Zoom or markers (Phase 3) will let
 * the smaller ones back in.
 */
export const MIN_TARGET_AREA = 5;

/** The core mode (ADR 0002): the game names a country, the player clicks it on the map. */
export const mapClickMode: GameMode = {
  id: 'map-click',
  title: 'Find the country',
  description: 'A country is named. Click it on the world map.',

  questionPool(data) {
    const areas = new Map(getMapGeometry(data.world).shapes.map((s) => [s.id, s.area]));
    return data.countries.filter((c) => (areas.get(c.id) ?? 0) >= MIN_TARGET_AREA);
  },

  isCorrect: (question, answer) => answer === question.targetId,

  describeAnswer: (answer, data) => data.countriesById.get(answer)?.name ?? answer,

  Play: MapClickPlay,
};
