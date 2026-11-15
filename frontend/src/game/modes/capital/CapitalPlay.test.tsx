import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Country } from '../../../data/types';
import { fixtureCountries, fixtureLoaders } from '../../../test/fixtures';
import { renderApp } from '../../../test/renderApp';
import { DEFAULT_AUTO_ADVANCE_MS } from '../../engine/types';

// Four countries with capitals, so every question has four options; two in Europe and
// two in Africa for the region test. Kingston twice, like Jamaica and Norfolk Island.
const base = fixtureCountries[0];
const countries: Country[] = [
  { ...base, id: 'AAA', name: 'Alphaland', region: 'Europe', capitals: ['Alpha City'] },
  { ...base, id: 'BBB', name: 'Betaland', region: 'Africa', capitals: ['Kingston'] },
  { ...base, id: 'CCC', name: 'Gammaland', region: 'Europe', capitals: ['Gamma Town'] },
  { ...base, id: 'DDD', name: 'Deltaland', region: 'Africa', capitals: ['Delta Port'] },
  { ...base, id: 'EEE', name: 'Epsilonia', region: 'Africa', capitals: ['Kingston'] },
  { ...base, id: 'NOC', name: 'No Capital Land', region: 'Africa', capitals: [] },
];
const capitalOf = new Map(countries.map((c) => [c.name, c.capitals[0]]));

const askedCountry = () => {
  const name = screen.getByText(/^Name the capital of/).querySelector('strong')?.textContent;
  if (!name) throw new Error('no prompt');
  return name;
};
const option = (name: string | RegExp) => screen.getByRole('button', { name });
/** The capitals offered for the current question, in order. */
const optionLabels = () =>
  [...screen.getByRole('group', { name: /^Capital of/ }).querySelectorAll('.choice-label')].map(
    (el) => el.textContent ?? '',
  );

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

async function startGame(path = '/play/capital') {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const world = vi.fn(fixtureLoaders.world);
  renderApp(path, { loaders: { countries: () => Promise.resolve(countries), world } });
  const group = await screen.findByRole('group', { name: /^Capital of/ });
  // Focus is moved by an effect that can run after the options appear.
  await waitFor(() => expect(group.querySelector('button')).toHaveFocus());
  return { user, world };
}

describe('Capital game', () => {
  it('plays a round without loading the map', async () => {
    const { user, world } = await startGame();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
    expect(screen.queryByText(/No Capital Land/)).not.toBeInTheDocument();

    for (let i = 0; i < 5; i++) {
      await user.click(option(capitalOf.get(askedCountry())!));
      expect(screen.getByRole('status')).toHaveTextContent(/^Correct!/);
      await act(() => vi.advanceTimersByTime(DEFAULT_AUTO_ADVANCE_MS));
    }
    expect(screen.getByText(/You got/)).toHaveTextContent('You got 5 of 5 right.');
    expect(world).not.toHaveBeenCalled();
  });

  it('never offers the same capital twice', async () => {
    await startGame();
    const labels = optionLabels();
    expect(labels).toHaveLength(4);
    expect(new Set(labels).size).toBe(4);
  });

  it('explains a wrong answer and waits for "Next"', async () => {
    const { user } = await startGame();
    const asked = askedCountry();
    const right = capitalOf.get(asked)!;
    expect(screen.getByRole('group', { name: `Capital of ${asked}` })).toBeInTheDocument();
    const wrong = optionLabels().find((label) => label !== right)!;

    await user.click(option(wrong));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/^Not quite: .+ is the capital of .+\./);
    expect(status).toHaveTextContent(`The capital of ${asked} is ${right}.`);
    expect(option(`${wrong}, your answer`)).toBeInTheDocument();
    expect(option(`${right}, right answer`)).toBeInTheDocument();

    await act(() => vi.advanceTimersByTime(DEFAULT_AUTO_ADVANCE_MS * 2));
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus();
  });

  it('can be played with the number keys, with focus back on the options each question', async () => {
    const { user } = await startGame();
    const answerByKey = () =>
      user.keyboard(String(optionLabels().indexOf(capitalOf.get(askedCountry())!) + 1));

    await answerByKey();
    expect(screen.getByRole('status')).toHaveTextContent(/^Correct!/);
    // Auto-advance removes the focused "Next" button; focus goes back to the options.
    await act(() => vi.advanceTimersByTime(DEFAULT_AUTO_ADVANCE_MS));
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
    const group = screen.getByRole('group', { name: /^Capital of/ });
    expect(group.querySelector('button')).toHaveFocus();

    await answerByKey();
    expect(screen.getByRole('status')).toHaveTextContent(/^Correct!/);
  });

  it('keeps the feedback when Enter is held down on an option', async () => {
    const { user } = await startGame();
    await user.keyboard('{Enter>4/}');
    expect(screen.getByRole('status')).not.toHaveTextContent('');
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
  });

  it('asks only about the chosen region', async () => {
    await startGame('/play/capital?region=europe');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Name the capital · Europe',
    );
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    expect(['Alphaland', 'Gammaland']).toContain(askedCountry());
  });
});
