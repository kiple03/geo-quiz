import { useEffect, useReducer } from 'react';
import type { GameData } from '../data/load';
import {
  currentQuestion,
  lastAnswer,
  pickQuestions,
  roundReducer,
  roundResult,
  score,
  startRound,
} from './engine/round';
import type { RoundConfig } from './engine/types';
import type { GameMode } from './modes/types';
import ResultsView from './ResultsView';

interface RoundViewProps {
  mode: GameMode;
  data: GameData;
  config: RoundConfig;
  onPlayAgain: () => void;
}

/**
 * Runs one round of any mode: progress, score and "Next" are shared here; the mode's
 * `Play` component renders the question itself. Mount it with a new `key` to start a
 * new round.
 */
function RoundView({ mode, data, config, onPlayAgain }: RoundViewProps) {
  const [state, dispatch] = useReducer(roundReducer, undefined, () => {
    const pool = mode.questionPool(data).map((country) => country.id);
    return startRound(config, pickQuestions(pool, config.questionCount), Date.now());
  });

  const feedback = lastAnswer(state);

  // A correct answer moves on by itself after a short pause; a wrong one waits for
  // "Next" so the player can study the map. Clicking "Next" early cancels the timer.
  const autoAdvanceMs = feedback?.correct ? config.autoAdvanceMs : null;
  useEffect(() => {
    if (autoAdvanceMs === null) return;
    const timer = setTimeout(() => dispatch({ type: 'next', now: Date.now() }), autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [autoAdvanceMs, state.answers.length]);

  const result = roundResult(state);
  if (result) {
    return <ResultsView result={result} mode={mode} data={data} onPlayAgain={onPlayAgain} />;
  }

  const question = currentQuestion(state);
  if (!question) return null;
  const isLast = state.current + 1 === state.questions.length;
  const Play = mode.Play;

  const answer = (value: string) =>
    dispatch({
      type: 'answer',
      answer: value,
      correct: mode.isCorrect(question, value, data),
      now: Date.now(),
    });

  return (
    <div className="round">
      <div className="round-bar">
        {/* One pip per question: answered ones show right/wrong, the current one is lit. */}
        <ol className="round-progress" aria-hidden="true">
          {state.questions.map((_, i) => {
            const answered = state.answers[i];
            const kind = answered
              ? answered.correct
                ? 'correct'
                : 'wrong'
              : i === state.current
                ? 'current'
                : 'upcoming';
            return <li key={i} className={`round-pip round-pip--${kind}`} />;
          })}
        </ol>
        <span className="round-count">
          Question {state.current + 1} of {state.questions.length}
        </span>
        <span className="round-score">
          Score: <strong>{score(state)}</strong>
        </span>
        {feedback && (
          <button
            type="button"
            className="button button--primary"
            onClick={() => dispatch({ type: 'next', now: Date.now() })}
            autoFocus
          >
            {isLast ? 'See results' : 'Next question'}
          </button>
        )}
      </div>
      <Play
        data={data}
        question={question}
        history={state.answers.slice(0, state.current)}
        feedback={feedback}
        onAnswer={answer}
      />
    </div>
  );
}

export default RoundView;
