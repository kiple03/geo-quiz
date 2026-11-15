import { countryName } from '../../../data/load';
import { FlagImage } from '../../../flags/CountryFlag';
import MultipleChoice from '../../choice/MultipleChoice';
import type { PlayProps } from '../types';

/** One flag question: a country is named, the player picks its flag from four. */
function FlagPickPlay({ data, question, feedback, onAnswer }: PlayProps) {
  const name = countryName(data, question.targetId);
  // While asking, an option is "Flag 2" to screen readers, never its country; the
  // country's name is shown and read once the question is answered (ADR 0008).
  const options = (question.options ?? []).map((id, i) => ({
    id,
    label: countryName(data, id),
    askingLabel: `Flag ${i + 1}`,
    content: <FlagImage id={id} size="fill" />,
  }));

  let message = '';
  if (feedback?.correct) {
    message = `Correct! This is the flag of ${name}.`;
  } else if (feedback) {
    const picked = countryName(data, feedback.answer);
    message = `Not quite: that is the flag of ${picked}. The flag of ${name} is marked.`;
  }

  return (
    <div className="flag-pick">
      {/* No flag next to the name here: it is the answer. */}
      <p className="game-prompt">
        Pick the flag of <strong>{name}</strong>
      </p>
      {/* Always rendered, so screen readers announce the feedback when it appears. */}
      <p className="game-feedback" role="status" data-correct={feedback?.correct}>
        {message}
      </p>
      <MultipleChoice
        label={`Flag of ${name}`}
        options={options}
        correctId={question.targetId}
        chosenId={feedback?.answer}
        onChoose={onAnswer}
      />
    </div>
  );
}

export default FlagPickPlay;
