import type { ReactNode } from 'react';
import { countryName } from '../../../data/load';
import CountryFlag from '../../../flags/CountryFlag';
import MultipleChoice from '../../choice/MultipleChoice';
import type { PlayProps } from '../types';

/** One flag question: a flag is shown, the player picks its country from four names. */
function FlagNamePlay({ data, question, feedback, onAnswer }: PlayProps) {
  const name = countryName(data, question.targetId);
  // Plain names, no flags: a flag next to each option would give the answer away.
  const options = (question.options ?? []).map((id) => ({ id, label: countryName(data, id) }));

  let message: ReactNode = '';
  if (feedback?.correct) {
    message = `Correct! This is the flag of ${name}.`;
  } else if (feedback) {
    message = (
      <>
        Not quite: this is the flag of {name}. The flag of{' '}
        <CountryFlag data={data} id={feedback.answer} />
        {countryName(data, feedback.answer)} looks like this.
      </>
    );
  }

  return (
    <div className="flag-name">
      <p className="game-prompt">Which country has this flag?</p>
      {/* Neutral alt text while asking: the name would be the answer (ADR 0008). */}
      <CountryFlag
        data={data}
        id={question.targetId}
        size="large"
        alt={feedback ? `Flag of ${name}` : 'The flag to name'}
      />
      {/* Always rendered, so screen readers announce the feedback when it appears. */}
      <p className="game-feedback" role="status" data-correct={feedback?.correct}>
        {message}
      </p>
      <MultipleChoice
        label="Country with this flag"
        options={options}
        correctId={question.targetId}
        chosenId={feedback?.answer}
        onChoose={onAnswer}
      />
    </div>
  );
}

export default FlagNamePlay;
