# Backlog: deferred design items

Changes that are known to be needed for planned features, but are best built together
with the feature itself. They come from the `/code-review high` of the Phase 2 PR (map
quiz), which checked the structure against the roadmap. See also
[ADR 0003](decisions/0003-frontend-structure.md#planned-extensions).

When one of these is picked up, turn it into a GitHub issue and remove it from here.
Zoom and pan, and the view-aware size threshold (items 3 and 4 in ADR 0003's list),
were done in [ADR 0004](decisions/0004-map-zoom-and-markers.md).

## 1. Round settings from the URL

- **Needed for:** the region picker and any settings UI.
- **Today:** `GameScreen.tsx` always uses `defaultRoundConfig(mode.id)`. The round's
  `key` is only mode id + round number, and `RoundView` reads the config once, on mount.
- **Problem:** changing a setting mid-session would not restart the round, and settings
  cannot be linked or shared (e.g. `/play/map-click?region=europe`).
- **Approach:** parse the config from search params on top of `defaultRoundConfig()`
  (validate values; unknown regions are ignored), and include a serialized config in the
  `RoundView` key so a new config starts a new round.

## 2. Map geometry for any layer and projection

- **Needed for:** subdivision quizzes (US states, Norwegian counties, ...) and region views.
- **Today:** `map/geometry.ts` hardcodes `objects.world`, the Equal Earth projection
  fitted to the whole globe, and a cache keyed only by topology. `parseWorld` and
  `WorldMap` (ocean sphere, "World map" label) assume the world too. `Question.targetId`
  and `GameData` are documented as country ids.
- **Approach:** `getMapGeometry(topology, { object, projection, fitTo })` cached per
  (topology, options); a generic `<GeoMap>` that `WorldMap` wraps; subdivision data as
  its own dataset (see item 3) with its own id scheme (e.g. `US-CA`). `targetId` is
  already a plain string, and `describeQuestion` / `describeAnswer` let modes name
  non-country targets.

## 3. Per-mode datasets, loaded on demand

- **Needed for:** flag/capital modes (no map needed) and subdivision datasets.
- **Today:** `loadGameData` loads `countries.json` and `world.topo.json` together at
  startup for every mode, and the game screen always says "Loading the mapâ€¦".
- **Approach:** let each mode declare the datasets it needs; `data/` loads and caches
  each dataset separately. Fine to defer: the map is 43 KB gzipped today.

## 4. Accessibility of the map game

- **Needed for:** players using a keyboard, a screen reader, or with red-green colour
  blindness. Not tied to one feature; builds on the map's zoom buttons (ADR 0004).
- **Today:** countries can only be clicked with a mouse or touch; the map's SVG has
  `role="img"`, so its shapes are hidden from assistive tech. After the 1 s auto-advance
  the focused "Next question" button disappears and focus falls back to the page.
  Earlier answers on the map and the progress pips show right/wrong by colour only.
- **Approach:** a keyboard and screen-reader way to answer that does not mean tabbing
  through ~240 shapes, e.g. a searchable country list as an alternative input, or
  arrow-key navigation between neighbouring countries; move focus to the new prompt
  after each question; add a non-colour cue for wrong answers (hatching or a dashed
  outline on the map, âœ“/âœ— marks on the pips).
