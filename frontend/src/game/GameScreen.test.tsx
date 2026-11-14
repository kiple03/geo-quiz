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
  await screen.findByRole('application', { name: 'World map' });
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
    expect(document.querySelector(`[data-ring-for="${first.target}"]`)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Next question' }));

    // While the feedback is shown, the right answer was circled; now it is not.
    expect(document.querySelector('[data-ring-for]')).toBeNull();

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

  it('keeps the zoom between questions, and starts the next round on the whole map', async () => {
    const user = await startGame();
    const zoomLevel = () =>
      document.querySelector('.world-map__svg > g')?.getAttribute('transform') ?? '';

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(zoomLevel()).toMatch(/scale\(2\)$/);

    // A miss reveals the answer; at 2× around the middle both fixture countries are
    // already in view, so the zoom stays as the player set it.
    await user.click(shape(currentTargets().other));
    expect(zoomLevel()).toMatch(/scale\(2\)$/);
    await user.click(screen.getByRole('button', { name: 'Next question' }));
    expect(zoomLevel()).toMatch(/scale\(2\)$/);

    await user.click(shape(currentTargets().target));
    await waitForAutoAdvance();
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(zoomLevel()).toMatch(/scale\(1\)$/);
  });

  it('can be played with the keyboard only, with focus back on the map each question', async () => {
    const user = await startGame();
    const map = screen.getByRole('application', { name: 'World map' });
    // Focus starts on the map, so the arrow keys work right away.
    expect(map).toHaveFocus();

    // In the fixture, Alphaland (AAA) is left of Betaland (BBB). The first arrow press
    // starts on Alphaland, the country nearest the middle of the map.
    const answerByKeyboard = async (target: string) => {
      await user.keyboard(target === 'AAA' ? '{ArrowLeft}' : '{ArrowRight}');
      await user.keyboard('{Enter}');
    };

    await user.keyboard('{ArrowRight}');
    await answerByKeyboard(currentTargets().target);
    expect(screen.getByRole('status')).toHaveTextContent(/^Correct!/);

    // Auto-advance removes the focused "Next" button; focus goes back to the map.
    await waitForAutoAdvance();
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('application', { name: 'World map' })).toHaveFocus();

    await answerByKeyboard(currentTargets().target);
    await waitForAutoAdvance();
    expect(screen.getByText(/You got/)).toHaveTextContent('You got 2 of 2 right.');
  });

  it('keeps the feedback after a wrong answer when Enter is held down', async () => {
    const user = await startGame();
    const { other } = currentTargets();
    // The first arrow press lands on Alphaland (AAA); one more step right is Betaland.
    await user.keyboard(other === 'AAA' ? '{ArrowRight}' : '{ArrowRight}{ArrowRight}');
    // Held long enough to auto-repeat, then released. The repeats must not reach the
    // "Next question" button that gets focus after the answer.
    await user.keyboard('{Enter>4/}');
    expect(screen.getByRole('status')).toHaveTextContent(/^Not quite/);
    expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
  });

  it('leaves focus alone if the player moved it out of the round', async () => {
    const user = await startGame();
    await user.click(shape(currentTargets().target));
    screen.getByRole('link', { name: 'Geo Quiz' }).focus();
    await waitForAutoAdvance();
    expect(screen.getByRole('link', { name: 'Geo Quiz' })).toHaveFocus();
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
