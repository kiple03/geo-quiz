import { Link, useParams } from 'react-router';
import { findGameMode } from './modes/registry';

/** Runs one game mode, chosen by the `/play/:modeId` route. */
function GameScreen() {
  const { modeId } = useParams();
  const mode = findGameMode(modeId);

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
      <p>{mode.description}</p>
      <p>The game is not playable yet.</p>
    </section>
  );
}

export default GameScreen;
