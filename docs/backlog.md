# Backlog: deferred design items

Changes that are known to be needed for planned features, but are best built together
with the feature itself. They come from the `/code-review high` of the Phase 2 PR (map
quiz), which checked the structure against the roadmap. See also
[ADR 0003](decisions/0003-frontend-structure.md#planned-extensions).

When one of these is picked up, turn it into a GitHub issue and remove it from here.
Zoom and pan, and the view-aware size threshold (items 3 and 4 in ADR 0003's list),
were done in [ADR 0004](decisions/0004-map-zoom-and-markers.md); accessibility of the
map game (item 6) in [ADR 0005](decisions/0005-map-keyboard-and-screen-reader-play.md);
round settings from the URL (item 1 here) in [ADR 0006](decisions/0006-region-quizzes.md);
per-mode datasets (item 3 here) in [ADR 0007](decisions/0007-multiple-choice-and-datasets-per-mode.md).
The remaining items keep their numbers, since code comments refer to them.

## 2. Map geometry for any layer and projection

- **Needed for:** subdivision quizzes (US states, Norwegian counties, ...) and region views.
- **Today:** `map/geometry.ts` hardcodes `objects.world`, the Equal Earth projection
  fitted to the whole globe, and a cache keyed only by topology. `parseWorld` and
  `WorldMap` (ocean sphere, "World map" label) assume the world too. `Question.targetId`
  and `GameData` are documented as country ids.
- **Approach:** `getMapGeometry(topology, { object, projection, fitTo })` cached per
  (topology, options); a generic `<GeoMap>` that `WorldMap` wraps; subdivision data as
  its own dataset (an entry in `Datasets`, ADR 0007) with its own id scheme (e.g. `US-CA`). `targetId` is
  already a plain string, and `describeQuestion` / `describeAnswer` let modes name
  non-country targets.
- **Also for Oceania:** the map's edge (180°) splits Oceania, so region rounds start
  with Samoa, Tonga, French Polynesia and others off screen (ADR 0006). A projection
  rotated to the Pacific (e.g. `geoEqualEarth().rotate([-170, 0])`) for that region
  would fix it; the remembered view is in viewBox units, so it must not carry over
  between maps with different projections.

## 7. Menu: one card per pair of reverse modes

- **Needed for:** the style and layout pass of the menu.
- **Today:** every mode is its own card, so the two directions of a question are
  separate cards: "Name the capital" and "Whose capital?", "Name the flag" and "Pick
  the flag" ([ADR 0009](decisions/0009-reverse-capital-mode.md)).
- **Approach:** an optional grouping in the registry (e.g. `GameModeInfo.group` and a
  label for each direction), so the menu shows one card with a direction switch. The
  modes and their ids stay as they are, so URLs and saved results don't change.
