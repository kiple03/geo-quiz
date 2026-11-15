import type { ReactNode } from 'react';
import { countryName } from '../../../data/load';
import CountryFlag from '../../../flags/CountryFlag';
import MultipleChoice from '../../choice/MultipleChoice';
import type { PlayProps } from '../types';
import { capitalOf, capitalsText } from './capitals';

/** One capital question: "What is the capital of <country>?" with four options. */
function CapitalPlay({ data, question, feedback, onAnswer }: PlayProps) {
  const name = countryName(data, question.targetId);
  const target = data.countriesById.get(question.targetId);
  const capitals = target ? capitalsText(target) : '';
  // Plain capitals, no flags: a flag would tell whose capital an option is (ADR 0008).
  const options = (question.options ?? []).map((id) => ({ id, label: capitalOf(data, id) }));

  let message: ReactNode = '';
  if (feedback?.correct) {
    message = `Correct! The capital of ${name} is ${capitals}.`;
  } else if (feedback) {
    const picked = capitalOf(data, feedback.answer);
    const pickedCountry = countryName(data, feedback.answer);
    message = (
      <>
        Not quite: {picked} is the capital of <CountryFlag data={data} id={feedback.answer} />
        {pickedCountry}. The capital of {name} is {capitals}.
      </>
    );
  }

  return (
    <div className="capital">
      <p className="game-prompt">
        Name the capital of{' '}
        <strong>
          <CountryFlag data={data} id={question.targetId} />
          {name}
        </strong>
      </p>
      {/* Always rendered, so screen readers announce the feedback when it appears. */}
      <p className="game-feedback" role="status" data-correct={feedback?.correct}>
        {message}
      </p>
      <MultipleChoice
        label={`Capital of ${name}`}
        options={options}
        correctId={question.targetId}
        chosenId={feedback?.answer}
        onChoose={onAnswer}
      />
    </div>
  );
}

export default CapitalPlay;
