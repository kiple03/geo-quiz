# 0006. Region quizzes: settings in the URL, region as the playing field

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

Phase 3 adds rounds limited to one part of the world (Europe, Africa, ...). The engine
already filters a round's questions by `RoundConfig.regions` (`game/setup.ts`), but
nothing could set that field: `GameScreen` always used `defaultRoundConfig()`, and a
round was keyed only by mode and round number ([backlog](../backlog.md) item 1, from
the planned extensions in [ADR 0003](0003-frontend-structure.md#planned-extensions)).

A region round also has to show the region. The map always started on the whole world,
and `useMapZoom.reveal` only ever zooms out. The bounds of a region's countries are a
poor frame: Russia (`Europe` in the data) reaches the Bering Strait, France and Norway
include French Guiana and Svalbard, and Oceania crosses the antimeridian (180°), which
is the left and right edge of our Equal Earth map.

The data has six regions: Africa (57 entries), Americas (51), Asia (50), Europe (51),
Oceania (24) and Antarctic (4).

## Decision

- **Round settings live in the URL's search params**, e.g.
  `/play/map-click?region=europe`. `game/settings.ts` parses them on top of
  `defaultRoundConfig()` and writes them back (`roundSearchFor`), writing only what
  differs from the defaults. Unknown values are ignored, so a broken link plays the
  whole world. `region` may repeat; the order is normalised. The `RoundView` key
  includes the serialised config, so new settings start a new round. Rounds can be
  linked and bookmarked, and the browser's Back button works, with no extra state.
- **The region is chosen in the main menu**, once for every mode: a row of radio
  buttons above the mode cards. The menu keeps the choice in its own URL
  (`/?region=europe`), and both "Back to menu" and the header link go there from a
  round, so the choice survives it. A link with several regions checks none of the
  buttons but keeps them all. A separate setup step per mode was the alternative. It would have
  added a click before every round, and the menu choice already covers all modes.
- **Regions are defined once**, in `game/regions.ts`: the `Country.region` value, a
  URL slug, a label and a map frame. Antarctic is not offered: four questions do not
  make a round. Its entries are still asked in world rounds.
- **Countries outside the region are neutral land**: drawn, but not clickable, and the
  keyboard cursor skips them. The region becomes the playing field: a stray click
  outside it cannot cost a point, and arrow keys move among ~50 countries, not ~240.
  Modes get the round's config through `PlayProps.config`. `countryIdsInRound()` in
  `game/setup.ts` gives the ids the filters let in, from the whole dataset.
- **Each region has a hand-picked frame** (a lon/lat box), rather than one computed
  from its countries. `WorldMap` takes it as `homeArea`: the map starts there
  (`initialView: 'home'`, the old `'full'`), and the reset button ("Show the whole
  region") and the 0 key go back there. The player can still zoom out to the whole
  world. `projectBox()` in `map/geometry.ts` projects the box, sampling its edges,
  since meridians are curved in Equal Earth. A test checks the frames against the
  data: every country's main part starts in view, apart from the known exceptions
  below.
- **The remembered view and keyboard cursor need no change.** The first question of a
  round starts on the region; later questions keep the player's view, as before. A
  remembered cursor that is not clickable in this round is already dropped (ADR 0005).

## Consequences

- **Positive:** Any mode gets region rounds, links and the menu choice for free. New
  round settings (question count, ...) go into the same URL parsing. The map code knows
  nothing about regions, only about a home area, so subdivision maps can use it too.
- **Negative:** Oceania is split by the map's edge. The frame stops at 180°, so the
  nine Oceania entries east of it (Samoa, Tonga, French Polynesia, Kiribati's main
  part, ...) start off screen at the far left of the map, and the frame cannot be
  centred, because the map does not pan past its edge. Russia's main part reaches
  outside Europe's frame. The Americas frame is so tall that the map hardly zooms in.
- **Follow-up:** A projection centred on the Pacific for Oceania belongs with
  [backlog](../backlog.md) item 2 (map geometry for any projection).
