# AI Coding Instructions for ModernIPTVPlayer

This monorepo uses **pnpm workspaces** with **Turborepo** for orchestration. The project is a Next.js 16 web application with **Better Auth** for authentication and **Prisma** with PostgreSQL for database.

## Project Structure

```
apps/web/          # Next.js 16 application (port 3001)
packages/
  auth/            # Better Auth server configuration
  db/              # Prisma client and schema
  config/          # Shared TypeScript/ESLint config
  env/             # Environment variables (server/client)
```

## Key Commands

| Command            | Description                                        |
| ------------------ | -------------------------------------------------- |
| `pnpm dev`         | Start all apps in Turborepo                        |
| `pnpm dev:web`     | Start only web app                                 |
| `pnpm build`       | Build all packages (generates Prisma client first) |
| `pnpm db:push`     | Push Prisma schema to database                     |
| `pnpm db:studio`   | Open Prisma Studio                                 |
| `pnpm db:generate` | Generate Prisma client                             |
| `pnpm check-types` | Run TypeScript type checking                       |

## Architecture Patterns

### Authentication

- **Server**: `packages/auth/src/index.ts` exports configured `better-auth` instance with Prisma adapter
- **Client**: `apps/web/src/lib/auth-client.ts` exports `authClient` using `createAuthClient`
- Auth API routes: `apps/web/src/app/api/auth/[...all]/route.ts`
- Sign-in/up forms: Client components using `@daveyplate/better-auth-ui`

### Database

- Prisma schema in `packages/db/prisma/schema/auth.prisma` and `schema.prisma`
- Models: `User`, `Session`, `Account`, `Verification`
- Always run `pnpm db:generate` after modifying schemas

### UI Components

- Uses **shadcn/ui** components in `apps/web/src/components/ui/`
- Styling: Tailwind CSS v4 with `@base-ui/react` for components
- Theme provider: `apps/web/src/components/theme-provider.tsx`
- Icons: `lucide-react`

### Server Components

- All pages in `apps/web/src/app/` are Server Components by default
- Use `use client` directive for client-side interactivity
- Auth hooks via `useSession` from `better-auth/react`

## Important Conventions

1. **Environment variables**: Use `@moderniptvplayer/env` package - import from `@moderniptvplayer/env/server` for server-side, `@moderniptvplayer/env/web` for client-side
2. **Tailwind v4**: Uses CSS-first configuration with `@theme` directive, not `tailwind.config.js`
3. **Linting**: Biome (`pnpm check` / `pnpm lint`), not ESLint
4. **Prisma in build**: Web build depends on db package generating the client first (configured in `turbo.json`)

## External Dependencies

- **Next.js 16** with React 19
- **Better Auth** for authentication
- **Prisma** with PostgreSQL
- **shadcn/ui** component registry
- **TanStack React Form** for form handling
- **Zod** for validation

## Key Files Reference

- Auth setup: `packages/auth/src/index.ts`
- Client auth: `apps/web/src/lib/auth-client.ts`
- Providers: `apps/web/src/components/providers.tsx`
- Prisma schema: `packages/db/prisma/schema/auth.prisma`
- Turborepo config: `turbo.json`
- Package workspaces: `pnpm-workspace.yaml`

## Providers Component

The main providers wrapper (`apps/web/src/components/providers.tsx`) includes:

- **ThemeProvider** - Dark/light mode with `next-themes`
- **SidebarProvider** - From shadcn sidebar component
- **TooltipProvider** - For tooltip components
- **AuthUIProvider** - From `@daveyplate/better-auth-ui` with session handling
- **Toaster** - From `sonner` for toast notifications

Auth automatically refreshes the router on session changes.
