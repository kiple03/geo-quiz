import { useRef, type KeyboardEvent } from 'react';
import './MultipleChoice.css';

export interface ChoiceOption {
  /** What is answered when it is picked, e.g. a country id. */
  id: string;
  label: string;
}

interface MultipleChoiceProps {
  /** Names the group for screen readers, e.g. "Capital of Norway". */
  label: string;
  options: readonly ChoiceOption[];
  /** The right option's id; only shown once the question is answered. */
  correctId: string;
  /** The option the player picked, while its feedback is shown; undefined while asking. */
  chosenId: string | undefined;
  onChoose: (id: string) => void;
}

type OptionState = 'open' | 'correct' | 'wrong' | 'other';

/**
 * Shared multiple-choice input (ADR 0007): one button per option, picked by click,
 * Enter or Space, or its number key. After the answer, the right option and a wrong
 * pick are marked with ✓/✗ and text, not only colour (ADR 0005). The first option has
 * `data-autofocus`, so each question starts with focus on the choices.
 */
function MultipleChoice({ label, options, correctId, chosenId, onChoose }: MultipleChoiceProps) {
  const answered = chosenId !== undefined;
  // The option an Enter or Space press started on. It answers on release, not on press:
  // after the answer, focus moves to "Next question", which would otherwise get the
  // auto-repeat of a held key and skip the feedback. A release whose press happened on
  // "Next" (focus came here in between) is ignored for the same reason.
  const pressed = useRef<{ key: string; id: string } | null>(null);

  const choose = (id: string) => {
    if (!answered) onChoose(id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const optionId = (event.target as HTMLElement).dataset.optionId;
    if ((event.key === 'Enter' || event.key === ' ') && optionId !== undefined) {
      event.preventDefault(); // no native click; see `pressed`
      if (!event.repeat) pressed.current = { key: event.key, id: optionId };
      return;
    }
    const number = Number(event.key);
    if (Number.isInteger(number) && number >= 1 && number <= options.length && !event.repeat) {
      event.preventDefault();
      choose(options[number - 1].id);
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    const press = pressed.current;
    if (!press || event.key !== press.key) return;
    pressed.current = null;
    event.preventDefault();
    if ((event.target as HTMLElement).dataset.optionId === press.id) choose(press.id);
  };

  const stateOf = (id: string): OptionState => {
    if (!answered) return 'open';
    if (id === correctId) return 'correct';
    return id === chosenId ? 'wrong' : 'other';
  };

  return (
    <div
      className="choices"
      role="group"
      aria-label={label}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {options.map((option, i) => {
        const state = stateOf(option.id);
        const mark =
          state === 'wrong' || (state === 'correct' && option.id === chosenId)
            ? 'Your answer'
            : state === 'correct'
              ? 'Right answer'
              : null;
        return (
          <button
            key={option.id}
            type="button"
            className={`choice choice--${state}`}
            data-option-id={option.id}
            data-autofocus={i === 0 || undefined}
            // Not `disabled`: that would drop the buttons from the reading order, and
            // the marks below must stay readable.
            aria-disabled={answered || undefined}
            // Spelled out, since adjacent spans can run together ("OsloRight answer").
            aria-label={mark ? `${option.label}, ${mark.toLowerCase()}` : undefined}
            // Mouse, touch and screen readers' own clicks (keys are handled above).
            onClick={() => choose(option.id)}
          >
            <span className="choice-key" aria-hidden="true">
              {i + 1}
            </span>
            <span className="choice-label">{option.label}</span>
            {mark && (
              <span className="choice-mark">
                {state === 'correct' ? '✓' : '✗'} {mark}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default MultipleChoice;
