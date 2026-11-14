# Geo Quiz

A browser-based geography quiz game. Players are tested on countries: where they are on
the map, and later their capitals and flags.

The game starts as a fully static frontend: country data is generated ahead of time and
shipped as JSON alongside the app. A backend is added later (Phase 4). See
[ADR 0001](docs/decisions/0001-static-data-first.md).

## How to play

Pick **Find the country** in the menu. Each round has 10 questions: a country is named,
and you click it on the world map. A correct click turns the country green; a wrong one
turns red and shows the right country in green. The results list every question.

## Roadmap

| Phase | Scope                                                                 | Status  |
| ----- | --------------------------------------------------------------------- | ------- |
| 1     | Country dataset and world map geometry (`data/`)                      | Done    |
| 2     | First playable map quiz, main menu, modular game structure            | Done    |
| 3     | Capital and flag modes; map polish (zoom, markers for tiny countries) | Planned |
| 4     | Spring Boot backend: accounts, saved scores, leaderboards             | Planned |

## Repository layout

| Path              | Contents                                                              |
| ----------------- | --------------------------------------------------------------------- |
| `frontend/`       | Vite + React + TypeScript app (ESLint, Prettier, Vitest)              |
| `data/`           | Script that generates the country data and map (see `data/README.md`) |
| `backend/`        | Spring Boot API, placeholder until Phase 4                            |
| `docs/decisions/` | Architecture Decision Records (ADRs)                                  |

The frontend is built to grow: game modes are plugins in a registry, and one round
engine runs every mode. See [ADR 0003](docs/decisions/0003-frontend-structure.md).

## Running locally

Requires Node.js 24 (see `.nvmrc`; run `nvm use` if you use nvm).

```sh
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Other useful commands, run from `frontend/`:

```sh
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run format        # Prettier (write)
npm run format:check  # Prettier (check only)
npm test              # Vitest, watch mode
npm run test:run      # Vitest, single run
npm run build         # Production build to frontend/dist
```
