import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Country } from '../../../data/types';
import { fixtureCountries } from '../../../test/fixtures';
import { renderApp } from '../../../test/renderApp';
import { DEFAULT_AUTO_ADVANCE_MS } from '../../engine/types';

const base = fixtureCountries[0];
const countries: Country[] = [
  { ...base, id: 'AAA', name: 'Alphaland', region: 'Europe' },
  { ...base, id: 'BBB', name: 'Betaland', region: 'Africa' },
  { ...base, id: 'CCC', name: 'Gammaland', region: 'Europe' },
  { ...base, id: 'DDD', name: 'Deltaland', region: 'Africa' },
  { ...base, id: 'EEE', name: 'Epsilonia', region: 'Africa' },
];

/** The country whose flag is asked, read from the image (its alt text is neutral). */
const askedCountry = () => {
  const src = screen.getByRole('img', { name: 'The flag to name' }).getAttribute('src')!;
  return countries.find((c) => src.endsWith(`/${c.id}.svg`))!;
};
const option = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

async function startGame(path = '/play/flag-name') {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderApp(path, { loaders: { countries: () => Promise.resolve(countries) } });
  const group = await screen.findByRole('group', { name: 'Country with this flag' });
  await waitFor(() => expect(group.querySelector('button')).toHaveFocus());
  return { user };
}

describe('Name the flag game', () => {
  it('plays a round with the number keys', async () => {
    const { user } = await startGame();
    for (let i = 0; i < 5; i++) {
      const buttons = screen.getAllByRole('button').filter((b) => b.closest('.choices'));
      const index = buttons.findIndex((b) => b.textContent?.includes(askedCountry().name));
      await user.keyboard(String(index + 1));
      expect(screen.getByRole('status')).toHaveTextContent(/^Correct! This is the flag of/);
      await act(() => vi.advanceTimersByTime(DEFAULT_AUTO_ADVANCE_MS));
    }
    expect(screen.getByText(/You got/)).toHaveTextContent('You got 5 of 5 right.');
    // The results name each country, with its flag.
    const rows = screen.getAllByRole('listitem');
    expect(rows[0].querySelector('img.flag')).not.toBeNull();
  });

  it('shows no flags next to the options', async () => {
    await startGame();
    const group = screen.getByRole('group', { name: 'Country with this flag' });
    expect(group.querySelector('img')).toBeNull();
  });

  it('names the flag, and shows the picked one, after a wrong answer', async () => {
    const { user } = await startGame();
    const asked = askedCountry();
    const wrong = countries.find(
      (c) => c.id !== asked.id && screen.queryByRole('button', { name: c.name }),
    )!;

    await user.click(option(wrong.name));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      `Not quite: this is the flag of ${asked.name}. The flag of ${wrong.name} looks like this.`,
    );
    expect(status.querySelector(`img[src$="/${wrong.id}.svg"]`)).not.toBeNull();
    expect(screen.getByRole('img', { name: `Flag of ${asked.name}` })).toBeInTheDocument();
  });
});
