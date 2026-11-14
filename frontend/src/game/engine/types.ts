/**
 * Types shared by every game mode (ADR 0003). All of them are plain, serializable data,
 * so a round result can be sent to the Phase 4 backend as-is.
 */

export const DEFAULT_QUESTION_COUNT = 10;
export const DEFAULT_AUTO_ADVANCE_MS = 1000;

/** How a round is set up. New options (regions, time limit, ...) are added here. */
export interface RoundConfig {
  modeId: string;
  questionCount: number;
  /** Pause before moving on after a correct answer; null = always wait for "Next". */
  autoAdvanceMs: number | null;
}

/** One question: which country it is about. Modes may extend this later (e.g. options). */
export interface Question {
  /** A `Country.id`. */
  targetId: string;
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
