# Geo Quiz

A browser-based geography quiz game. Players are tested on countries — names, capitals,
flags and locations.

The game starts as a fully static frontend: country data is generated ahead of time and
shipped as JSON alongside the app. A backend is added later (Phase 4). See
[ADR 0001](docs/decisions/0001-static-data-first.md).

## Repository layout

| Path               | Contents                                                      |
| ------------------ | ------------------------------------------------------------- |
| `frontend/`        | Vite + React + TypeScript app (ESLint, Prettier, Vitest)      |
| `data/`            | Country data generation script (placeholder)                  |
| `backend/`         | Spring Boot API — placeholder, added in Phase 4               |
| `docs/decisions/`  | Architecture Decision Records (ADRs)                          |

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
