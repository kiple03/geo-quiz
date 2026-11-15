import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from '../app/App';
import { GameDataProvider } from '../data/GameDataProvider';
import type { DatasetLoaders } from '../data/load';
import { fixtureLoaders } from './fixtures';

interface RenderAppOptions {
  /** Replaces some dataset loaders; the others resolve with the fixture data. */
  loaders?: Partial<DatasetLoaders>;
}

/** Renders the whole app at `path`, with the same providers as main.tsx. */
export function renderApp(path = '/', { loaders }: RenderAppOptions = {}) {
  return render(
    <GameDataProvider loaders={{ ...fixtureLoaders, ...loaders }}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </GameDataProvider>,
  );
}
