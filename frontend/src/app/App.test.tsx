import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fixtureGameData } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

describe('App routing', () => {
  it('shows the main menu with a link per game mode', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Geo Quiz' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /find the country/i })).toHaveAttribute(
      'href',
      '/play/map-click',
    );
  });

  it('offers a region that applies to every game link', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const link = () => screen.getByRole('link', { name: /find the country/i });
    expect(screen.getByRole('radio', { name: 'Whole world' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Africa' }));
    expect(screen.getByRole('radio', { name: 'Africa' })).toBeChecked();
    expect(link()).toHaveAttribute('href', '/play/map-click?region=africa');

    await user.click(screen.getByRole('radio', { name: 'Whole world' }));
    expect(link()).toHaveAttribute('href', '/play/map-click');
  });

  it('reads the chosen region from its URL, e.g. after "Back to menu"', () => {
    renderApp('/?region=asia');
    expect(screen.getByRole('radio', { name: 'Asia' })).toBeChecked();
    expect(screen.getByRole('link', { name: /find the country/i })).toHaveAttribute(
      'href',
      '/play/map-click?region=asia',
    );
  });

  it('opens the game screen from the menu and goes back via the header', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.click(screen.getByRole('link', { name: /find the country/i }));
    expect(screen.getByRole('heading', { name: 'Find the country' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Geo Quiz' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Geo Quiz' })).toBeInTheDocument();
  });

  it('shows an error for an unknown game mode', () => {
    renderApp('/play/does-not-exist');
    expect(screen.getByRole('heading', { name: 'Unknown game mode' })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown paths', () => {
    renderApp('/some/where');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('Game screen data loading', () => {
  it('shows a loading state, then the loaded data', async () => {
    renderApp('/play/map-click');
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByRole('application', { name: 'World map' })).toBeInTheDocument();
  });

  it('shows the error and recovers when "Try again" succeeds', async () => {
    const user = userEvent.setup();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('Could not load countries.json (HTTP 500)'))
      .mockResolvedValue(fixtureGameData);
    renderApp('/play/map-click', { load });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load countries.json (HTTP 500)');

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('application', { name: 'World map' })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
