import { Link, useParams } from 'react-router';
import { useGameData } from '../data/gameDataContext';
import WorldMap from '../map/WorldMap';
import { findGameMode } from './modes/registry';

/** Runs one game mode, chosen by the `/play/:modeId` route. */
function GameScreen() {
  const { modeId } = useParams();
  const mode = findGameMode(modeId);
  const dataState = useGameData();

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
    <section>
      <h1>{mode.title}</h1>
      {dataState.status === 'loading' && <p role="status">Loading the map…</p>}
      {dataState.status === 'error' && (
        <div role="alert">
          <p>Could not load the game data.</p>
          <p>{dataState.error.message}</p>
          <button type="button" onClick={dataState.retry}>
            Try again
          </button>
        </div>
      )}
      {dataState.status === 'ready' && (
        <>
          <p>The game is not playable yet. This is a preview of the map.</p>
          <WorldMap world={dataState.data.world} clickableIds={dataState.data.countryIds} />
        </>
      )}
    </section>
  );
}

export default GameScreen;
