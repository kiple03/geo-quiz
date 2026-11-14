import { Link } from 'react-router';
import { gameModes } from '../game/modes/registry';

/** Start screen: one entry per registered game mode. */
function MainMenu() {
  return (
    <section>
      <h1>Geo Quiz</h1>
      <p>Test your geography knowledge. Pick a game:</p>
      <ul className="mode-list">
        {gameModes.map((mode) => (
          <li key={mode.id}>
            <Link className="mode-card" to={`/play/${mode.id}`}>
              <strong>{mode.title}</strong>
              <span>{mode.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default MainMenu;
