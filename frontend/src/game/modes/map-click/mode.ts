import { countryName } from '../../../data/load';
import type { GameMode } from '../types';
import MapClickPlay from './MapClickPlay';

/** The core mode (ADR 0002): the game names a country, the player clicks it on the map. */
export const mapClickMode: GameMode = {
  id: 'map-click',
  title: 'Find the country',
  description: 'A country is named. Click it on the world map.',

  // Every country can be asked: small ones are found by zooming in, and the tiniest
  // get a marker on the map (ADR 0004).
  questionPool: (data) => data.countries,

  isCorrect: (question, answer) => answer === question.targetId,

  describeQuestion: (question, data) => countryName(data, question.targetId),

  describeAnswer: (answer, data) => countryName(data, answer),

  Play: MapClickPlay,
};
