import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { fixtureGameData } from '../test/fixtures';
import type { RoundConfig } from './engine/types';
import { mapClickMode } from './modes/map-click/mode';
import type { GameMode, PlayProps } from './modes/types';
import RoundView from './RoundView';

const config: RoundConfig = {
  modeId: 'test',
  questionCount: 2,
  autoAdvanceMs: null,
  regions: [],
};

/** A mode with local state, like a future "type the answer" mode. */
function TypingPlay({ onAnswer }: PlayProps) {
  const [text, setText] = useState('');
  return (
    <>
      <input aria-label="Answer" value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" onClick={() => onAnswer(text)}>
        Submit
      </button>
    </>
  );
}

const typingMode: GameMode = { ...mapClickMode, id: 'typing', Play: TypingPlay };

function renderRound(mode: GameMode, roundConfig: RoundConfig) {
  return render(
    <MemoryRouter>
      <RoundView mode={mode} data={fixtureGameData} config={roundConfig} onPlayAgain={() => {}} />
    </MemoryRouter>,
  );
}

describe('RoundView', () => {
  it('shows a message instead of crashing when no questions match', () => {
    renderRound(mapClickMode, { ...config, regions: ['Nowhere'] });
    expect(screen.getByRole('alert')).toHaveTextContent('No questions match these settings');
    expect(screen.getByRole('link', { name: 'Back to menu' })).toBeInTheDocument();
  });

  it("gives each question a fresh Play component, so a mode's state resets", async () => {
    const user = userEvent.setup();
    renderRound(typingMode, config);

    await user.type(screen.getByRole('textbox', { name: 'Answer' }), 'Alphaland');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await user.click(screen.getByRole('button', { name: 'Next question' }));

    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('');
  });
});
