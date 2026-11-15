import {
  buildFlagQuestions,
  describeCountry,
  flagPool,
  isSameCountry,
  preloadFlags,
} from '../../choice/flagChoices';
import type { GameMode } from '../types';
import FlagPickPlay from './FlagPickPlay';

/** Multiple choice (ADR 0008): a country is named, the player picks its flag. */
export const flagPickMode: GameMode = {
  id: 'flag-pick',
  title: 'Pick the flag',
  description: 'A country is named. Pick its flag from four flags.',
  previewFlags: ['NOR', 'CAN', 'NPL'],
  // No `datasets`: flags are images, fetched one by one (ADR 0008).

  questionPool: flagPool,
  buildQuestions: buildFlagQuestions,
  preload: preloadFlags,
  isCorrect: isSameCountry,
  describeQuestion: (question, data) => describeCountry(question.targetId, data),
  describeAnswer: describeCountry,

  Play: FlagPickPlay,
};
