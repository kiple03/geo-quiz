import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from '../app/App';
import { GameDataProvider } from '../data/GameDataProvider';
import type { GameData } from '../data/load';
import { fixtureGameData } from './fixtures';

interface RenderAppOptions {
  /** Replaces data loading; defaults to resolving with the fixture data. */
  load?: (signal: AbortSignal) => Promise<GameData>;
}

/** Renders the whole app at `path`, with the same providers as main.tsx. */
export function renderApp(path = '/', { load }: RenderAppOptions = {}) {
  const loader = load ?? (() => Promise.resolve(fixtureGameData));
  return render(
    <GameDataProvider load={loader}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </GameDataProvider>,
  );
}
