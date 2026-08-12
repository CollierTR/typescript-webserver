# Chirpy

A lightweight Twitter-style REST API built with TypeScript and Express. Users can create accounts, log in, and post short "chirps" — no more than 140 characters. It also includes a "Chirpy Red" premium subscription flow triggered via webhooks.

## Why you'd care

This project shows a complete, production-shaped backend in TypeScript:

- **Authentication** — `argon2` password hashing, signed JWTs, refresh tokens, and token revocation.
- **Database** — PostgreSQL with Drizzle ORM, schema-as-code migrations, and typed queries.
- **REST API** — users, chirps (CRUD), metrics, and webhook integration, all behind a central error-handling layer.
- **Developer experience** — TypeScript strict mode, automated tests with Vitest, and a `tsc --watch` + nodemon dev loop.

It's a clean reference for how a small API server is structured: schema, queries, auth, middleware, and routes kept in separate modules.

## Getting started

### Prerequisites

- Node.js 22+
- PostgreSQL running locally

### Setup

1. Clone the repo and install dependencies:

   ```sh
   npm install
   ```

2. Create a `.env` file in the project root. A `DB_URL` and `SIGNING_KEY` are required; `PLATFORM` gates dev-only routes:

   ```env
   DB_URL="postgres://postgres:@localhost:5432/chirpy?sslmode=disable"
   SIGNING_KEY="your-random-jwt-secret"
   PLATFORM="dev"
   ```

3. Create the database (if it doesn't exist):

   ```sh
   createdb chirpy
   ```

4. Generate and apply the schema migrations:

   ```sh
   npm run generate
   npm run migrate
   ```

### Running

```sh
npm run dev
```

The server starts on `http://localhost:8080`. There's also a small static site served at `/app`.

### Other scripts

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `npm run build`      | Compile TypeScript to `dist/`                 |
| `npm start`          | Run the compiled server                       |
| `npm run dev`        | Watch-mode compile + auto-restart on changes  |
| `npm test`           | Run the Vitest test suite                     |
| `npm run generate`   | Generate a new Drizzle migration              |
| `npm run migrate`    | Apply pending migrations                      |

## API overview

| Method | Endpoint                | Description                          |
| ------ | ----------------------- | ------------------------------------ |
| POST   | `/api/users`            | Create a user                        |
| PUT    | `/api/users`            | Update your email/password (auth)    |
| POST   | `/api/login`            | Log in, returns JWT + refresh token  |
| POST   | `/api/refresh`          | Exchange a refresh token for a JWT   |
| POST   | `/api/revoke`           | Revoke a refresh token (auth)        |
| GET    | `/api/chirps`           | List chirps                          |
| GET    | `/api/chirps/:chirpId`  | Get a single chirp                   |
| POST   | `/api/chirps`           | Create a chirp (auth)                |
| DELETE | `/api/chirps/:chirpId`  | Delete your own chirp (auth)         |
| POST   | `/api/polka/webhooks`   | Webhook to upgrade a user to Chirpy Red |
| GET    | `/api/healthz`          | Health check                         |

Protected endpoints expect an `Authorization: Bearer <token>` header.

## Tech stack

- [Express](https://expressjs.com/) 5
- [TypeScript](https://www.typescriptlang.org/)
- [Drizzle ORM](https://orm.drizzle.team/) + [postgres](https://github.com/porsager/postgres)
- [argon2](https://github.com/ranisalt/node-argon2)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [Vitest](https://vitest.dev/)
