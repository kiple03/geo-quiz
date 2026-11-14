import { Link, useSearchParams } from 'react-router';
import { gameModes } from '../game/modes/registry';
import { findRegionByName, REGIONS } from '../game/regions';
import { roundConfigFromSearch, roundSearchFor } from '../game/settings';
import './MainMenu.css';

const WORLD = '';

/**
 * Start screen: a region choice that applies to every game, then one entry per
 * registered game mode. The choice lives in the URL (`/?region=europe`), like the
 * game's own settings (ADR 0006), so "Back" from a game keeps it.
 */
function MainMenu() {
  const [searchParams, setSearchParams] = useSearchParams();
  // The same parsing as the game screen. The menu offers one region at a time; a link
  // with several (e.g. back from such a round) checks none but keeps them all.
  const { regions } = roundConfigFromSearch('', searchParams);
  const checked =
    regions.length === 0 ? WORLD : regions.length === 1 ? findRegionByName(regions[0])?.slug : null;
  const search = roundSearchFor({ regions });

  const choose = (slug: string) =>
    setSearchParams(slug === WORLD ? {} : { region: slug }, { replace: true });

  const options = [{ slug: WORLD, label: 'Whole world' }, ...REGIONS];

  return (
    <section className="main-menu">
      <h1>Geo Quiz</h1>
      <p className="main-menu-intro">How well do you know the world map? Pick a game.</p>
      <fieldset className="region-picker">
        <legend className="region-picker-legend">Region</legend>
        <div className="region-picker-options">
          {options.map(({ slug, label }) => (
            <label key={slug} className="region-option">
              <input
                type="radio"
                name="region"
                value={slug}
                checked={checked === slug}
                onChange={() => choose(slug)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <ul className="mode-list">
        {gameModes.map((mode) => (
          <li key={mode.id}>
            <Link className="mode-card" to={{ pathname: `/play/${mode.id}`, search }}>
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
