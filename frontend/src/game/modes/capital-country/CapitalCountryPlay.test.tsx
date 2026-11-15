import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Country } from '../../../data/types';
import { fixtureCountries, fixtureLoaders } from '../../../test/fixtures';
import { renderApp } from '../../../test/renderApp';
import { DEFAULT_AUTO_ADVANCE_MS } from '../../engine/types';

// Two shared Kingstons (like Jamaica and Norfolk Island), one country with three
// capitals (like South Africa), and one without a capital that is never asked.
const base = fixtureCountries[0];
const countries: Country[] = [
  { ...base, id: 'AAA', name: 'Alphaland', region: 'Europe', capitals: ['Alpha City'] },
  { ...base, id: 'BBB', name: 'Betaland', region: 'Africa', capitals: ['Kingston'] },
  { ...base, id: 'CCC', name: 'Gammaland', region: 'Europe', capitals: ['Gamma Town'] },
  {
    ...base,
    id: 'DDD',
    name: 'Deltaland',
    region: 'Africa',
    capitals: ['Delta Port', 'Delta Hill', 'Delta Bay'],
  },
  { ...base, id: 'EEE', name: 'Epsilonia', region: 'Africa', capitals: ['Kingston'] },
  { ...base, id: 'FFF', name: 'Zetaland', region: 'Africa', capitals: ['Zeta'] },
  { ...base, id: 'NOC', name: 'No Capital Land', region: 'Africa', capitals: [] },
];

/** The asked capital, from the prompt. */
const askedCapital = () => {
  const capital = screen.getByText(/^Which country has the capital/).querySelector('strong');
  if (!capital?.textContent) throw new Error('no prompt');
  return capital.textContent;
};
/** The country names offered for the current question, in order. */
const optionLabels = () =>
  [
    ...screen
      .getByRole('group', { name: /^Country with the capital/ })
      .querySelectorAll('.choice-label'),
  ].map((el) => el.textContent ?? '');
/** The right option among those shown: the one country with the asked capital. */
const rightAnswer = () => {
  const capital = askedCapital();
  const matches = optionLabels().filter((label) =>
    countries.find((c) => c.name === label)?.capitals.includes(capital),
  );
  expect(matches).toHaveLength(1);
  return matches[0];
};
const option = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

async function startGame(path = '/play/capital-country') {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const world = vi.fn(fixtureLoaders.world);
  renderApp(path, { loaders: { countries: () => Promise.resolve(countries), world } });
  const group = await screen.findByRole('group', { name: /^Country with the capital/ });
  await waitFor(() => expect(group.querySelector('button')).toHaveFocus());
  return { user, world };
}

describe('Whose capital? game', () => {
  it('plays a round with the number keys, without loading the map', async () => {
    const { user, world } = await startGame();
    expect(screen.getByText('Question 1 of 6')).toBeInTheDocument();
    const asked: string[] = [];
    for (let i = 0; i < 6; i++) {
      asked.push(askedCapital());
      // Exactly one option has the asked capital, also when it is Kingston.
      await user.keyboard(String(optionLabels().indexOf(rightAnswer()) + 1));
      expect(screen.getByRole('status')).toHaveTextContent(/^Correct! The capital of/);
      await act(() => vi.advanceTimersByTime(DEFAULT_AUTO_ADVANCE_MS));
    }
    expect(screen.getByText(/You got/)).toHaveTextContent('You got 6 of 6 right.');
    // Every country once; Deltaland by its first capital only.
    expect(asked.sort()).toEqual(
      ['Alpha City', 'Delta Port', 'Gamma Town', 'Kingston', 'Kingston', 'Zeta'].sort(),
    );
    expect(screen.queryByText(/No Capital Land/)).not.toBeInTheDocument();
    expect(world).not.toHaveBeenCalled();
    // The results name each country, with its flag.
    expect(screen.getAllByRole('listitem')[0].querySelector('img.flag')).not.toBeNull();
  });

  it('shows no flags before answering', async () => {
    await startGame();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('explains a wrong answer, with every capital of the asked country', async () => {
    const { user } = await startGame();
    const capital = askedCapital();
    const right = rightAnswer();
    const wrong = optionLabels().find((label) => label !== right)!;
    const wrongCountry = countries.find((c) => c.name === wrong)!;
    const rightCountry = countries.find((c) => c.name === right)!;

    await user.click(option(wrong));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      `Not quite: the capital of ${wrong} is ${wrongCountry.capitals[0]}.`,
    );
    expect(status).toHaveTextContent(`The capital of ${right} is ${capital}`);
    if (rightCountry.id === 'DDD') {
      expect(status).toHaveTextContent('Delta Port (also Delta Hill and Delta Bay)');
    }
    expect(status.querySelector(`img[src$="/${rightCountry.id}.svg"]`)).not.toBeNull();
    expect(option(`${wrong}, your answer`)).toBeInTheDocument();
    expect(option(`${right}, right answer`)).toBeInTheDocument();
  });

  it('asks only about the chosen region', async () => {
    await startGame('/play/capital-country?region=europe');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Whose capital? · Europe');
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    expect(['Alpha City', 'Gamma Town']).toContain(askedCapital());
  });
});
