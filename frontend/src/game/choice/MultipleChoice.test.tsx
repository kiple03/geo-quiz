import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultipleChoice from './MultipleChoice';

const options = [
  { id: 'SWE', label: 'Stockholm' },
  { id: 'NOR', label: 'Oslo' },
  { id: 'DNK', label: 'Copenhagen' },
  { id: 'FIN', label: 'Helsinki' },
];

function renderChoice(chosenId?: string) {
  const onChoose = vi.fn();
  const view = render(
    <MultipleChoice
      label="Capital of Norway"
      options={options}
      correctId="NOR"
      chosenId={chosenId}
      onChoose={onChoose}
    />,
  );
  return { onChoose, ...view };
}

const option = (name: string | RegExp) => screen.getByRole('button', { name });

describe('MultipleChoice', () => {
  it('shows the options in a named group, with the first one as the focus target', () => {
    renderChoice();
    const group = screen.getByRole('group', { name: 'Capital of Norway' });
    const buttons = screen.getAllByRole('button');
    expect(group).toContainElement(buttons[0]);
    expect(buttons.map((b) => b.textContent)).toEqual([
      '1Stockholm',
      '2Oslo',
      '3Copenhagen',
      '4Helsinki',
    ]);
    expect(buttons[0]).toHaveAttribute('data-autofocus');
    expect(buttons[1]).not.toHaveAttribute('data-autofocus');
  });

  it('answers with the clicked option', async () => {
    const user = userEvent.setup();
    const { onChoose } = renderChoice();
    await user.click(option('Copenhagen'));
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('DNK');
  });

  it('answers with Enter or Space on release, once', async () => {
    const user = userEvent.setup();
    const { onChoose } = renderChoice();
    option('Oslo').focus();
    await user.keyboard('{Enter>3/}');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('NOR');

    onChoose.mockClear();
    option('Helsinki').focus();
    await user.keyboard(' ');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('FIN');
  });

  it('ignores a key released here that was pressed elsewhere', async () => {
    // E.g. Enter on "Next question", after which focus lands on the first option.
    const user = userEvent.setup();
    const { onChoose } = renderChoice();
    option('Stockholm').focus();
    await user.keyboard('{/Enter}');
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('answers with the number keys', async () => {
    const user = userEvent.setup();
    const { onChoose } = renderChoice();
    option('Stockholm').focus();
    await user.keyboard('4');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('FIN');
    await user.keyboard('9');
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it('shows nothing about the right answer while asking', () => {
    renderChoice();
    expect(screen.queryByText(/answer/)).not.toBeInTheDocument();
  });

  it('marks a right pick with text, and ignores further picks', async () => {
    const user = userEvent.setup();
    const { onChoose } = renderChoice('NOR');
    expect(option('Oslo, your answer')).toHaveClass('choice--correct');
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-disabled', 'true');
    }
    await user.click(option(/Stockholm/));
    option(/Stockholm/).focus();
    await user.keyboard('2{Enter}');
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('marks a wrong pick and reveals the right answer, with text', () => {
    renderChoice('SWE');
    expect(option('Stockholm, your answer')).toHaveClass('choice--wrong');
    expect(option('Oslo, right answer')).toHaveClass('choice--correct');
    expect(option('Copenhagen')).toHaveClass('choice--other');
  });

  describe('with pictures as options', () => {
    const pictures = options.map((o, i) => ({
      ...o,
      askingLabel: `Picture ${i + 1}`,
      content: <img src={`${o.id}.svg`} alt="" />,
    }));
    const renderPictures = (chosenId?: string) =>
      render(
        <MultipleChoice
          label="Capital of Norway"
          options={pictures}
          correctId="NOR"
          chosenId={chosenId}
          onChoose={vi.fn()}
        />,
      );

    it('names the options neutrally and hides the labels while asking', () => {
      renderPictures();
      const buttons = screen.getAllByRole('button');
      expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
        'Picture 1',
        'Picture 2',
        'Picture 3',
        'Picture 4',
      ]);
      expect(screen.queryByText('Oslo')).not.toBeInTheDocument();
      expect(buttons[1].querySelector('img')).toHaveAttribute('src', 'NOR.svg');
      expect(screen.getByRole('group')).toHaveClass('choices--media');
    });

    it('shows and reads every label once answered', () => {
      renderPictures('SWE');
      expect(option('Stockholm, your answer')).toHaveClass('choice--wrong');
      expect(option('Oslo, right answer')).toHaveClass('choice--correct');
      expect(option('Copenhagen')).toHaveTextContent('Copenhagen');
    });
  });
});
