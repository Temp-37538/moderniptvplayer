# Agent Guide for moderniptvplayer

This guide provides essential information for AI coding agents working in this repository.

## Project Overview

A modern IPTV player built with Next.js, TypeScript, Prisma, and Better Auth in a Turborepo monorepo.

**Stack:**
- Next.js 16 (App Router with React 19)
- TypeScript (strict mode)
- Prisma 7 with Neon PostgreSQL
- Better Auth for authentication
- Tailwind CSS v4 + shadcn/ui
- pnpm workspaces + Turborepo
- Ultracite (Biome-based) for linting/formatting

**Structure:**
```
apps/
  web/              # Next.js application (port 3001)
packages/
  auth/             # Better Auth configuration
  db/               # Prisma schema & client
  env/              # Environment variable validation
  config/           # Shared TypeScript config
```

---

## Build, Lint, and Test Commands

### Root-level commands (run from repository root):

```bash
# Development
pnpm dev                    # Start all apps in dev mode
pnpm dev:web               # Start only web app
pnpm dev:native            # Start only native app (if exists)

# Build & Type Checking
pnpm build                 # Build all apps and packages
pnpm check-types           # Type check all workspaces

# Linting & Formatting
pnpm check                 # Check code quality (Ultracite/Biome)
pnpm fix                   # Auto-fix code issues

# Database (via @moderniptvplayer/db package)
pnpm db:push               # Push schema to database (dev)
pnpm db:generate           # Generate Prisma client
pnpm db:migrate            # Run migrations (dev)
pnpm db:studio             # Open Prisma Studio UI
```

### Package-specific commands:

```bash
# Web app (from apps/web/)
pnpm dev                   # Next.js dev server on port 3001
pnpm build                 # Production build
pnpm start                 # Start production server

# DB package (from packages/db/)
pnpm db:push               # Direct Prisma commands
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

### Testing

**Note:** No test framework is currently configured. If tests are added in the future, use:
- `pnpm test` for all tests
- `pnpm test -- path/to/test.test.ts` for a single test file

---

## Code Style Guidelines

This project enforces code quality via **Ultracite** (Biome under the hood). Always run `pnpm fix` before committing.

### Imports

**Order:**
1. External packages (from node_modules)
2. Internal workspace packages (`@moderniptvplayer/*`)
3. Relative imports (`./ or ../`)

**Style:**
- Use named imports when possible
- Avoid namespace imports (`import * as`)
- Avoid barrel files (index re-exports)
- Group related imports together with blank lines between groups

**Example:**
```typescript
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
```

### TypeScript

**Type Safety:**
- Explicit types for function parameters and return values (when clarity is needed)
- Use `unknown` over `any` for truly unknown types
- Leverage type narrowing instead of type assertions
- Use `as const` for immutable values and literal types
- Enable strict mode (already configured in tsconfig)
- `noUncheckedIndexedAccess: true` is enabled (array access returns `T | undefined`)

**Naming Conventions:**
- `camelCase` for variables, functions, parameters
- `PascalCase` for types, interfaces, components
- `UPPER_SNAKE_CASE` for constants (extracted magic numbers)
- Descriptive names over abbreviations

**Module System:**
- Use ESM (`import`/`export`, not `require`)
- `type: "module"` is set in package.json
- `verbatimModuleSyntax: true` in tsconfig (use `import type` for types)

### React & Next.js

**Components:**
- Function components only (no class components)
- Default export for pages/layouts, named exports elsewhere
- Keep components small and focused
- Don't define components inside other components

**Hooks:**
- Call hooks at top level only (never conditionally)
- Specify all dependencies in dependency arrays
- Use `useForm` from `@tanstack/react-form` for forms

**Next.js Patterns:**
- Use App Router (not Pages Router)
- Server Components by default, mark Client Components with `"use client"`
- Use `next/navigation` for routing (`useRouter`, `redirect`, etc.)
- Use metadata API for SEO (export `metadata` in layouts/pages)
- Use Next.js `<Image>` component, not `<img>`

**React 19:**
- Use `ref` as a prop (not `forwardRef`)

**Accessibility:**
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- Provide `alt` text for images
- Use proper heading hierarchy
- Add labels to form inputs
- Include keyboard handlers alongside mouse events

### Error Handling

- Throw `Error` objects with descriptive messages (not strings)
- Use `try-catch` meaningfully (don't catch just to rethrow)
- Use early returns for error cases
- Remove `console.log`, `debugger`, `alert` from production code
- Use `toast.error()` for user-facing errors (via `sonner`)

### Async/Await

- Always `await` promises in async functions
- Use `async/await` over promise chains
- Handle errors with try-catch blocks
- Never use async functions as Promise executors

### Modern JavaScript

- `const` by default, `let` when reassignment needed, never `var`
- Arrow functions for callbacks and short functions
- `for...of` loops over `.forEach()` and indexed `for`
- Optional chaining (`?.`) and nullish coalescing (`??`)
- Template literals over string concatenation
- Destructuring for objects and arrays
- Spread syntax (avoid in accumulators within loops)

### Security

- Add `rel="noopener"` with `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Never use `eval()` or direct `document.cookie` assignment
- Validate and sanitize user input

### Performance

- Use top-level regex literals (not in loops)
- Avoid spread in loop accumulators
- Prefer specific imports over namespace imports
- Avoid barrel files

### Formatting

Formatting is handled automatically by Biome via Ultracite. Key points:
- Tabs for indentation
- Double quotes for strings
- Semicolons required
- Trailing commas in multi-line

---

## Database & Prisma

- Schema located in `packages/db/prisma/schema.prisma`
- Generated client in `packages/db/prisma/generated/client`
- Uses Neon Postgres with Prisma Adapter (`@prisma/adapter-neon`)
- Import client: `import prisma from "@moderniptvplayer/db"`

**Workflow:**
1. Update schema in `packages/db/prisma/schema.prisma`
2. Run `pnpm db:push` (dev) or `pnpm db:migrate` (prod)
3. Run `pnpm db:generate` to update client types

---

## Authentication

- Uses Better Auth (`better-auth` package)
- Configuration in `packages/auth/src/index.ts`
- Email/password authentication enabled
- Client-side hooks via `@/lib/auth-client` (web app)
- API route at `apps/web/src/app/api/auth/[...all]/route.ts`

---

## Environment Variables

- Managed via `@moderniptvplayer/env` package
- Validated with Zod schemas
- Import: `import { env } from "@moderniptvplayer/env/server"` or `/client`
- Never commit `.env` files

---

## Git Workflow

- Always run `pnpm fix` before committing
- Write clear commit messages focusing on "why" not "what"
- Don't commit commented-out code or debug statements

---

## Key Dependencies

- `@tanstack/react-form` - Form state management
- `sonner` - Toast notifications
- `clsx` + `tailwind-merge` - Utility for className merging (see `lib/utils.ts`)
- `shadcn` - UI component library (Base UI + Tailwind)
- `zod` - Schema validation

---

## Important Notes

- Package manager: **pnpm 10.28.2** (check `packageManager` in root package.json)
- Node version: Modern LTS (22+ based on `@types/node`)
- Dev server runs on port **3001** (not 3000)
- Turbo caching enabled for builds, disabled for dev/db commands
- Always test changes by running `pnpm check-types` and `pnpm check`
