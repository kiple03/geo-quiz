import { Link } from 'react-router';
import type { GameData } from '../data/load';
import type { RoundResult } from './engine/types';
import type { GameMode } from './modes/types';

interface ResultsViewProps {
  result: RoundResult;
  mode: GameMode;
  data: GameData;
  onPlayAgain: () => void;
}

/** End of a round: the score and every question with what the player answered. */
function ResultsView({ result, mode, data, onPlayAgain }: ResultsViewProps) {
  return (
    <section className="results" aria-labelledby="results-heading">
      <h2 id="results-heading">Round complete</h2>
      <p className="results-score">
        You got <strong>{result.score}</strong> of {result.total} right.
      </p>
      <ol className="results-list">
        {result.answers.map(({ question, answer, correct }, i) => (
          <li key={i} className={correct ? 'results-item--correct' : 'results-item--wrong'}>
            <span className="results-mark">{correct ? '✓' : '✗'}</span>{' '}
            {mode.describeQuestion(question, data)}
            {!correct && (
              <span className="results-answer">
                {' '}
                (you answered {mode.describeAnswer(answer, data)})
              </span>
            )}
          </li>
        ))}
      </ol>
      <div className="results-actions">
        <button type="button" className="button button--primary" onClick={onPlayAgain} autoFocus>
          Play again
        </button>
        <Link to="/" className="button">
          Back to menu
        </Link>
      </div>
    </section>
  );
}

export default ResultsView;
