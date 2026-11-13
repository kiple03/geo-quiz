# Frontend

Vite + React + TypeScript. See the [root README](../README.md) for setup.

| Script                 | What it does                    |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Start the dev server            |
| `npm run build`        | Type-check and build to `dist/` |
| `npm run preview`      | Serve the production build      |
| `npm run lint`         | ESLint                          |
| `npm run typecheck`    | `tsc -b`                        |
| `npm run format`       | Format with Prettier            |
| `npm run format:check` | Check formatting                |
| `npm test`             | Vitest in watch mode            |
| `npm run test:run`     | Vitest single run (CI)          |

TypeScript is pinned to 6.0.x because typescript-eslint does not support TypeScript 7 yet.
