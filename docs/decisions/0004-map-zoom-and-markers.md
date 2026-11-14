# 0004. Map zoom and pan with d3-zoom; markers for tiny countries

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

The map-click mode (ADR 0002) shows the whole world in one SVG. At that size about 70
countries are too small to click (Luxembourg, Cyprus, Gambia, ...), so Phase 2 left
them out of the questions, and on a phone the whole map is only a few centimetres
high. Phase 3 adds zoom and pan, in the style of GeoGuessr: wheel, drag and pinch.

Some countries stay too small even when zoomed far in. With Natural Earth 1:50m shapes
on a 1000-unit-wide map, Vatican City is 0.0007 units² and Tuvalu 0.004. Making
Vatican City as big as Luxembourg looks unzoomed would take about 85× zoom. Some tiny
countries are also direct neighbours: the French and Dutch halves of Saint Martin have
centroids 0.1 units apart.

Two problems from the Phase 2 review apply here (planned extensions 3 and 4 in
[ADR 0003](0003-frontend-structure.md#planned-extensions)): a drag that starts and
ends on one country must not count as a click, and redrawing ~240 paths on every pan
frame would lag on phones.

## Decision

- **d3-zoom handles the input.** It covers mouse wheel, drag, touch pan and pinch,
  limits panning to the map, and keeps a drag from firing `click` (`clickDistance`
  4 px, `tapDistance` 10 px). The alternative was our own Pointer Events code, which
  would mean writing and testing all of that ourselves. d3-zoom is part of the d3
  family we already use (d3-geo); `d3-selection` and `d3-transition` come with it.
  Double-click zoom is off, because its first click would already answer.
- **No React work while panning.** `useMapZoom` (in `src/map/`) writes the transform
  straight to one `<g>` that holds every shape. React renders the shapes only when the
  game state changes (a new question or an answer), never per frame.
- **Zoom up to 32× on a desktop-sized map** (`MAX_ZOOM`), with +/−/"whole map"
  buttons. Smaller maps may zoom further (`maxZoomFor`, about 100× on a phone), so the
  deepest zoom shows the same detail, in screen pixels, on every screen. 32× is what
  it takes to tell the two halves of Saint Martin apart. Zoom changes are animated
  unless the player prefers reduced motion.
- **The view carries over between questions** and resets when a new round starts.
  After a wrong answer, the map pans (and zooms out if needed) so that both the clicked
  country and the right answer are on screen, and the right answer gets a ring that
  stays the same size on screen, so it can be found even when it is tiny. The ring is
  hidden while the answer is at least 24 px wide.
- **Markers for tiny countries.** Clickable shapes still under 5 units² at 8× zoom
  (`MARKER_MAX_AREA`, 28 countries: microstates and small islands) get a round marker
  at their centroid. It stays the same size on screen and is highlighted like the
  shape itself. A marker is **hidden once its country is 5 px wide on screen**, so it
  can be clicked by itself; that also separates neighbouring markers. Markers and rings
  are sized in code on every zoom change, because Safari does not support the CSS `r`
  property.
- **Every country can be asked about.** With zoom and markers, the size filter
  (`MIN_TARGET_AREA`) is removed, rather than made dependent on the zoom level as the
  backlog suggested.
- **Enclave markers may take clicks from the country around them.** At the full-world
  view, the markers of Vatican City, San Marino and Monaco cover a few pixels of Italy
  or France, so a click there answers the small country. We accept this: the dot is
  visible, the feedback names the country that was clicked, and zooming in shrinks the
  covered area. Hiding all markers until the player zooms in was the alternative, but
  then tiny island nations would be invisible at the start.
- **More map detail.** `SIMPLIFY_PERCENT` in `data/build.ts` goes from 10 to 30, so
  borders stay sharp up to about 16×. `world.topo.json` grows from 41 to 90 KB gzipped.
  The budget is about 100 KB gzipped; beyond that, load more detailed shapes only when
  needed.

## Consequences

- **Positive:** All 237 countries are playable, and at full zoom each one can be told
  apart from its neighbours. The map works on touch screens, where it is also taller.
  The zoom hook does not depend on the world map, so region views (zoom to a region's
  bounds) and subdivision maps can use it.
- **Negative:** Three more runtime dependencies (`d3-zoom`, `d3-selection`,
  `d3-transition`). The map data is about twice as large. Past about 16×, small islands
  look coarse (a few straight edges). Real gestures (drag vs click, pinch) can't be
  simulated in jsdom, so they are tested by hand. The zoom ignores events without a
  `view`, which browsers always set but jsdom test events may not. While the pointer is
  over the map, the mouse wheel and touch gestures zoom the map instead of scrolling
  the page.
- **Follow-up:** Keyboard and screen-reader input for the map ("Accessibility of the map
  game" in [docs/backlog.md](../backlog.md)) builds on the zoom buttons added here.
