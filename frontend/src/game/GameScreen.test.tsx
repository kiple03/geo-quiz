import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_AUTO_ADVANCE_MS } from './engine/types';
import { fixtureCountries } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// The fixture has two countries (Alphaland = AAA, Betaland = BBB) and neutral land
// (NEU), so a round has two questions in random order.
const idByName = new Map(fixtureCountries.map((c) => [c.name, c.id]));

function shape(id: string): Element {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) throw new Error(`no shape ${id}`);
  return el;
}

/** The id of the country the prompt asks for, and the id of the other one. */
function currentTargets() {
  const name = screen.getByText(/^Click on/).querySelector('strong')?.textContent ?? '';
  const target = idByName.get(name);
  if (!target) throw new Error(`unexpected prompt: ${name}`);
  return { target, other: target === 'AAA' ? 'BBB' : 'AAA' };
}

/** Lets the auto-advance pause after a correct answer run out. */
const waitForAutoAdvance = () => act(() => vi.advanceTimersByTime(DEFAULT_AUTO_ADVANCE_MS));

// Fake timers so the auto-advance pause can be skipped; shouldAdvanceTime keeps
// promises and findBy* queries working.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

async function startGame() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderApp('/play/map-click');
  await screen.findByRole('img', { name: 'World map' });
  return user;
}

describe('Map-click game', () => {
  it('plays a full round: right, wrong, results, play again', async () => {
    const user = await startGame();

    // Question 1: click the right country; the game moves on by itself.
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    const first = currentTargets();
    await user.click(shape(first.target));
    expect(screen.getByRole('status')).toHaveTextContent(/^Correct!/);
    expect(shape(first.target)).toHaveClass('world-map__shape--correct');
    expect(screen.getByText(/^Score:/)).toHaveTextContent('Score: 1');

    // While feedback is shown, the map ignores clicks.
    await user.click(shape(first.other));
    expect(screen.getByText(/^Score:/)).toHaveTextContent('Score: 1');

    await waitForAutoAdvance();
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();

    // The first country stays marked as answered correctly.
    expect(shape(first.target)).toHaveClass('world-map__shape--past-correct');

    // Question 2: click the wrong country; the game waits for "See results".
    const second = currentTargets();
    expect(second.target).toBe(first.other);
    await user.click(shape(second.other));
    expect(screen.getByRole('status')).toHaveTextContent(/^Not quite/);
    expect(shape(second.other)).toHaveClass('world-map__shape--wrong');
    expect(shape(second.target)).toHaveClass('world-map__shape--reveal');

    await waitForAutoAdvance();
    expect(screen.getByRole('status')).toHaveTextContent(/^Not quite/);

    // Results.
    await user.click(screen.getByRole('button', { name: 'See results' }));
    expect(screen.getByRole('heading', { name: 'Round complete' })).toBeInTheDocument();
    expect(screen.getByText(/You got/)).toHaveTextContent('You got 1 of 2 right.');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    // Play again starts a fresh round.
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    expect(screen.getByText(/^Score:/)).toHaveTextContent('Score: 0');
  });

  it('keeps a missed country marked for the rest of the round', async () => {
    const user = await startGame();

    const first = currentTargets();
    await user.click(shape(first.other));
    await user.click(screen.getByRole('button', { name: 'Next question' }));

    // The missed country is marked; the wrongly clicked one is back to normal.
    expect(shape(first.target)).toHaveClass('world-map__shape--past-wrong');
    expect(shape(first.other)).not.toHaveClass('world-map__shape--wrong');
  });

  it('moves on at once when "Next" is clicked during the pause', async () => {
    const user = await startGame();

    await user.click(shape(currentTargets().target));
    await user.click(screen.getByRole('button', { name: 'Next question' }));
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();

    // The cancelled timer does not skip question 2.
    await waitForAutoAdvance();
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
  });

  it('ignores clicks on neutral land', async () => {
    const user = await startGame();

    await user.click(shape('NEU'));
    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(screen.queryByRole('button', { name: 'Next question' })).not.toBeInTheDocument();
  });

  it('goes to the results by itself after a correct last answer, then back to the menu', async () => {
    const user = await startGame();

    for (let i = 0; i < 2; i++) {
      await user.click(shape(currentTargets().target));
      await waitForAutoAdvance();
    }
    expect(screen.getByText(/You got/)).toHaveTextContent('You got 2 of 2 right.');

    await user.click(screen.getByRole('link', { name: 'Back to menu' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Geo Quiz' })).toBeInTheDocument();
  });
});
