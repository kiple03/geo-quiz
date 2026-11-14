import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import AppShell from './AppShell';

let crash = false;

/** A home screen that crashes while `crash` is set. */
function FlakyHome() {
  if (crash) throw new Error('Boom');
  return <h1>Home works</h1>;
}

afterEach(() => {
  crash = false;
  vi.restoreAllMocks();
});

describe('AppShell error handling', () => {
  it('recovers from a crash on "/" via "Back to menu", although the path stays the same', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    crash = true;
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<FlakyHome />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();

    crash = false;
    await user.click(screen.getByRole('link', { name: 'Back to menu' }));
    expect(screen.getByRole('heading', { name: 'Home works' })).toBeInTheDocument();
  });
});
