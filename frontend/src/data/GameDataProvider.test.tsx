import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { fixtureCountries, fixtureLoaders, fixtureWorld } from '../test/fixtures';
import { useGameData } from './gameDataContext';
import { GameDataProvider } from './GameDataProvider';
import type { ExtraDatasetId } from './load';

/** Shows the state of `useGameData(extra)`, with the datasets it got when ready. */
function Status({ name, extra }: { name: string; extra?: readonly ExtraDatasetId[] }) {
  const state = useGameData(extra);
  let text: string = state.status;
  if (state.status === 'ready') {
    text += `: ${state.data.countries.length} countries, ${Object.keys(state.data.datasets).join(',') || 'nothing else'}`;
  }
  if (state.status === 'error') {
    return (
      <p>
        {name} error: {state.error.message}
        <button type="button" onClick={state.retry}>
          Retry {name}
        </button>
      </p>
    );
  }
  return (
    <p>
      {name} {text}
    </p>
  );
}

function spyLoaders() {
  return {
    countries: vi.fn(fixtureLoaders.countries),
    world: vi.fn(fixtureLoaders.world),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GameDataProvider', () => {
  it('starts loading the countries when it mounts, but nothing else', () => {
    const loaders = spyLoaders();
    render(<GameDataProvider loaders={loaders}>no screens</GameDataProvider>);
    expect(loaders.countries).toHaveBeenCalledTimes(1);
    expect(loaders.world).not.toHaveBeenCalled();
  });

  it('gives the countries alone to a screen that needs nothing else', async () => {
    const loaders = spyLoaders();
    render(
      <GameDataProvider loaders={loaders}>
        <Status name="A" />
      </GameDataProvider>,
    );
    expect(screen.getByText('A loading')).toBeInTheDocument();
    expect(await screen.findByText('A ready: 2 countries, nothing else')).toBeInTheDocument();
    expect(loaders.world).not.toHaveBeenCalled();
  });

  it('loads an extra dataset when first asked for, once for all screens', async () => {
    const loaders = spyLoaders();
    render(
      <StrictMode>
        <GameDataProvider loaders={loaders}>
          <Status name="A" extra={['world']} />
          <Status name="B" extra={['world']} />
        </GameDataProvider>
      </StrictMode>,
    );
    expect(await screen.findByText('A ready: 2 countries, world')).toBeInTheDocument();
    expect(screen.getByText('B ready: 2 countries, world')).toBeInTheDocument();
    expect(loaders.countries).toHaveBeenCalledTimes(1);
    expect(loaders.world).toHaveBeenCalledTimes(1);
  });

  it('keeps a loaded dataset for later screens', async () => {
    const loaders = spyLoaders();
    const { rerender } = render(
      <GameDataProvider loaders={loaders}>
        <Status name="A" extra={['world']} />
      </GameDataProvider>,
    );
    await screen.findByText('A ready: 2 countries, world');
    rerender(
      <GameDataProvider loaders={loaders}>
        <Status name="B" extra={['world']} />
      </GameDataProvider>,
    );
    // Ready at once, without loading again.
    expect(screen.getByText('B ready: 2 countries, world')).toBeInTheDocument();
    expect(loaders.world).toHaveBeenCalledTimes(1);
  });

  it('shows an error and loads only the failed dataset again on retry', async () => {
    const user = userEvent.setup();
    const loaders = {
      countries: vi.fn(() => Promise.resolve(fixtureCountries)),
      world: vi
        .fn()
        .mockRejectedValueOnce(new Error('Could not load world.topo.json (HTTP 503)'))
        .mockResolvedValue(fixtureWorld),
    };
    render(
      <GameDataProvider loaders={loaders}>
        <Status name="A" extra={['world']} />
      </GameDataProvider>,
    );
    expect(
      await screen.findByText('A error: Could not load world.topo.json (HTTP 503)'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry A' }));
    expect(await screen.findByText('A ready: 2 countries, world')).toBeInTheDocument();
    expect(loaders.world).toHaveBeenCalledTimes(2);
    expect(loaders.countries).toHaveBeenCalledTimes(1);
  });

  it('turns a non-Error rejection into an Error', async () => {
    const loaders = { ...fixtureLoaders, countries: () => Promise.reject('offline') };
    render(
      <GameDataProvider loaders={loaders}>
        <Status name="A" />
      </GameDataProvider>,
    );
    expect(await screen.findByText('A error: offline')).toBeInTheDocument();
  });

  it('throws a clear error when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Status name="A" />)).toThrow(/inside <GameDataProvider>/);
  });
});
