import {
  answerQuestion,
  currentQuestion,
  lastAnswer,
  nextQuestion,
  pickQuestions,
  roundReducer,
  roundResult,
  score,
  startRound,
  type RoundState,
} from './round';
import { seededRng } from './random';
import type { RoundConfig } from './types';

const config: RoundConfig = {
  modeId: 'test',
  questionCount: 2,
  autoAdvanceMs: null,
  regions: [],
};
const questions = [{ targetId: 'AAA' }, { targetId: 'BBB' }];

describe('round engine', () => {
  it('plays a full round: ask, feedback, next, finish', () => {
    let state = startRound(config, questions, 1000);
    expect(state.phase).toBe('asking');
    expect(currentQuestion(state)).toEqual({ targetId: 'AAA' });

    state = answerQuestion(state, 'AAA', true, 2000);
    expect(state.phase).toBe('feedback');
    expect(lastAnswer(state)).toMatchObject({ answer: 'AAA', correct: true, answeredAt: 2000 });
    expect(currentQuestion(state)).toEqual({ targetId: 'AAA' });

    state = nextQuestion(state, 2500);
    expect(state.phase).toBe('asking');
    expect(currentQuestion(state)).toEqual({ targetId: 'BBB' });
    expect(lastAnswer(state)).toBeUndefined();

    state = answerQuestion(state, 'AAA', false, 3000);
    expect(state.phase).toBe('feedback');
    expect(roundResult(state)).toBeUndefined();

    state = nextQuestion(state, 4000);
    expect(state.phase).toBe('finished');
    expect(currentQuestion(state)).toBeUndefined();
    expect(roundResult(state)).toEqual({
      config,
      answers: [
        { question: questions[0], answer: 'AAA', correct: true, answeredAt: 2000 },
        { question: questions[1], answer: 'AAA', correct: false, answeredAt: 3000 },
      ],
      score: 1,
      total: 2,
      startedAt: 1000,
      finishedAt: 4000,
    });
  });

  it('ignores a second answer while feedback is shown', () => {
    const answered = answerQuestion(startRound(config, questions, 0), 'AAA', true, 1);
    expect(answerQuestion(answered, 'BBB', false, 2)).toBe(answered);
    expect(score(answered)).toBe(1);
  });

  it('ignores "next" while a question is still being asked', () => {
    const state = startRound(config, questions, 0);
    expect(nextQuestion(state, 1)).toBe(state);
  });

  it('ignores answers after the round is finished', () => {
    let state: RoundState = startRound(config, [questions[0]], 0);
    state = nextQuestion(answerQuestion(state, 'AAA', true, 1), 2);
    expect(answerQuestion(state, 'AAA', true, 3)).toBe(state);
  });

  it('refuses to start a round without questions', () => {
    expect(() => startRound(config, [], 0)).toThrow(RangeError);
  });
});

describe('roundReducer', () => {
  it('runs the same transitions as the functions', () => {
    let state = startRound(config, questions, 0);
    state = roundReducer(state, { type: 'answer', answer: 'AAA', correct: true, now: 1 });
    expect(state.phase).toBe('feedback');
    state = roundReducer(state, { type: 'next', now: 2 });
    expect(currentQuestion(state)).toEqual({ targetId: 'BBB' });
  });
});

describe('pickQuestions', () => {
  const ids = ['AAA', 'BBB', 'CCC', 'DDD'];

  it('picks distinct targets, at most as many as there are', () => {
    const picked = pickQuestions(ids, 3, seededRng(1)).map((q) => q.targetId);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    expect(pickQuestions(ids, 10, seededRng(1))).toHaveLength(4);
  });

  it('is repeatable with a seeded rng', () => {
    expect(pickQuestions(ids, 4, seededRng(9))).toEqual(pickQuestions(ids, 4, seededRng(9)));
  });
});
