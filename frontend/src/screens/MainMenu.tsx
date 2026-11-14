import { Link } from 'react-router';
import { gameModes } from '../game/modes/registry';
import './MainMenu.css';

/** Start screen: one entry per registered game mode. */
function MainMenu() {
  return (
    <section className="main-menu">
      <h1>Geo Quiz</h1>
      <p className="main-menu-intro">How well do you know the world map? Pick a game.</p>
      <ul className="mode-list">
        {gameModes.map((mode) => (
          <li key={mode.id}>
            <Link className="mode-card" to={`/play/${mode.id}`}>
              <span className="mode-card-title">{mode.title}</span>
              <span className="mode-card-description">{mode.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default MainMenu;
