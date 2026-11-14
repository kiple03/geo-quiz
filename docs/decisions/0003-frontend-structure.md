# 0003. Frontend structure: routing, game-mode registry, mode-agnostic round engine

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

Phase 2 adds the first playable game (click the named country on the map, ADR 0002).
More will follow: capital and flag modes, variations such as region filters or a
different number of questions, and in Phase 4 accounts, login and leaderboards
(ADR 0001). The first version should set a structure those features plug into, instead
of hardcoding one quiz into `App.tsx`.

## Decision

- **Routing:** React Router (declarative mode). `/` is the main menu, `/play/:modeId`
  runs a game mode, and unknown paths show a not-found page. All routes are declared in
  `src/app/App.tsx` inside a shared layout (`AppShell`). Later screens (login, profile,
  leaderboard) are new routes.
- **Game modes are plugins.** Each mode lives in its own folder under
  `src/game/modes/` and is listed in `registry.ts`. The menu and the game screen read
  the registry, so adding a mode does not touch either of them. A mode supplies its
  metadata (id, title, description), which countries can be asked, how an answer is
  checked, how a question and an answer read in the results, and a component that
  renders the prompt and input for one question (remounted for every question). It
  may also build its own questions (e.g. multiple-choice `options`); by default
  countries are picked at random.
- **Shared filters live in one place.** `src/game/setup.ts` narrows every mode's pool
  by `RoundConfig` (e.g. `regions`) before questions are built, so a new filter works
  for all modes at once. A round with no matching questions shows a message, and an
  error boundary in `AppShell` catches crashes so a screen never goes blank.
- **One round engine for every mode.** A pure, React-free reducer in
  `src/game/engine/` runs a round: build the questions, take an answer, record whether
  it was right, go to the next one, and produce a result. Shared UI (score, progress,
  "Next", results) lives in the game screen, not in the modes.
- **Settings and results are plain data.** `RoundConfig` (mode id, question count,
  auto-advance pause, regions) has its defaults in one place. `RoundResult` (config, answers, score,
  timestamps) is the shape a Phase 4 backend will receive when scores are saved.
- **Data is loaded in one place.** `src/data/` is the only code that knows where the
  data comes from, so switching from static JSON to an API (ADR 0001) stays local.
- **State:** React state, context and reducers. No state library for now.

## Consequences

- **Positive:** New modes, settings and screens are additive. The engine and mode logic
  are pure functions, so they are easy to unit-test. URLs per screen make modes
  linkable.
- **Negative:** More files and indirection than a single-screen app needs today. Client
  routing needs the static host to serve `index.html` for unknown paths when the app is
  deployed.
- **Follow-up:** No auth, settings UI or code splitting yet; add them when a feature needs
  them.

## Planned extensions

A review of this structure against the roadmap (zoom/pan map, region quizzes,
subdivision quizzes such as US states, capital and flag modes) found five changes that
are best made together with the feature that needs them. Each fits into this structure
without reworking it. Details and suggested approaches are in
[docs/backlog.md](../backlog.md):

1. Round settings from the URL, restarting the round when they change (region picker).
2. Map geometry for any topology layer and projection, not only the world (subdivisions).
3. Zoom and pan: a memoized shape layer under a transform; drags must not count as clicks.
4. A view-aware `MIN_TARGET_AREA`, so tiny countries return once zoom exists.
5. Per-mode datasets, loaded on demand instead of all at startup.
