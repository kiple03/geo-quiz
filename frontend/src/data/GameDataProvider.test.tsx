import { render, screen } from '@testing-library/react';
import { fixtureGameData } from '../test/fixtures';
import { useGameData } from './gameDataContext';
import { GameDataProvider } from './GameDataProvider';

function Status() {
  const state = useGameData();
  return <p>{state.status}</p>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GameDataProvider', () => {
  it('loads once and passes the abort signal to the loader', async () => {
    const load = vi.fn((signal: AbortSignal) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve(fixtureGameData);
    });
    render(
      <GameDataProvider load={load}>
        <Status />
      </GameDataProvider>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('aborts the load when unmounted and ignores its result', async () => {
    let signal: AbortSignal | undefined;
    const load = (s: AbortSignal) => {
      signal = s;
      return new Promise<never>(() => {});
    };
    const { unmount } = render(
      <GameDataProvider load={load}>
        <Status />
      </GameDataProvider>,
    );
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('throws a clear error when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Status />)).toThrow(/inside <GameDataProvider>/);
  });
});
