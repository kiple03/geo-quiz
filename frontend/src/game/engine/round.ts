import type { AnswerRecord, Question, RoundConfig, RoundResult } from './types';

/**
 * The round engine, shared by every game mode (ADR 0003). Pure functions: no React, no
 * clock, no randomness. Callers pass in the time, and the mode decides whether an
 * answer is correct.
 *
 * Flow: `asking` → answer → `feedback` → next → `asking` ... → `finished`.
 * The last answer is shown as feedback too, before the round finishes.
 */
export type RoundPhase = 'asking' | 'feedback' | 'finished';

export interface RoundState {
  config: RoundConfig;
  questions: readonly Question[];
  /** Index into `questions` of the question being asked or shown. */
  current: number;
  answers: readonly AnswerRecord[];
  phase: RoundPhase;
  startedAt: number;
  finishedAt: number | null;
}

/** Starts a round with the given questions, in order. */
export function startRound(
  config: RoundConfig,
  questions: readonly Question[],
  now: number,
): RoundState {
  if (questions.length === 0) throw new RangeError('A round needs at least one question');
  return {
    config,
    questions,
    current: 0,
    answers: [],
    phase: 'asking',
    startedAt: now,
    finishedAt: null,
  };
}

/** The question being asked or shown; undefined once the round is finished. */
export function currentQuestion(state: RoundState): Question | undefined {
  return state.phase === 'finished' ? undefined : state.questions[state.current];
}

/** The answer to the current question, while its feedback is shown. */
export function lastAnswer(state: RoundState): AnswerRecord | undefined {
  return state.phase === 'feedback' ? state.answers[state.answers.length - 1] : undefined;
}

export function score(state: RoundState): number {
  return state.answers.filter((a) => a.correct).length;
}

/** Records an answer. Ignored unless a question is being asked (e.g. a double click). */
export function answerQuestion(
  state: RoundState,
  answer: string,
  correct: boolean,
  now: number,
): RoundState {
  const question = currentQuestion(state);
  if (state.phase !== 'asking' || !question) return state;
  return {
    ...state,
    answers: [...state.answers, { question, answer, correct, answeredAt: now }],
    phase: 'feedback',
  };
}

/** Moves on from feedback to the next question, or finishes the round. */
export function nextQuestion(state: RoundState, now: number): RoundState {
  if (state.phase !== 'feedback') return state;
  if (state.current + 1 >= state.questions.length) {
    return { ...state, phase: 'finished', finishedAt: now };
  }
  return { ...state, current: state.current + 1, phase: 'asking' };
}

/** The result of a finished round; undefined while it is still running. */
export function roundResult(state: RoundState): RoundResult | undefined {
  if (state.phase !== 'finished' || state.finishedAt === null) return undefined;
  return {
    config: state.config,
    answers: [...state.answers],
    score: score(state),
    total: state.questions.length,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
  };
}

export type RoundAction =
  | { type: 'start'; config: RoundConfig; questions: readonly Question[]; now: number }
  | { type: 'answer'; answer: string; correct: boolean; now: number }
  | { type: 'next'; now: number };

/** The same transitions as a reducer, for `useReducer`. `null` means no round yet. */
export function roundReducer(state: RoundState | null, action: RoundAction): RoundState | null {
  switch (action.type) {
    case 'start':
      return startRound(action.config, action.questions, action.now);
    case 'answer':
      return state && answerQuestion(state, action.answer, action.correct, action.now);
    case 'next':
      return state && nextQuestion(state, action.now);
  }
}
