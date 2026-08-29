# Library Management System — Backend

Production-shaped Express + MySQL API. This scaffold currently implements the
**auth module end-to-end**; other modules (books, borrow, reservations, fines...)
plug into the same layered structure.

## Architecture

```
Controller (HTTP) → Service (business logic) → Model/Repository (data access)
```

- **Controllers** only parse the request and shape the response — no business logic.
- **Services** hold all business rules and are framework-agnostic (easy to unit test).
- **Models** (Sequelize) map directly to MySQL tables.
- Every route is validated (Zod), authenticated (JWT), and authorized (RBAC) declaratively
  at the router level — you can read a route's security requirements without opening the file.

## What's implemented

- Register / login with bcrypt password hashing (12 salt rounds)
- Access token (short-lived, 15m) + refresh token (7d) issued as an httpOnly, `SameSite=strict` cookie
- **Refresh token rotation with reuse detection** — every refresh issues a new token and revokes
  the old one; if a revoked token is replayed, every session for that user is killed
- Account lockout after 5 failed login attempts (15 min lock)
- Change-password flow that revokes all existing sessions
- Centralized error handling with a consistent JSON envelope
- Request validation middleware (Zod schemas per route)
- RBAC middleware (`authorize('admin', 'librarian')`)
- Rate limiting (stricter on auth routes than the rest of the API)
- Structured logging (Winston, JSON in production)
- Health check endpoint for load balancers/uptime monitors
- Graceful shutdown (SIGTERM/SIGINT drain connections before exit)
- Dockerized (multi-stage build, non-root user, container healthcheck) + docker-compose with MySQL
- Sequelize migrations (don't rely on `sync()` outside development)
- Integration tests (Jest + Supertest) covering the full auth flow

## Getting started

```bash
cp .env.example .env      # fill in real secrets
npm install
npm run migrate           # create tables
npm run dev                # http://localhost:5000
```

Or with Docker:

```bash
cp .env.example .env
docker compose up --build
```

## API quick reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Create a member account |
| POST | `/api/v1/auth/login` | — | Returns access token + sets refresh cookie |
| POST | `/api/v1/auth/refresh` | refresh cookie | Rotates tokens |
| POST | `/api/v1/auth/logout` | refresh cookie | Revokes the current session |
| GET | `/api/v1/auth/me` | Bearer token | Current user profile |
| POST | `/api/v1/auth/change-password` | Bearer token | Rotates password, kills all sessions |

## Next modules to add (same pattern)

Each follows `modules/<name>/{*.routes,*.controller,*.service,*.validation}.js`:

1. `books` — CRUD + full-text search + pagination
2. `borrow` — checkout/return/renew against `book_copies`
3. `reservations` — hold queue
4. `fines` — ledger + payment
5. `reports` — admin analytics

## Testing

```bash
npm test
```

Uses a separate `<DB_NAME>_test` database (see `src/config/sequelize-cli.config.js`) so tests
never touch development data.
