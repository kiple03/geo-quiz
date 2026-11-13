# 0001. Static country data first, backend later

- **Status:** Accepted
- **Date:** 2026-11-13

## Context

The quiz needs country data (names, capitals, flags, regions, and later shapes for map
questions). This data changes rarely. We want a playable game as early as possible, and
running a server, database and deployment pipeline from day one would slow that down
without adding anything the player can see.

Features that do need a server — accounts, saved scores, leaderboards — are not needed
for the first playable versions.

## Decision

- Country data is produced by a generation script in `/data` and committed as static
  JSON that the frontend loads directly (bundled, or served from `public/`).
- There is no backend for now. The frontend is a static site and can be hosted anywhere.
- A Spring Boot backend is introduced in Phase 4, when features that need persistence
  (scores, accounts, leaderboards) are built.

## Consequences

- **Positive:** No runtime dependencies or hosting costs; fast local iteration; the game
  works offline once loaded; easy to deploy as a static site.
- **Negative:** Updating data requires re-running the script and redeploying. The full
  dataset is downloaded by the client, so its size must be watched (especially map
  geometry).
- **Follow-up:** Keep the JSON schema stable and typed in the frontend so the Phase 4
  backend can serve the same shape, and the frontend can switch from static files to an
  API with minimal changes.
