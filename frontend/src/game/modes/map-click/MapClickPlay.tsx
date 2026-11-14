import WorldMap, { type MapHighlight } from '../../../map/WorldMap';
import type { PlayProps } from '../types';

/** One map-click question: "Click on <country>", then the map shows right and wrong. */
function MapClickPlay({ data, question, history, feedback, onAnswer }: PlayProps) {
  const target = data.countriesById.get(question.targetId);
  const targetName = target?.name ?? question.targetId;

  // Countries asked earlier in the round stay marked: got it, or missed it.
  const highlights: Record<string, MapHighlight> = {};
  for (const { question: q, correct } of history) {
    highlights[q.targetId] = correct ? 'past-correct' : 'past-wrong';
  }

  let message = '';
  if (feedback?.correct) {
    highlights[question.targetId] = 'correct';
    message = `Correct! That is ${targetName}.`;
  } else if (feedback) {
    const clicked = data.countriesById.get(feedback.answer)?.name ?? feedback.answer;
    highlights[feedback.answer] = 'wrong';
    highlights[question.targetId] = 'reveal';
    message = `Not quite: you clicked ${clicked}. ${targetName} is shown in green.`;
  }

  return (
    <div className="map-click">
      <p className="game-prompt">
        Click on <strong>{targetName}</strong>
      </p>
      {/* Always rendered, so screen readers announce the feedback when it appears. */}
      <p className="game-feedback" role="status" data-correct={feedback?.correct}>
        {message}
      </p>
      <WorldMap
        world={data.world}
        clickableIds={data.countryIds}
        highlights={highlights}
        onCountryClick={feedback ? undefined : onAnswer}
      />
    </div>
  );
}

export default MapClickPlay;
