# 0005. Keyboard and screen-reader play for the map game

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

The map-click game (ADR 0002, ADR 0004) could only be played with a mouse or touch.
The map's SVG had `role="img"`, so its shapes were hidden from assistive technology.
After a correct answer, auto-advance removed the focused "Next question" button and
focus fell back to the page. Right and wrong answers on the map and in the progress
pips differed by colour only. See planned extension 6 in
[ADR 0003](0003-frontend-structure.md#planned-extensions).

The usual answer for a big set of choices, a searchable list, does not fit this game:
the question already names the country, so typing "Norway" when asked to find Norway
tests nothing. A keyboard way to answer has to be spatial, like the mouse one.

## Decision

- **The map is one tab stop**, not ~240. It is an SVG with `role="application"`, so
  screen readers pass the arrow keys to it, a label ("World map") and a description:
  the mode's task ("Find Norway") plus the keys to use.
- **Arrow keys move a cursor from country to country** (`src/map/keyboardNav.ts`).
  An arrow moves to the closest country within about 56° of its direction, preferring
  countries straight ahead. Distances run between each country's `labelPoint`, the
  center of its largest part, so far-off territories (Alaska, French Guiana) do not
  pull a country somewhere else. Every country, including Vatican City and Tuvalu, can
  be reached; a test checks this on the real map. Enter or Space answers when the key
  is released (so a held key cannot also press the "Next question" button that gets
  focus), and `+`, `-` and `0` zoom; with Ctrl, Cmd or Alt they stay browser
  shortcuts. The map pans to keep the cursor in view. The cursor only appears after
  the first arrow press, so mouse and touch players never see it, and it carries over
  to the next question like the zoom does.
- **Screen readers hear the name of the country under the cursor** (a polite live
  region). This is a trade-off: it turns the game into "find the country by moving
  through its neighbours". That still takes geographic knowledge (which way to go, and
  how far), and without names a screen-reader user could not play at all. Sighted
  keyboard players do not see the name.
- **Focus comes back to where the player answers.** When a new question starts and
  focus was lost or is still inside the round, `RoundView` focuses the element the
  mode marks with `data-autofocus` (the map, via `WorldMap`'s `focusTarget`), or the
  round itself. Focus the player moved elsewhere is left alone. New modes should mark
  their main input the same way.
- **Not by colour alone.** Wrong answers on the map get a dashed outline, wrong pips
  are striped, and the feedback text no longer says "shown in green".

## Consequences

- **Positive:** A whole round can be played with only a keyboard, and with a screen
  reader. Any later map (regions, subdivisions) gets the same keyboard support from
  `WorldMap` and `keyboardNav`, which work on any shapes.
- **Negative:** Screen-reader players get a hint that mouse players do not (the names
  while moving), so their scores are not strictly comparable. If leaderboards arrive
  (Phase 4), a round could record its input method. Arrow-key navigation between
  far-apart islands (e.g. in the Pacific) can feel jumpy, since "closest in that
  direction" is not always the neighbour a player expects.
- **Follow-up:** The capital and flag modes should mark their answer input with
  `data-autofocus` and use the same non-colour cues.
