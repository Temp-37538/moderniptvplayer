# moderniptvplayer

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Self, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Prisma** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Prisma.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/web/.env` file with your PostgreSQL connection details.

3. Apply the schema to your local database:

```bash
pnpm run db:migrate
```

`pnpm run db:push` can sync a disposable local database without migration history. Prefer `db:migrate` when you want the same migration files that production uses.

### Production migration order

Category pin, hide, and adult lock read `category_preference` and `user_safety_preference`. M3U playlists read `playlist.source`, `playlist.m3uUrl`, and `playlist.identityKey`. Apply migrations to the production database before the application that serves requests starts running this code:

```bash
pnpm run db:deploy
```

`db:deploy` runs `prisma migrate deploy` once per release. The app does not migrate on each request. `pnpm run build` and the Vercel build only generate the Prisma client (`pnpm run db:generate`). Deploying the app first, while those columns or tables are missing, makes playlist create, category pages, search, and stream routes fail their reads.

`20261106180000_m3u_playlist` adds the M3U columns and backfills `identityKey` for existing Xtream rows as `serverUrl`, a newline, then `username`. It does not rewrite favorites, watch later, watch progress, or category preferences. Those rows keep the same playlist id. Run it after `20261106000000_category_preferences` and before serving this build. Existing Xtream playlists stay `source = XTREAM`.

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

## Project Structure

```
moderniptvplayer/
├── apps/
│   └── web/         # Fullstack application (Next.js)
├── packages/
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Create and apply migrations in local development (`prisma migrate dev`)
- `pnpm run db:deploy`: Apply existing migrations to the target database (`prisma migrate deploy`). Run this against production before serving the new app
- `pnpm run db:studio`: Open database studio UI
