import type { ComponentType } from 'react';
import type { GameData } from '../../data/load';
import type { Country } from '../../data/types';
import type { Rng } from '../engine/random';
import type { AnswerRecord, Question, RoundConfig } from '../engine/types';

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
  /** The round's settings, e.g. its regions (shared filters are already applied). */
  config: RoundConfig;
  question: Question;
  /** Answers to the earlier questions of this round, in order. */
  history: readonly AnswerRecord[];
  /** The answer to this question while its feedback is shown; undefined while asking. */
  feedback: AnswerRecord | undefined;
  /** Call once with the player's answer. Later calls are ignored by the engine. */
  onAnswer: (answer: string) => void;
}

/**
 * The parts that make a mode its own. Everything else is shared: the round flow in the
 * engine (game/engine), score, progress and "Next" in RoundView, results in ResultsView.
 */
export interface GameMode extends GameModeInfo {
  /**
   * The countries this mode can ask about. Shared filters such as `RoundConfig.regions`
   * are applied afterwards for every mode (game/setup.ts), so don't filter for them here.
   */
  questionPool(data: GameData): readonly Country[];
  /**
   * Optional: builds the round's questions from the filtered pool, e.g. to add
   * multiple-choice `options`. Without it, `config.questionCount` distinct countries
   * are picked at random. May return fewer questions; an empty list is shown as
   * "no questions match".
   */
  buildQuestions?(
    pool: readonly Country[],
    config: RoundConfig,
    data: GameData,
    rng: Rng,
  ): Question[];
  isCorrect(question: Question, answer: string, data: GameData): boolean;
  /** How a question reads in the results list, e.g. the country or capital asked for. */
  describeQuestion(question: Question, data: GameData): string;
  /** How an answer reads in the results list, e.g. a country name. */
  describeAnswer(answer: string, data: GameData): string;
  /** Renders the prompt and the input for one question, plus its feedback. */
  Play: ComponentType<PlayProps>;
}
