# Backend

Spring Boot API for the features that need a server: accounts, saved scores and
leaderboards (Phase 4). The stack and its reasons are in
[ADR 0010](../docs/decisions/0010-backend-stack.md). Country data is not served here;
the frontend loads it as static files
([ADR 0001](../docs/decisions/0001-static-data-first.md)).

Today it has one endpoint, `GET /api/health`.

## Requirements

Java 25 (e.g. Eclipse Temurin). Maven comes with the wrapper: use `./mvnw` (Git Bash,
macOS, Linux) or `.\mvnw.cmd` (PowerShell).

## Commands

Run from `backend/`:

```sh
./mvnw spring-boot:run    # http://localhost:8080/api/health
./mvnw test               # tests only
./mvnw verify             # compile, test, package, formatting check (what CI runs)
./mvnw spotless:apply     # format the Java code
./mvnw clean verify       # same as verify, from scratch
```

## With the frontend

Start the backend, then `npm run dev` in `frontend/`. Vite forwards every request under
`/api` to `http://localhost:8080`, so the app calls `/api/...` on its own origin
(`http://localhost:5173/api/health`), with no CORS setup.

## Layout

| Path                                        | Contents                                       |
| ------------------------------------------- | ---------------------------------------------- |
| `pom.xml`                                   | Dependencies, Java version, Spotless           |
| `src/main/java/io/github/kiple03/geoquiz`   | Application code                               |
| `src/main/resources/application.properties` | Settings (`/api` base path, exposed endpoints) |
| `src/test/java/...`                         | Tests (JUnit 5, MockMvc)                       |
