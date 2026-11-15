import {
  buildFlagQuestions,
  describeCountry,
  flagPool,
  isSameCountry,
  preloadFlags,
} from '../../choice/flagChoices';
import type { GameMode } from '../types';
import FlagNamePlay from './FlagNamePlay';

/** Multiple choice (ADR 0008): a flag is shown, the player picks its country. */
export const flagNameMode: GameMode = {
  id: 'flag-name',
  title: 'Name the flag',
  description: 'A flag is shown. Pick the country it belongs to from four options.',
  previewFlags: ['JPN', 'BRA', 'KEN'],
  // No `datasets`: flags are images, fetched one by one (ADR 0008).

  questionPool: flagPool,
  buildQuestions: buildFlagQuestions,
  preload: preloadFlags,
  isCorrect: isSameCountry,
  describeQuestion: (question, data) => describeCountry(question.targetId, data),
  describeAnswer: describeCountry,

  Play: FlagNamePlay,
};
