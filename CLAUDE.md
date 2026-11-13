# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Geo Quiz: a browser geography quiz (country names, capitals, flags, locations). It is a
personal learning project. Repo: `github.com/kiple03/geo-quiz`, default branch `main`.

| Path              | Contents                                                                         |
| ----------------- | -------------------------------------------------------------------------------- |
| `frontend/`       | Vite 8 + React 19 + TypeScript 6.0, ESLint, Prettier, Vitest + RTL               |
| `data/`           | Country dataset generation script (to be built)                                  |
| `backend/`        | Placeholder. Spring Boot API arrives in Phase 4 (scores, accounts, leaderboards) |
| `docs/decisions/` | ADRs (`NNNN-short-title.md`). Never rewrite an accepted ADR; supersede it        |

## Architecture: static data first (ADR 0001)

Read [docs/decisions/0001-static-data-first.md](docs/decisions/0001-static-data-first.md).

- Country data is generated ahead of time by a script in `data/` and committed as static
  JSON that the frontend loads directly. There is no backend and no runtime API for now.
- Keep the JSON schema stable and typed in the frontend, so the Phase 4 backend can serve
  the same shape and the frontend can switch to an API with minimal changes.
- The client downloads the whole dataset, so watch its size (especially future map
  geometry).
- Significant decisions get a new ADR in `docs/decisions/` and a row in its `README.md`.

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

## CI

`.github/workflows/ci.yml` has one job, `frontend (lint, typecheck, test)`:
`npm ci` → lint → format check → typecheck → `vitest run` → build. `main` is protected by
a ruleset that requires this check. Renaming the job breaks the required check.

## Gotchas

- `@emnapi/core` and `@emnapi/runtime` are pinned as devDependencies on purpose. npm on
  Windows drops them from the lockfile, which breaks `npm ci` on Linux CI. Do not remove
  them. After `npm install` changes the lockfile, check they are still in it.
- TypeScript is pinned to `~6.0`, because typescript-eslint does not support TS 7 yet.
- `.gitattributes` forces LF line endings. The developer's Git has `core.autocrlf=true`,
  and files with CRLF fail `format:check` locally even though CI passes. If Prettier
  flags a whole file you didn't edit, check its line endings first.
- Prettier only checks `frontend/`. Root Markdown files (like this one) can be formatted
  with `npx prettier --config .prettierrc.json --write ../<file>` from `frontend/`.

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
