# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Geo Quiz: a browser geography quiz (country names, capitals, flags, locations). It is a
personal learning project. Repo: `github.com/kiple03/geo-quiz`, default branch `main`.

| Path              | Contents                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| `frontend/`       | Vite 8 + React 19 + TypeScript 6.0, ESLint, Prettier, Vitest + RTL            |
| `data/`           | `build.ts` generates `frontend/public/data/` (countries, world map, flags/)   |
| `backend/`        | Spring Boot 4.1, Java 25, Maven wrapper (ADR 0010). Phase 4: accounts, scores |
| `docs/decisions/` | ADRs (`NNNN-short-title.md`). Never rewrite an accepted ADR; supersede it     |
| `docs/backlog.md` | Deferred design items for planned features (zoom, regions, subdivisions)      |

## Architecture: static data first (ADR 0001)

Read [docs/decisions/0001-static-data-first.md](docs/decisions/0001-static-data-first.md).

- Country data is generated ahead of time by a script in `data/` and committed as static
  JSON that the frontend loads directly. The backend (Phase 4) is for user data only.
- Keep the JSON schema stable and typed in the frontend. The backend does not serve it
  (ADR 0010 supersedes that part of ADR 0001), but may read the same generated data,
  e.g. to check saved answers.
- The client downloads the whole dataset, so watch its size (especially map geometry).
- Never hand-edit `frontend/public/data/`. Change `data/build.ts` and regenerate.
- The core game mode is clicking the named country on a world map: Natural Earth 1:50m
  shapes, rendered as SVG with d3-geo (ADR 0002), with zoom and pan via d3-zoom and
  markers for countries too small to click (ADR 0004). Each TopoJSON geometry `id` is a
  `Country.id`; shapes with no matching country are neutral land, never asked about.
- The `Country` type and `parseCountries()` in `frontend/src/data/` are shared: the
  frontend uses them, and `data/build.ts` imports them (so imports there need `.ts`
  extensions, since Node runs that code directly).
- Significant decisions get a new ADR in `docs/decisions/` and a row in its `README.md`.

## Frontend structure (ADR 0003)

Keep it modular; new features should be additive. In `frontend/src/`:

- `app/`: all routes (`App.tsx`) and the shared layout (`AppShell`). The router is
  provided by `main.tsx` (BrowserRouter) or by tests (MemoryRouter).
- `screens/`: non-game screens (main menu, not found; later login, leaderboard).
- `game/modes/`: one folder per game mode, listed in `registry.ts`. The menu and game
  screen read the registry, so a new mode never needs changes there.
  A mode marks its main answer input with `data-autofocus`; `RoundView` moves focus
  there after each question (ADR 0005). The map is keyboard-playable through
  `WorldMap` (`description`, `nameOf`, `focusTarget`).
- `game/engine/`: the mode-agnostic round engine (pure, no React).
- `game/setup.ts`: shared round filters (`RoundConfig.regions`, ...) applied to every
  mode's pool. Put new cross-mode filters here, not in a mode.
- `game/settings.ts`: round settings in the URL (`/play/map-click?region=europe`),
  parsed on top of `defaultRoundConfig()`; `game/regions.ts`: the regions the menu
  offers, with their map frames (ADR 0006). Modes get the config via `PlayProps.config`.
- `game/choice/`: shared multiple-choice parts (ADR 0007): `buildChoiceQuestions`
  (options are country ids, wrong ones from the same region, no repeated labels, optional
  `conflicts`) and the `MultipleChoice` component (options can show `content`, e.g. a
  flag, with a neutral `askingLabel`). Used by both capital modes and both flag modes.
- Flags (ADR 0008): one SVG per country in `public/data/flags/<id>.svg`, from a pinned
  flag-icons package, shown with `<img>` via `CountryFlag`/`FlagImage` in `flags/`. The
  rules (no flag, shared flags, look-alikes) are in `data/flags.ts`, shared with the
  build. A flag may go next to a country's name, never where it would give the answer
  away (e.g. not on capital options).
- `data/`: the only place that knows where data is loaded from. Datasets (`Datasets`
  in `load.ts`: `countries`, `world`) load separately, on first use, and stay cached
  (ADR 0007). A mode lists what it needs besides the countries in `GameMode.datasets`
  and reads it with `requireDataset(data, id)`. Tests pass `fixtureLoaders` or
  `renderApp(path, { loaders })`.

Known follow-ups for subdivision features and other map layers are in `docs/backlog.md`;
check it before starting those features.

## Commands

Node 24 (`.nvmrc`). The developer is on Windows (PowerShell or Git Bash). Run from
`frontend/`:

```sh
npm install
npm run dev            # http://localhost:5173
npm run lint           # ESLint
npm run format         # Prettier write; format:check to only check
npm run typecheck      # tsc -b
npm test               # Vitest watch mode
npm run test:run       # Vitest single run
npx vitest run src/App.test.tsx        # one test file
npx vitest run -t "name of the test"   # tests matching a name
npm run build          # tsc -b && vite build -> frontend/dist
```

Vitest runs in jsdom with globals enabled; `src/setupTests.ts` loads jest-dom matchers.

Before suggesting a commit, run the full CI sequence locally:
`npm run lint && npm run format:check && npm run typecheck && npm run test:run && npm run build`.

Dataset, from `data/` (not part of CI; see `data/README.md`):

```sh
npm install
npm run build          # node build.ts: downloads pinned sources to .cache/, writes frontend/public/data/
npm run typecheck      # tsc --noEmit
```

Regenerating should leave `git status` clean unless the script or sources changed.

Backend, from `backend/` (Java 25; `.\mvnw.cmd` in PowerShell, `./mvnw` in Git Bash):

```sh
./mvnw spring-boot:run   # http://localhost:8080/api/health; Vite proxies /api to it
./mvnw verify            # compile, test, package, Spotless check (what CI runs)
./mvnw spotless:apply    # format Java (google-java-format)
./mvnw test -Dtest=HealthEndpointTests   # one test class
```

## Backend (ADR 0010)

- Every endpoint lives under `/api`, the one prefix the Vite dev proxy forwards.
  `web/ApiPathConfig` adds it to every `@RestController`, so controllers map paths
  without it (`@GetMapping("/scores")` → `/api/scores`). Actuator is moved there too,
  with only `health` exposed. Keep the browser on one origin (no CORS).
- Country data is not served by the API; it stays static (ADR 0001).
- PostgreSQL + Flyway + Testcontainers arrive with the first table; no H2.
- The frontend reaches the API only through `frontend/src/data/`.

## CI

`.github/workflows/ci.yml` has two jobs. `frontend (lint, typecheck, test)`:
`npm ci` → lint → format check → typecheck → `vitest run` → build.
`backend (build, test)`: `./mvnw -B verify`. `main` is protected by a ruleset that
requires the frontend check (and the backend check once it is added). Renaming a job
breaks its required check. Don't add path filters: a skipped required check stays
pending.

## Gotchas

- `@emnapi/core` and `@emnapi/runtime` are pinned as devDependencies on purpose. npm on
  Windows drops them from the lockfile, which breaks `npm ci` on Linux CI. Do not remove
  them. After `npm install` changes the lockfile, check they are still in it.
- TypeScript is pinned to `~6.0`, because typescript-eslint does not support TS 7 yet.
- `.gitattributes` forces LF line endings. The developer's Git has `core.autocrlf=true`,
  and files with CRLF fail `format:check` locally even though CI passes. If Prettier
  flags a whole file you didn't edit, check its line endings first.
- Prettier only checks `frontend/`. Root Markdown files (like this one) can be formatted
  with `npx prettier --config .prettierrc.json --write ../<file>` from `frontend/`. The
  `--config` flag is required: Prettier looks for config from the file's own directory,
  so without it root and `data/` files get Prettier's defaults.
- Don't write files with PowerShell `Set-Content` or `-replace` round trips: they mangle
  UTF-8 (… ✓ ²) and add a BOM. Use the Edit/Write tools, or Python/Node with UTF-8.
- Stopping a background `npx vite` task leaves the node process running. Kill it by
  port, after checking that the process's command line is vite.
- jsdom can't test gestures, real focus or accessibility behaviour. For those, drive
  headless Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe` with
  `--headless=new --remote-debugging-port=...`) over the DevTools protocol with Node
  24's built-in WebSocket: clicks, wheel, keys, screenshots,
  `Accessibility.getFullAXTree`. Keep such scripts in the scratchpad, not the repo.
- When a test guards a fix, temporarily undo the fix and check that the test fails.
- `backend/mvnw` must be committed as executable, or CI fails with "Permission denied".
  Git on Windows doesn't record it: `git add --chmod=+x backend/mvnw`.

## Workflow

Every feature follows: **issue → branch → plan → build → PR → /code-review → CI green →
merge.** Conventional commits (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `test:`).
Never commit directly to `main`.

**The user does all git and GitHub actions** (issues, branches, commits, push, pull, PRs,
merges). Do not run them unless asked. Read-only commands (`git status`, `git diff`,
`git log`) are fine. Instead:

- write GitHub issue text (title + body) in a copyable block
- give the exact command for the branch to create
- say when to commit or push (after a coherent step that passes the checks), with exact
  commands and a conventional commit message
- when a PR is due, write the title and description in a copyable markdown block
  following `.github/pull_request_template.md`, ending with `Closes #N`

After each merged PR (or earlier if the conversation gets long), recommend starting a
new conversation, get everything ready for the switch, and give a paste-ready handoff
message.

## Code review format

When reporting review findings (from `/code-review` or otherwise), group them by
severity, most severe first, with the marker at the start of each finding:

- 🔴 **Critical:** must fix before merge (bugs, broken behavior, wrong docs, security)
- 🟠 **Recommended:** should fix, but not blocking (robustness, maintainability)
- 🔵 **Suggestion:** optional, nice to have (small cleanups, polish)

Each finding: file and line, one-line problem, why it matters, suggested fix. If you
disagree with a finding, say so and why instead of listing it as-is.
