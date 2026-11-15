import type { ReactNode } from 'react';
import { countryName } from '../../../data/load';
import CountryFlag from '../../../flags/CountryFlag';
import MultipleChoice from '../../choice/MultipleChoice';
import { capitalOf, capitalsText } from '../capital/capitals';
import type { PlayProps } from '../types';

/** One question: "Which country has the capital <capital>?" with four country names. */
function CapitalCountryPlay({ data, question, feedback, onAnswer }: PlayProps) {
  // The main capital: South Africa is asked as Pretoria (ADR 0009).
  const capital = capitalOf(data, question.targetId);
  const name = countryName(data, question.targetId);
  const target = data.countriesById.get(question.targetId);
  const capitals = target ? capitalsText(target) : capital;
  // Plain names, no flags, as in the other multiple-choice modes (ADR 0009).
  const options = (question.options ?? []).map((id) => ({ id, label: countryName(data, id) }));

  // After answering, the flag gives nothing away (ADR 0008).
  const asked = (
    <>
      <CountryFlag data={data} id={question.targetId} />
      {name}
    </>
  );
  let message: ReactNode = '';
  if (feedback?.correct) {
    message = (
      <>
        Correct! The capital of {asked} is {capitals}.
      </>
    );
  } else if (feedback) {
    message = (
      <>
        Not quite: the capital of <CountryFlag data={data} id={feedback.answer} />
        {countryName(data, feedback.answer)} is {capitalOf(data, feedback.answer)}. The capital of{' '}
        {asked} is {capitals}.
      </>
    );
  }

  return (
    <div className="capital-country">
      <p className="game-prompt">
        Which country has the capital <strong>{capital}</strong>?
      </p>
      {/* Always rendered, so screen readers announce the feedback when it appears. */}
      <p className="game-feedback" role="status" data-correct={feedback?.correct}>
        {message}
      </p>
      <MultipleChoice
        label={`Country with the capital ${capital}`}
        options={options}
        correctId={question.targetId}
        chosenId={feedback?.answer}
        onChoose={onAnswer}
      />
    </div>
  );
}

export default CapitalCountryPlay;
