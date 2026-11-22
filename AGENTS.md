<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->


## Core Principles

**Only build what is asked.** No extra features, abstractions, or "nice to haves" unless requested. If a one-liner solves it, use it.

**Don't repeat yourself, but don't abstract prematurely.** Three similar lines is fine. A shared helper earns its place only when a third call site appears.

**Smallest change that works.** Bug fix? Fix the bug — don't refactor the surrounding code. One-shot operation? No helper needed.

**No defensive dead code.** No error handling, fallbacks, or validation for scenarios that cannot happen. Trust framework guarantees; only validate at real boundaries (user input, external APIs).

**No comments that explain what the code does.** Only comment the _why_ — hidden constraints, non-obvious invariants, workarounds. If a future reader wouldn't be confused without it, don't write it.

**TypeScript: strict by default.** `unknown` over `any`, infer types from Zod schemas, use discriminated unions. No type assertions without justification.

## Agent Rules

- Do not delegate work.
- Work ony use maximum 5 sub-agents only.
- Ask for approval before spawning any additional process.
- Never use parallel research.
- Use only one execution context.
- Ask for approval before running expensive searches.
- Limit output to the minimum needed.
- Always ask permission when deleting a file, and show why we are deleting the file

## Stack

| Layer      | Tech                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| API        | Hono + oRPC (Node.js server)                                                                                                                        |
| Frontend   | React 19 + Vite 7 + TanStack Router + Tailwind CSS 3                                                                                                |
| Database   | PostgreSQL — raw SQL, no ORM. **SQLite is test-only** (in-memory via `NODE_ENV=test`). Set `DATABASE_URL=postgresql://...` in `.env` for local dev. |
| Auth       | Better Auth — email/password (credential) + OAuth                                                                                          |
| Validation | Zod — always infer types from schemas                                                                                                               |
| UI         | shadcn/ui + Radix UI (`packages/ui`)                                                                                                                |
| Testing    | Vitest + Testing Library                                                                                                                            |
| Logging    | Pino                                                                                                                                                |
| RPC        | oRPC                                                                                                                                                |


## Key Commands

```bash
pnpm dev          # start all dev servers
pnpm build        # build all packages
pnpm lint         # ESLint across all packages
pnpm check-types  # TypeScript across all packages
pnpm test         # run all tests
pnpm db:migrate   # run DB migrations
pnpm db:seed      # seed database
pnpm db:reset     # ⚠ drops everything — confirm with user first
```

## Coding Rules

**TypeScript** — Use `unknown` over `any` (test files excepted), infer types from Zod schemas, use discriminated unions. Strict mode is on in all tsconfigs.

**Testing** — Every feature, bug fix, and service change requires unit + edge case tests. Tests live in beside the code it is testing.

**API endpoints** — All endpoints require Zod input/output schemas and appear in OpenAPI (`/v1/docs`). Always validate auth and permissions on protected routes.

**Logging** — Use Pino (`apps/api/src/services/logger.ts`), not `console.log`. Include `requestId`, `userId`, `durationMs`.

**Errors** — Throw typed error classes (`new ValidationError(...)`). Sanitize all responses before sending to clients.

**Secrets** — if not using Docker load from `.env` files via typed config (`apps/api/src/config/index.ts`), in docker it is should live in env variables.

**Unused vars & exports** — Before finishing any task, remove all unused variables, imports, and `export` keywords with no external consumers. Run `pnpm lint` to catch unused variable violations.

## Definition of Done

**Before marking any task done, ALL of the following must pass — run them, fix failures, repeat:**

- `pnpm lint` — zero errors
- `pnpm check-types` — zero TS errors
- `pnpm test` — all tests pass for affected packages
- Run `/fallow` skill — no new issues introduced
- `pnpm fallow:security` — zero medium/high findings (low severity is ignored)
- OpenAPI updated if any endpoint changed
- No unused imports, variables, or exports

**Security Review Loop**

After generating code or applying any fix:

- Review for security vulnerabilities
- Fix any vulnerabilities found
- Review again
- Repeat until no critical issues remain

These are not optional. Do not report a task as complete until every check is green.

## Auth

Two user types, both managed by Better Auth:

| Type             | Provider ID  | Schema                 | Notes                      |
| ---------------- | ------------ | ---------------------- | -------------------------- |
| Email / password | `credential` | `credentialUserSchema` | Includes `role` field      |
| Facebook OAuth   | `facebook`   | `facebookUserSchema`   | Name/email populated by FB |

Roles: `admin | moderator | freelancer | client` (default: `freelancer`). Defined in `packages/schemas/src/auth.ts`.

Better Auth core tables: `user`, `session`, `account`, `verification`. Do not add auth logic outside of the Better Auth instance.

## File Layout

```
apps/api/src/     routers → controllers → services pattern
apps/web/src/     routes/ (file-based) → pages/ → components/
packages/db/      migrations/, seeds/, types/
packages/schemas/ shared Zod schemas (used by API and web)
  └─ src/auth.ts  credential + Facebook user schemas, Role enum
packages/ui/      shadcn/ui component library
```

Before working on ESLint/Prettier config, Docker, integration connectors, Git hooks, performance, or security — read `.claude/coderules.md` first.

## Graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost)