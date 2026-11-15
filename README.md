# Geo Quiz

A browser-based geography quiz game. Players are tested on countries: where they are on
the map, their capitals and their flags.

Country data is generated ahead of time and shipped as JSON alongside the app, so the
game itself needs no server ([ADR 0001](docs/decisions/0001-static-data-first.md)). A
Spring Boot backend for accounts, saved scores and leaderboards is being built in
Phase 4 ([ADR 0010](docs/decisions/0010-backend-stack.md)).

## How to play

Pick a game mode in the menu, and optionally one or more regions (Europe, Africa, ...).
Each round has 10 questions, and the results list every question with your answers.

| Mode                 | Question           | You answer by                         |
| -------------------- | ------------------ | ------------------------------------- |
| **Find the country** | A country is named | Clicking it on the world map          |
| **Name the capital** | A country is named | Picking its capital from four options |
| **Whose capital?**   | A capital is named | Picking its country from four options |
| **Name the flag**    | A flag is shown    | Picking its country from four options |
| **Pick the flag**    | A country is named | Picking its flag from four options    |

The map can be zoomed and dragged, and tiny countries get markers. Every mode can be
played with the keyboard: on the map, the arrow keys move from country to country
and Enter answers; in the other modes, press 1 to 4.

## Roadmap

| Phase | Scope                                                                 | Status  |
| ----- | --------------------------------------------------------------------- | ------- |
| 1     | Country dataset and world map geometry (`data/`)                      | Done    |
| 2     | First playable map quiz, main menu, modular game structure            | Done    |
| 3     | Capital and flag modes; map polish (zoom, markers for tiny countries) | Done    |
| 4     | Spring Boot backend: accounts, saved scores, leaderboards             | Started |

## Repository layout

| Path              | Contents                                                              |
| ----------------- | --------------------------------------------------------------------- |
| `frontend/`       | Vite + React + TypeScript app (ESLint, Prettier, Vitest)              |
| `data/`           | Script that generates the country data and map (see `data/README.md`) |
| `backend/`        | Spring Boot API (see `backend/README.md`)                             |
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

The backend needs Java 25. Run `./mvnw spring-boot:run` in `backend/` (PowerShell:
`.\mvnw.cmd spring-boot:run`); the dev server forwards `/api` to it. See
[backend/README.md](backend/README.md).
