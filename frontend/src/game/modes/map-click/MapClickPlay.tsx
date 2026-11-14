import { useMemo } from 'react';
import { countryName } from '../../../data/load';
import WorldMap, { type MapHighlight } from '../../../map/WorldMap';
import { regionsFrame } from '../../regions';
import { countryIdsInRound } from '../../setup';
import type { PlayProps } from '../types';

/** One map-click question: "Click on <country>", then the map shows right and wrong. */
function MapClickPlay({ data, config, question, history, feedback, onAnswer }: PlayProps) {
  const targetName = countryName(data, question.targetId);
  // In a region round, only that region's countries can be clicked or reached with the
  // keyboard; the rest of the world is neutral land (ADR 0006).
  const clickableIds = useMemo(() => countryIdsInRound(data, config), [data, config]);

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
    const clicked = countryName(data, feedback.answer);
    highlights[feedback.answer] = 'wrong';
    highlights[question.targetId] = 'reveal';
    message = `Not quite: you clicked ${clicked}. ${targetName} is highlighted on the map.`;
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
        clickableIds={clickableIds}
        highlights={highlights}
        onCountryClick={feedback ? undefined : onAnswer}
        // After a miss, make sure both the click and the right answer are on screen.
        revealIds={feedback && !feedback.correct ? [feedback.answer, question.targetId] : undefined}
        // ...and circle the right answer, in case it is too small to see.
        ringIds={feedback && !feedback.correct ? [question.targetId] : undefined}
        // Keep the player's zoom between questions; a new round starts on its region,
        // or the whole world.
        initialView={history.length === 0 ? 'home' : 'previous'}
        homeArea={regionsFrame(config.regions)}
        // Keyboard and screen-reader play (ADR 0005).
        description={`Find ${targetName}`}
        nameOf={(id) => countryName(data, id)}
        focusTarget
      />
    </div>
  );
}

export default MapClickPlay;
