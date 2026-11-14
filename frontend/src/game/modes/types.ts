import type { ComponentType } from 'react';
import type { GameData } from '../../data/load';
import type { Country } from '../../data/types';
import type { AnswerRecord, Question } from '../engine/types';

/**
 * A game mode is a plugin: the menu lists every registered mode and the game screen
 * runs whichever one the route names (ADR 0003). Adding a mode means adding a folder
 * under `game/modes/` and one entry in `registry.ts`.
 */
export interface GameModeInfo {
  /** Stable id, used in the URL (`/play/:modeId`) and later in saved results. */
  id: string;
  title: string;
  description: string;
}

/** What the game screen passes to a mode's `Play` component for one question. */
export interface PlayProps {
  data: GameData;
  question: Question;
  /** Answers to the earlier questions of this round, in order. */
  history: readonly AnswerRecord[];
  /** The answer to this question while its feedback is shown; undefined while asking. */
  feedback: AnswerRecord | undefined;
  /** Call once with the player's answer. Later calls are ignored by the engine. */
  onAnswer: (answer: string) => void;
}

/**
 * The parts that make a mode its own. Everything else (round flow, score, progress,
 * "Next", results) is shared and lives in the game screen and the round engine.
 */
export interface GameMode extends GameModeInfo {
  /** The countries this mode can ask about. */
  questionPool(data: GameData): readonly Country[];
  isCorrect(question: Question, answer: string, data: GameData): boolean;
  /** How an answer reads in the results list, e.g. a country name. */
  describeAnswer(answer: string, data: GameData): string;
  /** Renders the prompt and the input for one question, plus its feedback. */
  Play: ComponentType<PlayProps>;
}
