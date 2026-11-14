import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  it('shows the main menu with a link per game mode', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Geo Quiz' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /find the country/i })).toHaveAttribute(
      'href',
      '/play/map-click',
    );
  });

  it('opens the game screen from the menu and goes back via the header', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(screen.getByRole('link', { name: /find the country/i }));
    expect(screen.getByRole('heading', { name: 'Find the country' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Geo Quiz' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Geo Quiz' })).toBeInTheDocument();
  });

  it('shows an error for an unknown game mode', () => {
    renderAt('/play/does-not-exist');
    expect(screen.getByRole('heading', { name: 'Unknown game mode' })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown paths', () => {
    renderAt('/some/where');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
