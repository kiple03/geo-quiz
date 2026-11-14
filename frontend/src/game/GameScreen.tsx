import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useGameData } from '../data/gameDataContext';
import { findGameMode } from './modes/registry';
import { regionsLabel } from './regions';
import RoundView from './RoundView';
import { roundConfigFromSearch, roundSearchFor } from './settings';
import './game.css';

/**
 * Runs one game mode, chosen by the `/play/:modeId` route, with the round settings
 * from the URL's search params (ADR 0006).
 */
function GameScreen() {
  const { modeId } = useParams();
  const mode = findGameMode(modeId);
  const dataState = useGameData();
  const [roundNumber, setRoundNumber] = useState(0);
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  // Keyed on the string, so the config only changes when the settings do.
  const config = useMemo(
    () => roundConfigFromSearch(modeId ?? '', new URLSearchParams(search)),
    [modeId, search],
  );

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

  const regionLabel = regionsLabel(config.regions);
  return (
    <section className="game-screen">
      <h1>
        {mode.title}
        {regionLabel && <span className="game-region"> · {regionLabel}</span>}
      </h1>
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
          // A new key starts a fresh round, also when the settings change.
          key={`${mode.id}?${roundSearchFor(config)}#${roundNumber}`}
          mode={mode}
          data={dataState.data}
          config={config}
          onPlayAgain={() => setRoundNumber((n) => n + 1)}
        />
      )}
    </section>
  );
}

export default GameScreen;
