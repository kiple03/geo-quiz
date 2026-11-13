# 0002. Map-click quiz as the core mode; Natural Earth + d3-geo

- **Status:** Accepted
- **Date:** 2026-11-13

## Context

The main game mode is a map quiz: the player is given a country name and clicks that
country on a world map. Capital and flag quizzes come later and reuse the same data.

This means map geometry is needed from the first dataset, not in a later phase. We need
to choose a geometry source, a way to join it with country metadata, a file format, and
a rendering approach. ADR 0001 requires that the client download stays small.

## Decision

- **Geometry:** Natural Earth admin-0 countries at **1:50m** scale (public domain). The
  1:110m version leaves out many small countries, which a click-the-country game needs.
- **Metadata:** `mledoze/countries` (names, capitals, regions, area, UN membership).
  Licensed ODbL, so it is credited in `data/README.md`.
- **Join key:** Natural Earth's `ADM0_A3`, matched to `cca3` in mledoze, with a small
  alias table for codes that differ (e.g. `KOS` → `UNK`). `ISO_A3` is not used because
  it is `-99` for some countries, including France and Norway. The generation script
  fails if a shape or a UN member cannot be matched and is not explicitly listed.
- **Shapes without metadata** (e.g. Somaliland, N. Cyprus) are drawn as neutral land and
  are never asked about.
- **Format:** TopoJSON, simplified with mapshaper (keeping small islands), committed to
  `frontend/public/data/` next to `countries.json` and loaded with `fetch`.
- **Rendering:** SVG paths generated with `d3-geo`, one `<path>` per country, so click
  and hover are ordinary React event handlers. No `react-simple-maps` (a thin, little
  maintained wrapper around d3-geo) and no canvas/WebGL (unnecessary for ~240 shapes).

## Consequences

- **Positive:** Click detection is free with SVG; the data is reproducible from pinned
  sources; metadata and geometry are separate files, so non-map modes need only the small
  `countries.json`; loading via `fetch` makes the later switch to an API (ADR 0001) a URL
  change.
- **Negative:** 1:50m geometry is larger than 1:110m, so the output size must be checked
  on every regeneration. Tiny countries (Vatican, Monaco, Pacific islands) are hard to
  click on a world map and will need markers or zoom later. Border depictions follow
  Natural Earth's default point of view.
- **Follow-up:** Handle tiny countries (click markers below a size threshold, zoom/pan)
  when the map UI is polished.
