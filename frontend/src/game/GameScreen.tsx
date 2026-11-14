import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useGameData } from '../data/gameDataContext';
import { DEFAULT_AUTO_ADVANCE_MS, DEFAULT_QUESTION_COUNT } from './engine/types';
import { findGameMode } from './modes/registry';
import RoundView from './RoundView';
import './game.css';

/** Runs one game mode, chosen by the `/play/:modeId` route. */
function GameScreen() {
  const { modeId } = useParams();
  const mode = findGameMode(modeId);
  const dataState = useGameData();
  const [roundNumber, setRoundNumber] = useState(0);

  if (!mode) {
    return (
      <section>
        <h1>Unknown game mode</h1>
        <p>
          There is no game mode called “{modeId}”. <Link to="/">Back to the menu</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="game-screen">
      <h1>{mode.title}</h1>
      {dataState.status === 'loading' && <p role="status">Loading the map…</p>}
      {dataState.status === 'error' && (
        <div role="alert">
          <p>Could not load the game data.</p>
          <p>{dataState.error.message}</p>
          <button type="button" className="button" onClick={dataState.retry}>
            Try again
          </button>
        </div>
      )}
      {dataState.status === 'ready' && (
        <RoundView
          // A new key starts a fresh round.
          key={`${mode.id}-${roundNumber}`}
          mode={mode}
          data={dataState.data}
          // Settings UI comes later; for now every round uses the defaults.
          config={{
            modeId: mode.id,
            questionCount: DEFAULT_QUESTION_COUNT,
            autoAdvanceMs: DEFAULT_AUTO_ADVANCE_MS,
            regions: [],
          }}
          onPlayAgain={() => setRoundNumber((n) => n + 1)}
        />
      )}
    </section>
  );
}

export default GameScreen;
