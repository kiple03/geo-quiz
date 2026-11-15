# 0010. Backend stack: Spring Boot, Maven, PostgreSQL, one origin under /api

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

Phase 4 adds the features that need a server: accounts, saved scores and leaderboards
([ADR 0001](0001-static-data-first.md)). ADR 0001 already chose Spring Boot, and says
the frontend should be able to switch to an API with minimal changes. `RoundResult`
(`frontend/src/game/engine/types.ts`) is the shape a saved score will have
([ADR 0003](0003-frontend-structure.md)).

The first Phase 4 PR is a skeleton (a project that builds, tests and runs in CI, with a
health endpoint), so the later PRs only add features. This ADR records the stack those
PRs build on, including parts that arrive with them.

## Decision

- **Java 25 (LTS) and Spring Boot 4.1**, with the Web MVC and Actuator starters. Spring
  MVC, not WebFlux: the API is plain request/response over a database, and blocking
  code is simpler to write and test.
- **Maven, run through the wrapper (`backend/mvnw`).** The wrapper pins Maven 3.10 with
  a checksum, so CI and every machine build with the same version. Gradle would work
  too, but adds a second build language for no gain at this size. Code lives in the
  package `io.github.kiple03.geoquiz`.
- **Formatting is checked in the build.** Spotless with google-java-format (2-space
  indents, as in `.editorconfig`) runs `check` in `./mvnw verify`; `spotless:apply`
  fixes. This is the backend's `format:check`.
- **Every endpoint is under `/api`.** `ApiPathConfig` adds the prefix to every
  `@RestController`, so a controller maps `/scores` and is served at `/api/scores`.
  Actuator moves under `/api` too, with only `health` exposed (`GET /api/health`) and
  its discovery page at `GET /api` turned off. Tests check both.
- **One origin.** In dev, Vite proxies `/api` to the backend on port 8080, so the
  browser only talks to `localhost:5173`: no CORS configuration, and session cookies
  work as on any single site. Production should keep one origin as well (the hosting PR
  decides how). All API calls go through `frontend/src/data/` (ADR 0003).
- **PostgreSQL, from the first table on (not in the skeleton).** Flyway migrations
  define the schema; dev runs Postgres with Docker Compose, and tests use Testcontainers
  against the same Postgres version. No H2: its SQL dialect differs, so tests on it can
  pass where Postgres fails.
- **Country data stays static, and the API does not serve it.** This supersedes the
  follow-up in ADR 0001 (the backend serving the same shape, the frontend switching to
  an API); the rest of ADR 0001 stands. The frontend keeps loading the generated JSON
  files directly; serving them through the API would add load and latency for nothing.
  When scores are saved, the backend may read the same generated data to check answers,
  so there is still one schema.
- **CI: a second job, `backend (build, test)`,** that runs `./mvnw -B verify`. The
  frontend job and its name are unchanged, because the `main` ruleset requires it. No
  path filters: a required check that a filter skips stays pending forever.

## Consequences

- **Positive:** One build command (`./mvnw verify`) covers compile, tests, packaging
  and formatting, locally and in CI. The single `/api` prefix keeps the proxy, and later
  the production routing, to one rule.
- **Negative:** A second toolchain (Java 25, Maven) next to Node. CI runs the backend
  job on every PR, also frontend-only ones (about a minute with the Maven cache).
  Testcontainers needs Docker to run the backend tests once the database arrives.
- **Follow-up:** Auth (accounts, sessions or tokens, whether playing needs an account)
  gets its own ADR with the accounts PR. Hosting gets one with the deployment PR. Add
  the new CI check to the `main` ruleset once it has run.
