# 0007. Multiple-choice modes and datasets loaded per mode

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

Phase 3 adds the first modes without a map: name the capital (this ADR), then the flag
mode. Both ask about a country and offer a few answers to pick from. [ADR 0003](0003-frontend-structure.md)
already left room for this (`GameMode.buildQuestions`, `Question.options`), but nothing
built the options or showed them.

The data was all loaded at once: `loadGameData` fetched `countries.json` (77 KB) and
`world.topo.json` (268 KB, 90 KB gzipped) at startup for every mode, and the game
screen said "Loading the map…" for all of them ([backlog](../backlog.md) item 3). Later
datasets (flags, US states) would have been added to the same startup load.

The capital data has edge cases: Antarctica, Heard Island and McDonald Islands, and
Macau have no capital; South Africa has three (Pretoria, Bloemfontein, Cape Town); and
"Kingston" is the capital of both Jamaica and Norfolk Island.

## Decision

- **Datasets are loaded one by one, when first needed, and cached.** `data/load.ts`
  names them in `Datasets` (`countries`, `world`) with one loader each. A mode lists the
  ones it needs besides the countries in `GameMode.datasets` (map-click: `['world']`;
  capital: none). `GameScreen` calls `useGameData(mode.datasets)`, which is ready once
  all of them are. `GameDataProvider` keeps each dataset for the session, starts
  `countries` when the app mounts (every mode needs it), and forgets a failed load, so
  "Try again" reloads only what failed. Loads are not aborted: they are shared and
  cached, so none is wasted. A mode reads a dataset with `requireDataset(data, id)`,
  which throws if the mode forgot to declare it.
- **Multiple-choice options are country ids**, like `Question.targetId`, so the answer
  is checked by country, never by the text shown. `game/choice/choices.ts` builds the
  questions: four options, the wrong ones from the target's region first (harder, and
  it keeps region rounds in the region), topped up from other regions only if the
  region runs out. Every region the menu offers has at least 24 distinct capitals;
  only the Antarctic entries (asked in world rounds) get options from elsewhere. No
  two options show the same label, so Jamaica and Norfolk Island are never offered
  together.
- **One shared `MultipleChoice` component** (`game/choice/`) renders the options as
  buttons in a named group. Click, Enter or Space, or the number key picks one. The
  first button has `data-autofocus` (ADR 0005). Enter and Space answer on release, and
  only when the press started on that option, like the map: otherwise a held key's
  repeats reach the "Next question" button and skip the feedback. After the answer the
  buttons are `aria-disabled` (not `disabled`, which would take them out of the reading
  order) and the right option and a wrong pick are marked with ✓/✗ and text, and a
  solid or dashed border, not only colour. The mode renders its prompt and the status
  line itself.
- **Capital mode asks country → capital** ("Name the capital of Norway"). Its pool is
  the countries that have a capital. South Africa is offered as Pretoria, its first
  capital; the feedback and results name all three. Listing all three in the option
  would make it the only option with several names and give the answer away.

## Consequences

- **Positive:** The capital mode never downloads the map, and a new dataset (flags, US
  states) is one entry in `Datasets` and its loader, loaded only by the modes that ask
  for it. The flag mode can reuse the question builder and the component, with a
  different `labelOf` and option content.
- **Negative:** The map now loads when the map mode is opened, not at startup, so its
  first round shows a loading message for a moment. Options show plain text only; the
  flag mode will need the component to render images.
- **Follow-up:** The reverse direction (capital → country) is a separate mode, and must
  decide what to do about Kingston (accept either country, or leave it out). Subdivision
  datasets ([backlog](../backlog.md) item 2) add their own entries to `Datasets`.
