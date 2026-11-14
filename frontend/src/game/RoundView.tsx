import { useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { GameData } from '../data/load';
import {
  currentQuestion,
  lastAnswer,
  roundReducer,
  roundResult,
  score,
  startRound,
} from './engine/round';
import type { Question, RoundConfig } from './engine/types';
import type { GameMode } from './modes/types';
import ResultsView from './ResultsView';
import { createRoundQuestions } from './setup';

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
function RoundView(props: RoundViewProps) {
  const { mode, data, config } = props;
  // Picked once per mount; a new round is a new mount (see GameScreen).
  const [questions] = useState(() => createRoundQuestions(mode, data, config));

  if (questions.length === 0) {
    return (
      <div className="round-empty" role="alert">
        <p>No questions match these settings. Try a different region or game.</p>
        <Link to="/" className="button">
          Back to menu
        </Link>
      </div>
    );
  }
  return <ActiveRound {...props} questions={questions} />;
}

function ActiveRound({
  mode,
  data,
  config,
  onPlayAgain,
  questions,
}: RoundViewProps & { questions: readonly Question[] }) {
  const [state, dispatch] = useReducer(roundReducer, undefined, () =>
    startRound(config, questions, Date.now()),
  );

  const feedback = lastAnswer(state);

  // When a new question starts, put focus where the player answers (the element the
  // mode marks with `data-autofocus`, else the round itself), so keyboard and
  // screen-reader players can go on (ADR 0005). Only if focus was lost, e.g. because
  // auto-advance removed the focused "Next" button, or is still inside the round:
  // focus the player moved elsewhere (e.g. to the header) is left alone.
  const roundRef = useRef<HTMLDivElement>(null);
  const questionIndex = state.current;
  useEffect(() => {
    const round = roundRef.current;
    if (!round) return;
    const active = document.activeElement;
    const lost = !active || active === document.body;
    if (!lost && !round.contains(active)) return;
    const target = round.querySelector<HTMLElement | SVGElement>('[data-autofocus]') ?? round;
    target.focus();
  }, [questionIndex]);

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
    <div className="round" ref={roundRef} tabIndex={-1}>
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
        // A fresh instance per question, so state inside a mode (typed text, a chosen
        // option) never carries over to the next question.
        key={state.current}
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
