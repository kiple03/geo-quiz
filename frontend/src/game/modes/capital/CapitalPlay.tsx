import { countryName } from '../../../data/load';
import MultipleChoice from '../../choice/MultipleChoice';
import type { PlayProps } from '../types';
import { capitalOf, capitalsText } from './capitals';

/** One capital question: "What is the capital of <country>?" with four options. */
function CapitalPlay({ data, question, feedback, onAnswer }: PlayProps) {
  const name = countryName(data, question.targetId);
  const target = data.countriesById.get(question.targetId);
  const capitals = target ? capitalsText(target) : '';
  const options = (question.options ?? []).map((id) => ({ id, label: capitalOf(data, id) }));

  let message = '';
  if (feedback?.correct) {
    message = `Correct! The capital of ${name} is ${capitals}.`;
  } else if (feedback) {
    const picked = capitalOf(data, feedback.answer);
    const pickedCountry = countryName(data, feedback.answer);
    message = `Not quite: ${picked} is the capital of ${pickedCountry}. The capital of ${name} is ${capitals}.`;
  }

  return (
    <div className="capital">
      <p className="game-prompt">
        Name the capital of <strong>{name}</strong>
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
