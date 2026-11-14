# Backlog: deferred design items

Changes that are known to be needed for planned features, but are best built together
with the feature itself. They come from the `/code-review high` of the Phase 2 PR (map
quiz), which checked the structure against the roadmap. See also
[ADR 0003](decisions/0003-frontend-structure.md#planned-extensions).

When one of these is picked up, turn it into a GitHub issue and remove it from here.
Zoom and pan, and the view-aware size threshold (items 3 and 4 in ADR 0003's list),
were done in [ADR 0004](decisions/0004-map-zoom-and-markers.md); accessibility of the
map game (item 6) in [ADR 0005](decisions/0005-map-keyboard-and-screen-reader-play.md);
round settings from the URL (item 1 here) in [ADR 0006](decisions/0006-region-quizzes.md).
The remaining items keep their numbers, since code comments refer to them.

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
- **Also for Oceania:** the map's edge (180°) splits Oceania, so region rounds start
  with Samoa, Tonga, French Polynesia and others off screen (ADR 0006). A projection
  rotated to the Pacific (e.g. `geoEqualEarth().rotate([-170, 0])`) for that region
  would fix it; the remembered view is in viewBox units, so it must not carry over
  between maps with different projections.

## 3. Per-mode datasets, loaded on demand

- **Needed for:** flag/capital modes (no map needed) and subdivision datasets.
- **Today:** `loadGameData` loads `countries.json` and `world.topo.json` together at
  startup for every mode, and the game screen always says "Loading the map…".
- **Approach:** let each mode declare the datasets it needs; `data/` loads and caches
  each dataset separately. Fine to defer: the map is 90 KB gzipped today.
