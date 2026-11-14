/**
 * Types shared by every game mode (ADR 0003). All of them are plain, serializable data,
 * so a round result can be sent to the Phase 4 backend as-is.
 */

export const DEFAULT_QUESTION_COUNT = 10;
export const DEFAULT_AUTO_ADVANCE_MS = 1000;

/** How a round is set up. New options (time limit, ...) are added here. */
export interface RoundConfig {
  modeId: string;
  questionCount: number;
  /** Pause before moving on after a correct answer; null = always wait for "Next". */
  autoAdvanceMs: number | null;
  /**
   * Only ask about countries in these regions (`Country.region`, e.g. "Africa").
   * Empty = the whole world. Applied to every mode in one place (game/setup.ts).
   */
  regions: readonly string[];
}

/** One question. Serializable, so it can be stored in results or come from a server. */
export interface Question {
  /** What is asked about: a `Country.id` today, later e.g. a state code. */
  targetId: string;
  /** Choices offered to the player, for multiple-choice modes (ids, like `targetId`). */
  options?: readonly string[];
}

export interface AnswerRecord {
  question: Question;
  /** What the player answered, e.g. the id of the clicked country. */
  answer: string;
  correct: boolean;
  /** Epoch milliseconds. */
  answeredAt: number;
}

/** A finished round. This is what a backend will receive when scores are saved. */
export interface RoundResult {
  config: RoundConfig;
  answers: AnswerRecord[];
  score: number;
  total: number;
  /** Epoch milliseconds. */
  startedAt: number;
  finishedAt: number;
}
