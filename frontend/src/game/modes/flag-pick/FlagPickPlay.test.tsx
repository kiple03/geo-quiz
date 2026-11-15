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
  // Flies Australia's flag in the real data, so it is never asked.
  { ...base, id: 'HMD', name: 'Heard Island', region: 'Antarctic' },
];
const idOf = new Map(countries.map((c) => [c.name, c.id]));

const askedCountry = () => {
  const name = screen.getByText(/^Pick the flag of/).querySelector('strong')?.textContent;
  if (!name) throw new Error('no prompt');
  return name;
};
const group = () => screen.getByRole('group', { name: /^Flag of/ });
/** The option button showing a country's flag, found by its image. */
const optionFor = (name: string) => {
  const img = group().querySelector(`img[src$="/${idOf.get(name)}.svg"]`);
  const button = img?.closest('button');
  if (!button) throw new Error(`no option for ${name}`);
  return button;
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

async function startGame() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderApp('/play/flag-pick', { loaders: { countries: () => Promise.resolve(countries) } });
  const options = await screen.findByRole('group', { name: /^Flag of/ });
  await waitFor(() => expect(options.querySelector('button')).toHaveFocus());
  return { user };
}

describe('Pick the flag game', () => {
  it('plays a round, never asking about a shared flag', async () => {
    const { user } = await startGame();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    for (let i = 0; i < 5; i++) {
      expect(askedCountry()).not.toBe('Heard Island');
      await user.click(optionFor(askedCountry()));
      expect(screen.getByRole('status')).toHaveTextContent(/^Correct!/);
      await act(() => vi.advanceTimersByTime(DEFAULT_AUTO_ADVANCE_MS));
    }
    expect(screen.getByText(/You got/)).toHaveTextContent('You got 5 of 5 right.');
  });

  it('gives nothing away while asking: no flag by the name, neutral option names', async () => {
    await startGame();
    const asked = askedCountry();
    expect(screen.getByText(/^Pick the flag of/).querySelector('img')).toBeNull();
    const names = [...group().querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Flag 1', 'Flag 2', 'Flag 3', 'Flag 4']);
    expect(group()).not.toHaveTextContent(asked);
    for (const img of group().querySelectorAll('img')) expect(img).toHaveAttribute('alt', '');
  });

  it('names every flag after a wrong answer', async () => {
    const { user } = await startGame();
    const asked = askedCountry();
    const wrong = [...group().querySelectorAll('img')]
      .map((img) => countries.find((c) => img.getAttribute('src')!.endsWith(`/${c.id}.svg`))!)
      .find((c) => c.name !== asked)!;

    await user.click(optionFor(wrong.name));
    expect(screen.getByRole('status')).toHaveTextContent(
      `Not quite: that is the flag of ${wrong.name}. The flag of ${asked} is marked.`,
    );
    expect(screen.getByRole('button', { name: `${wrong.name}, your answer` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${asked}, right answer` })).toBeInTheDocument();
  });
});
