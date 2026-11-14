# Backlog: deferred design items

Changes that are known to be needed for planned features, but are best built together
with the feature itself. They come from the `/code-review high` of the Phase 2 PR (map
quiz), which checked the structure against the roadmap. See also
[ADR 0003](decisions/0003-frontend-structure.md#planned-extensions).

When one of these is picked up, turn it into a GitHub issue and remove it from here.

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
  its own dataset (see item 5) with its own id scheme (e.g. `US-CA`). `targetId` is
  already a plain string, and `describeQuestion` / `describeAnswer` let modes name
  non-country targets.

## 3. Zoom and pan (GeoGuessr-style)

- **Needed for:** the Phase 3 map polish; also fixes the tiny map on phones.
- **Today:** `WorldMap` rebuilds all ~240 paths on every render and handles clicks with
  plain `onClick` on each path.
- **Problems:** a drag that starts and ends on one country fires `click` and submits an
  answer; re-rendering all paths on every pan/zoom frame will lag on mobile.
- **Approach:** draw the shapes in a memoized layer inside `<g transform>` driven by
  zoom state (d3-zoom or pointer events), keep highlights as a separate light layer,
  and ignore a click when the pointer moved more than a few pixels since pointer-down.
  Revisit `SIMPLIFY_PERCENT` in `data/build.ts` (10% gets coarse past ~7x zoom), or
  load a detailed topology on demand.

## 4. View-aware `MIN_TARGET_AREA`

- **Needed for:** zoom (item 3) and region views.
- **Today:** `map-click/mode.ts` leaves out countries under 5 units² at full-world size
  (~70 countries, e.g. Luxembourg, Cyprus, Gambia).
- **Approach:** make the threshold depend on the view the round uses (or a config
  option "include tiny countries"), so zoomed or regional rounds ask about them again.

## 5. Per-mode datasets, loaded on demand

- **Needed for:** flag/capital modes (no map needed) and subdivision datasets.
- **Today:** `loadGameData` loads `countries.json` and `world.topo.json` together at
  startup for every mode, and the game screen always says "Loading the map…".
- **Approach:** let each mode declare the datasets it needs; `data/` loads and caches
  each dataset separately. Fine to defer: the map is 43 KB gzipped today.

## 6. Accessibility of the map game

- **Needed for:** players using a keyboard, a screen reader, or with red-green colour
  blindness. Not tied to one feature; best done together with zoom (item 3), which
  reworks the map's input handling anyway.
- **Today:** countries can only be clicked with a mouse or touch; the map's SVG has
  `role="img"`, so its shapes are hidden from assistive tech. After the 1 s auto-advance
  the focused "Next question" button disappears and focus falls back to the page.
  Earlier answers on the map and the progress pips show right/wrong by colour only.
- **Approach:** a keyboard and screen-reader way to answer that does not mean tabbing
  through ~240 shapes, e.g. a searchable country list as an alternative input, or
  arrow-key navigation between neighbouring countries; move focus to the new prompt
  after each question; add a non-colour cue for wrong answers (hatching or a dashed
  outline on the map, ✓/✗ marks on the pips).
