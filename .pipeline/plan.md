# Implementation Plan

Status: PENDING

Denied commands: `git status --porcelain | head -5` (read-only repository inspection) — rejected by shell policy; not retried. No other commands were denied.

## Requirements (verbatim)

```text
replace @apps/web  to use vite instead of nextjs ...and remove all refrence on nextjs
```

REQ-1: `apps/web` runs in development and builds for production with Vite, not Next.js.
REQ-2: `apps/docs` (the other Next.js app) is migrated the same way.
REQ-3: No Next.js reference remains in code, config, assets, ignore files, READMEs, package manifests or `pnpm-lock.yaml` (English prose such as "next year" and TypeScript's `NodeNext` module mode are not Next.js references).
REQ-4: Shared Next-only config is deleted: `packages/typescript-config/nextjs.json`, `packages/eslint-config/next.js`, the `./next-js` export and the `@next/eslint-plugin-next` dependency.
REQ-5: The target is SSR-capable TanStack Start on Vite, not a client-only SPA (binding human decision; `docker-compose.yml:84-86` requires SSR loaders in the web container).
REQ-6: The migrated apps render a minimal page; the Turborepo/Vercel/Next marketing page is not preserved.
REQ-7: Repo wiring still works: turbo build outputs, per-package `dev`/`build`/`check-types`/`lint`, and the docker-compose `web` healthcheck.
REQ-8: Repo docs that describe the apps/stack (`AGENTS.md`, `docs/README.md`, both app READMEs) no longer claim Next.js, and the Vite/Tailwind statement in `AGENTS.md` is reconciled with what is actually installed.

The verbatim text is authoritative; the REQ list is its checkable index.

## Goal

Replace both Next.js apps (`apps/web`, `apps/docs`) with minimal SSR-capable TanStack Start (Vite 8) applications, delete every Next.js-specific dependency, config, asset and lockfile entry, and keep the Turborepo/docker wiring consistent with the new build output.

## Verified facts

- `apps/web` scripts are `next dev/build/start` + `next typegen && tsc --noEmit`, and it depends on `next@16.4.6` — `apps/web/package.json:7-11,15`.
- `apps/docs` is the same scaffold on port 3001 with the same `next` dependency — `apps/docs/package.json:7-11,15`.
- Both apps' tsconfigs extend `@repo/typescript-config/nextjs.json` and enable the `next` TS plugin — `apps/web/tsconfig.json:2-7`, `apps/docs/tsconfig.json:2-7`.
- Both apps' ESLint configs import `nextJsConfig` from `@repo/eslint-config/next-js` — `apps/web/eslint.config.js:1`, `apps/docs/eslint.config.js:1`.
- `@repo/eslint-config` exports `./next-js` and depends on `@next/eslint-plugin-next@16.3.4` — `packages/eslint-config/package.json:8,16`.
- `@repo/typescript-config/nextjs.json` is 12 lines: Next plugin, `module: ESNext`, `moduleResolution: Bundler`, `jsx: preserve` — `packages/typescript-config/nextjs.json:5-9`.
- `turbo.json` caches only `.next/**` for `build` — `turbo.json:8`.
- `@repo/ui` is source-exported (`./*` → `./src/*.tsx`) and `button.tsx` starts with `"use client"` — `packages/ui/package.json:5-7`, `packages/ui/src/button.tsx:1`.
- Both apps' `.gitignore` files ignore `/.next/`, `/out/` and `next-env.d.ts` — `apps/web/.gitignore:13-14,36`, `apps/docs/.gitignore:13-14,36`.
- The docker-compose `web` service runs `pnpm turbo run dev --filter=web`, binds port 3000, passes `VITE_*`/`API_INTERNAL_URL` env, documents SSR loaders, and health-checks `http://localhost:3000/health` — `docker-compose.yml:63-93` (command `:66`, env `:82-87`, comment `:84-86`, healthcheck `:93`); its `dockerfile: apps/web/Dockerfile` (`:65`) does not exist.
- `AGENTS.md` claims "React 19 + Vite 7 + TanStack Router + Tailwind CSS 3" — `AGENTS.md:43`; Tailwind is installed nowhere in the repo.
- `docs/README.md` describes both apps as Next.js and the ESLint config as containing `@next/eslint-plugin-next` — `docs/README.md:19-22`.
- Lockfile: `next@16.4.6` is a resolved package entry, `vite@8.3.8` is already resolved transitively, and no `@vitejs/plugin-react` package entry exists — `pnpm-lock.yaml:1745,1973`.
- Local runtime/toolchain versions: React/React DOM `19.2.8` (`apps/web/package.json:16-17`), Node `26.13.1` (`.nvmrc:1`), pnpm `11.25.0` and Node `>=24` (`package.json:29-31`).
- Both app READMEs are create-next-app boilerplate — `apps/web/README.md:1-36`, `apps/docs/README.md:1-36`.

## Assumptions

- A1: The change-budget block was not injected into this planner session; the plan uses the plugin defaults (3 new files, 5 modified files, 200 changed lines, 100 lines per file) from `.opencode/plugins/budget.js`. Confirm the real `.env` values are not stricter; otherwise re-estimate.
- A2: A minimal page (heading + `@repo/ui` `Button`) is acceptable for both apps; no marketing copy, fonts, CSS modules or images are carried over (binding human decision).
- A3: Committing the generated `src/routeTree.gen.ts` is acceptable. It is needed for `tsc` on a clean checkout; the alternative (gitignore + generate-before-typecheck) makes `pnpm check-types` fail on fresh clones.
- A4: `nitro` (latest published `3.0.261103-rc`, a pre-release) is **not** added. `vite build` already produces the SSR bundle; a production server entry point is a follow-up because the repo has no production serving path (`docker-compose` runs `turbo run dev`, and no root `start` script exists).
- A5: No new unit tests are added for the two apps: neither app has a `test` script or any test file today, and the change adds no logic beyond rendering a static page. Validation is build/type-check/lint plus a manual dev smoke. Adding jsdom/Vitest coverage is listed as out of scope.
- A6: The missing `apps/web/Dockerfile` (and `apps/api/Dockerfile`) is a pre-existing gap, not caused by this change; adding container build infrastructure is out of scope, so only the compose healthcheck path is corrected.
- A7: `pnpm install` (network) is permitted during the build; the human explicitly asked for the lockfile install step.
- A8: `pnpm lint` at the repo root (`biome check`) and the husky `fallow*` hooks are already broken (Biome and the `fallow:*` scripts are absent from the root manifest) and are not fixed here.
- A9: Version/API compatibility was verified during planning from the npm registry and the TanStack Start v1 docs (context7 `/websites/tanstack_start_framework_react`), not from the repository: `@tanstack/react-start@1.169.7` needs `node >=22.12.0` and accepts `vite >=8.0.0` (optional peer); `@tanstack/react-router@1.170.46` is the router version that release depends on; `@vitejs/plugin-react@6.3.0` accepts `vite ^8.0.0`; the documented file layout is `src/router.tsx` exporting `getRouter`, `src/routes/__root.tsx` with `HeadContent`/`Scripts`, route files under `src/routes`, generated `routeTree.gen.ts`, optional `src/client.tsx`/`src/server.ts`, and `tanstackStart()` before `viteReact()`. If the build contradicts this, stop and report instead of improvising a different framework setup.

## Open questions

None blocking. Two non-blocking items for the human to confirm at approval: A1 (real budget values) and A3 (committing `routeTree.gen.ts`). If the human wants a production SSR server or a `apps/web/Dockerfile` in this change, the plan must be extended before building.

## Proposed solution

Use the supported TanStack Start v1 setup on the Vite version already in the lockfile:

- One new shared tsconfig preset `packages/typescript-config/start.json` (ESNext + Bundler + `react-jsx` + `noEmit` + `vite/client` types), consumed by both apps. This replaces `nextjs.json` and avoids duplicating eight compiler options in two tsconfigs.
- Per app: `vite.config.ts` with `tanstackStart()` then `viteReact()`, `server.port` (3000/3001) and `server.host: true` (required for the docker port mapping).
- Per app: `src/router.tsx` (`getRouter`), `src/routes/__root.tsx` (document shell with `HeadContent`/`Scripts`), `src/routes/index.tsx` (minimal page using `@repo/ui`'s `Button`), plus the plugin-generated `src/routeTree.gen.ts`.
- Per app: package scripts become `vite dev`, `vite build`, `tsc --noEmit`, `eslint --max-warnings 0`; `next` is removed; ESLint switches to the existing `@repo/eslint-config/react-internal` (already used by `packages/ui`).
- After both manifests are edited, one `pnpm install` regenerates the lockfile without `next`/`@next/*`.
- Then delete the Next scaffolds, the shared Next configs, and the `"use client"` directive; update turbo outputs to the Vite/Start output directory, the compose healthcheck path, root/app ignore entries and the prose docs.

No new abstraction, no Tailwind, no Router-only setup, no Nitro. Everything reuses existing repo conventions (workspace packages, exact version pins, per-package ESLint, turbo tasks).

## Alternatives considered

1. Plain Vite SPA (`@vitejs/plugin-react` only) — rejected by the human: the compose file requires SSR.
2. `next build` with `output: "export"` — rejected: keeps Next as the framework.
3. Migrate only `apps/web` and keep `apps/docs` on Next — rejected by the human: repo-wide removal.
4. Nitro plugin for `.output/server/index.mjs` and a `start` script — rejected: the published `nitro` latest is the pre-release `3.0.261103-rc`, and nothing in the repo runs a production web server. Documented as follow-up.
5. Hand-rolled Vite SSR + TanStack Router without Start — rejected: more custom server code, and Start is the supported SSR path.
6. 1:1 port of the Turborepo/Vercel page — rejected by the human: minimal page.
7. Inline tsconfig overrides in both apps instead of a shared preset — rejected: duplicates the same compiler options twice and leaves `nextjs.json` without a successor.

## Change budget

- Configuration source: `.opencode/plugins/budget.js` defaults (the runtime-injected block was absent in this session — see A1).
- Max new files per task: 3
- Max existing files modified per task: 5
- Max changed lines per task (added + deleted): 200
- Max changed lines in any single file: 100
- Budget enforced: yes (plugin default; `AI_ENFORCE_CHANGE_BUDGET` not observed).
- Tasks exceeding a limit are marked `BUDGET_EXCEPTION_REQUIRED`; they are not approved by this plan.

## Task breakdown

| Task | Objective | New files | Modified files | Changed lines | Complexity | Status |
| ---- | --------- | --------- | -------------- | ------------- | ---------- | ------ |
| TASK-001 | Shared TanStack Start tsconfig preset | 1 | 0 | ~16 | LOW | READY |
| TASK-002 | `apps/web` package/config switch to Start | 1 | 4 | ~51 | MEDIUM | READY |
| TASK-003 | `apps/docs` package/config switch to Start | 1 | 4 | ~51 | MEDIUM | READY |
| TASK-004 | Delete shared Next configs + `"use client"` | 0 | 4 (2 deleted, 2 modified) | ~55 | MEDIUM | READY |
| TASK-005 | Install deps, regenerate lockfile | 0 | 1 | ~2,000–4,000 (lockfile) | HIGH | BUDGET_EXCEPTION_REQUIRED |
| TASK-006 | `apps/web` router + root route | 2 | 0 | ~45 | MEDIUM | READY |
| TASK-007 | `apps/web` page + generated route tree | 2 | 0 | ~65 | MEDIUM | READY |
| TASK-008 | `apps/docs` router + root route | 2 | 0 | ~45 | MEDIUM | READY |
| TASK-009 | `apps/docs` page + generated route tree | 2 | 0 | ~65 | MEDIUM | READY |
| TASK-010 | Delete both Next scaffolds | 0 | 20 deleted | ~762 | MEDIUM | BUDGET_EXCEPTION_REQUIRED |
| TASK-011 | Turbo outputs + compose healthcheck + root ignore | 0 | 3 | ~6 | LOW | READY |
| TASK-012 | Prose/docs cleanup | 0 | 4 | ~90 | LOW | READY |

Total: 11 new files, 20 modified files + 20 deleted files, ~3,500–5,500 changed lines (dominated by the lockfile and the scaffold deletions).

## Implementation steps

Implement every task in one pass, in order. Per-task checkpoints are static reviews, not approval gates. Full runtime validation happens after TASK-012 (TASK-002/003 cannot build until TASK-005 installs the dependencies).

### TASK-001: Shared TanStack Start tsconfig preset

**Objective**

Add `packages/typescript-config/start.json`, the Vite/Start replacement for `nextjs.json`.

**Dependencies**

None.

**Covers**
Covers: REQ-1, REQ-2, REQ-4

**Basis**
Evidence: `packages/typescript-config/nextjs.json:5-9`, `packages/typescript-config/base.json:4-21`, `packages/typescript-config/react-library.json:4-6`

**Files to create**

- `packages/typescript-config/start.json` — shared compiler options for Vite/Start apps.

**Files to modify**

None.

**Existing patterns**

`packages/typescript-config/react-library.json` (extends `./base.json`, minimal overrides) and `nextjs.json` (the preset being replaced).

**Estimated change budget**

- New files: 1 / 3
- Modified files: 0 / 5
- Changed lines: 16 / 200
- Maximum per-file change: 16 / 100
- Complexity: LOW
- Budget status: PASS

**Implementation instructions**

1. Create `packages/typescript-config/start.json` with `"$schema": "https://json.schemastore.org/tsconfig"` and `"extends": "./base.json"`.
2. Override exactly these `compilerOptions`: `"declaration": false`, `"declarationMap": false`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"jsx": "react-jsx"`, `"noEmit": true`, `"types": ["vite/client"]`.
3. Do not touch `base.json`, `react-library.json`, `package.json`, or delete `nextjs.json` (deleted in TASK-004, after both apps stop extending it).

**Acceptance criteria**

- The file exists, extends `./base.json`, and contains only the overrides listed above.
- `base.json`/`react-library.json` are unchanged.

**Validation**

`cat packages/typescript-config/start.json` (manual inspection; no build step yet).

**Checkpoint**

Confirm the preset matches the documented Vite/Start requirement (`moduleResolution: Bundler`, `jsx: react-jsx`, `vite/client` types) and record it in `.pipeline/build.md`.

### TASK-002: `apps/web` package and config switch to TanStack Start

**Objective**

Make `apps/web` a TanStack Start app at the manifest/config level (port 3000), without touching the page or deleting scaffold files yet.

**Dependencies**

TASK-001.

**Covers**
Covers: REQ-1, REQ-3, REQ-5, REQ-7

**Basis**
Evidence: `apps/web/package.json:7-25`, `apps/web/tsconfig.json:1-18`, `apps/web/eslint.config.js:1-4`, `apps/web/.gitignore:13-14,36`; Assumption: A9 (dependency versions).

**Files to create**

- `apps/web/vite.config.ts`

**Files to modify**

- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/eslint.config.js`
- `apps/web/.gitignore`

**Existing patterns**

- Vite plugin ordering and config shape: Assumption A9 (TanStack Start v1 docs: `tanstackStart()` before `viteReact()`, `server.port`).
- ESLint: `packages/ui/eslint.config.mjs:1` (`import { config } from "@repo/eslint-config/react-internal"`).
- Exact version pins and alphabetical dependency lists: current `apps/web/package.json`.

**Estimated change budget**

- New files: 1 / 3
- Modified files: 4 / 5
- Changed lines: ~51 / 200
- Maximum per-file change: ~23 (`tsconfig.json`) / 100
- Complexity: MEDIUM
- Budget status: PASS

**Implementation instructions**

1. `apps/web/vite.config.ts`:

```ts
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 3000, host: true },
  plugins: [tanstackStart(), viteReact()],
});
```

2. `apps/web/package.json` scripts: `"dev": "vite dev"`, `"build": "vite build"`, `"lint": "eslint --max-warnings 0"` (unchanged), `"check-types": "tsc --noEmit"`. Remove `"start"` (no production server in this repo — A4).
3. `apps/web/package.json` dependencies: remove `next`; add `"@tanstack/react-router": "1.170.46"` and `"@tanstack/react-start": "1.169.7"`. Keep `@repo/ui`, `react`, `react-dom` unchanged.
4. `apps/web/package.json` devDependencies: add `"@vitejs/plugin-react": "6.3.0"` and `"vite": "8.3.8"`. Keep every existing entry (`@repo/eslint-config`, `@repo/typescript-config`, `@types/*`, `eslint`, `typescript`).
5. Rewrite `apps/web/tsconfig.json`: `"extends": "@repo/typescript-config/start.json"`, `"compilerOptions": { "strictNullChecks": true }`, `"include": ["src"]`, `"exclude": ["node_modules"]`. Drop the `next` plugin, `next-env.d.ts`, `next.config.js` and `.next/types` includes.
6. Rewrite `apps/web/eslint.config.js` to `import { config } from "@repo/eslint-config/react-internal";` and `export default config;` with the same JSDoc type comment style as `packages/ui/eslint.config.mjs`.
7. `apps/web/.gitignore`: delete the `# next.js` block (`/.next/`, `/out/`) and the trailing `next-env.d.ts` line. Keep all other sections. Do not add `dist`/`routeTree.gen.ts` ignores (root `.gitignore` covers `dist`, and the route tree is committed — A3).
8. Do not delete `apps/web/app/`, `next.config.js` or `next-env.d.ts` yet (TASK-010).

**Acceptance criteria**

- None of the five files contains `next`, `Next`, or `@next/`.
- `tsconfig.json` extends `@repo/typescript-config/start.json` and includes only `src`.
- Scripts are `vite dev` / `vite build` / `eslint --max-warnings 0` / `tsc --noEmit`.
- `@tanstack/react-start@1.169.7`, `@tanstack/react-router@1.170.46`, `vite@8.3.8`, `@vitejs/plugin-react@6.3.0` are present; `next` is gone.

**Validation**

`grep -rin "next" apps/web/package.json apps/web/tsconfig.json apps/web/eslint.config.js apps/web/vite.config.ts apps/web/.gitignore` → no output.
Do not run `vite`/`tsc` yet (dependencies are installed in TASK-005).

**Checkpoint**

Confirm file contents and versions; record the actual script/dependency diff in `.pipeline/build.md`.

### TASK-003: `apps/docs` package and config switch to TanStack Start

**Objective**

Same as TASK-002 for `apps/docs` (port 3001).

**Dependencies**

TASK-001 (and mirror of TASK-002).

**Covers**
Covers: REQ-2, REQ-3, REQ-5, REQ-7

**Basis**
Evidence: `apps/docs/package.json:7-25`, `apps/docs/tsconfig.json:1-18`, `apps/docs/eslint.config.js:1-4`, `apps/docs/.gitignore:13-14,36`

**Files to create**

- `apps/docs/vite.config.ts`

**Files to modify**

- `apps/docs/package.json`
- `apps/docs/tsconfig.json`
- `apps/docs/eslint.config.js`
- `apps/docs/.gitignore`

**Existing patterns**

Identical to TASK-002; keep the two apps structurally identical except for port/title.

**Estimated change budget**

- New files: 1 / 3
- Modified files: 4 / 5
- Changed lines: ~51 / 200
- Maximum per-file change: ~23 / 100
- Complexity: MEDIUM
- Budget status: PASS

**Implementation instructions**

1. Repeat TASK-002 steps 1–8 in `apps/docs`, with `server: { port: 3001, host: true }`.
2. Keep dependency versions identical to `apps/web`.

**Acceptance criteria**

- Same as TASK-002, for `apps/docs`, with port 3001.
- `apps/web` and `apps/docs` manifests differ only in `name` and the dev port.

**Validation**

`grep -rin "next" apps/docs/package.json apps/docs/tsconfig.json apps/docs/eslint.config.js apps/docs/vite.config.ts apps/docs/.gitignore` → no output.

**Checkpoint**

Compare `apps/docs` against `apps/web`; record any intentional difference in `.pipeline/build.md`.

### TASK-004: Delete shared Next configs and the `"use client"` directive

**Objective**

Remove the now-unused Next-specific shared config and the Next/RSC directive from `@repo/ui`.

**Dependencies**

TASK-002, TASK-003 (nothing may still import these files).

**Covers**
Covers: REQ-3, REQ-4

**Basis**
Evidence: `packages/eslint-config/package.json:8,16`, `packages/eslint-config/next.js:1-39`, `packages/typescript-config/nextjs.json:1-12`, `packages/ui/src/button.tsx:1`; no other importer found by repo-wide grep.

**Files to create**

None.

**Files to modify**

- `packages/eslint-config/package.json` — remove the `"./next-js": "./next.js"` export and the `"@next/eslint-plugin-next": "16.3.4"` devDependency.
- `packages/ui/src/button.tsx` — remove line 1 `"use client";` and the blank line that follows it.
- Delete `packages/eslint-config/next.js`.
- Delete `packages/typescript-config/nextjs.json`.

**Existing patterns**

`packages/eslint-config/react-internal.js` is the surviving React config; `packages/ui/eslint.config.mjs` already consumes it.

**Estimated change budget**

- New files: 0 / 3
- Modified files: 4 (2 deleted + 2 modified) / 5
- Changed lines: ~55 / 200
- Maximum per-file change: 39 (`next.js` deletion) / 100
- Complexity: MEDIUM
- Budget status: PASS

**Implementation instructions**

1. Delete `packages/eslint-config/next.js`.
2. Delete `packages/typescript-config/nextjs.json`.
3. Edit `packages/eslint-config/package.json`: remove the `./next-js` export line and the `@next/eslint-plugin-next` devDependency line only.
4. Edit `packages/ui/src/button.tsx`: remove the `"use client";` directive and its trailing blank line; leave the component unchanged.

**Acceptance criteria**

- Both files are gone and nothing imports `@repo/eslint-config/next-js` or `@repo/typescript-config/nextjs.json`.
- `@repo/eslint-config` still exports `./base` and `./react-internal`.
- `packages/ui` source has no directive at the top of `button.tsx` and still exports `Button` unchanged.

**Validation**

`grep -rn "@repo/eslint-config/next-js\|typescript-config/nextjs" --include=*.js --include=*.json --include=*.ts --include=*.tsx . --exclude-dir=node_modules` → no output.
`grep -rin "next" packages/eslint-config packages/typescript-config packages/ui/src` → only `NodeNext` in `base.json` (allowed; TypeScript module mode).

**Checkpoint**

Confirm no consumer remains; record the deleted files and the remaining `NodeNext` hit in `.pipeline/build.md`.

### TASK-005: Install dependencies and regenerate the lockfile

**Objective**

Resolve the new Start/Vite dependencies, drop `next`/`@next/*` from the lockfile, and link `node_modules`.

**Dependencies**

TASK-002, TASK-003, TASK-004 (all manifest edits must be in place first).

**Covers**
Covers: REQ-1, REQ-2, REQ-3

**Basis**
Evidence: `pnpm-lock.yaml:1745` (`next@16.4.6` entry) and `:1973` (`vite@8.3.8`); no `@vitejs/plugin-react` entry; `pnpm-workspace.yaml:1-3`; Assumption A7.

**Files to create**

None.

**Files to modify**

- `pnpm-lock.yaml` (regenerated by pnpm; never hand-edited).

**Existing patterns**

Repo uses exact version pins and a committed `pnpm-lock.yaml`; `packageManager: pnpm@11.25.0`.

**Estimated change budget**

- New files: 0 / 3
- Modified files: 1 / 5
- Changed lines: ~2,000–4,000 / 200
- Maximum per-file change: entire lockfile diff / 100
- Complexity: HIGH
- Budget status: EXCEEDED

**Budget exception**

- Limits exceeded: changed lines per task and per file (a single generated lockfile).
- Why splitting is unsafe: the lockfile is one generated file; it cannot be split or partially regenerated without leaving an inconsistent dependency graph.
- Minimum additional budget required: ~4,000 changed lines, 1 modified file, no per-file line limit for generated lockfiles.
- Risks of approving: a large, low-value diff to review; mitigation is to review only the package-entry delta (`next`, `@next/*` removed; Start/Vite/React-plugin added) rather than the whole file.

**Implementation instructions**

1. Run `pnpm install` at the repository root (network required).
2. Do not hand-edit `pnpm-lock.yaml`.
3. If pnpm reports `@rsbuild/core` or other optional peers missing, ignore them (they are optional peers of `@tanstack/react-start`); do not add them.
4. If pnpm reports a peer conflict on `vite`, stop and report it (expected peer ranges are `vite >=8.0.0` and `^8.0.0`).

**Acceptance criteria**

- `grep -nE "^\s+next(@|:)|@next/" pnpm-lock.yaml` returns nothing.
- `@tanstack/react-start`, `@tanstack/react-router`, `@vitejs/plugin-react` and `vite@8.3.8` are present.
- `pnpm install --frozen-lockfile` succeeds afterwards.
- `apps/web/node_modules/vite` and `apps/web/node_modules/@tanstack/react-start` resolve.

**Validation**

`pnpm install --frozen-lockfile` (second run), `grep -nE "^\s+next(@|:)|@next/" pnpm-lock.yaml`, `pnpm --filter web exec vite --version`.

**Checkpoint**

Record the removed/added package entries and any peer warnings in `.pipeline/build.md`.

### TASK-006: `apps/web` router and root route

**Objective**

Add the TanStack Start routing shell for `apps/web`.

**Dependencies**

TASK-005.

**Covers**
Covers: REQ-1, REQ-5

**Basis**
Assumption: A9 (documented Start v1 `src/router.tsx` + `src/routes/__root.tsx` shape); Evidence: `apps/web/package.json:7-25`

**Files to create**

- `apps/web/src/router.tsx`
- `apps/web/src/routes/__root.tsx`

**Files to modify**

None.

**Existing patterns**

The documented Start v1 minimal shape (Assumption A9); no repo-local precedent exists.

**Estimated change budget**

- New files: 2 / 3
- Modified files: 0 / 5
- Changed lines: ~45 / 200
- Maximum per-file change: ~35 (`__root.tsx`) / 100
- Complexity: MEDIUM
- Budget status: PASS

**Implementation instructions**

1. `apps/web/src/router.tsx`: export `function getRouter()` that returns `createRouter({ routeTree, scrollRestoration: true })`, importing `routeTree` from `./routeTree.gen` and `createRouter` from `@tanstack/react-router`.
2. `apps/web/src/routes/__root.tsx`: `createRootRoute` with `head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "web" }, { name: "description", content: "web app" }] })` and a `RootDocument` that renders `<html lang="en">`, `<head><HeadContent /></head>`, `<body>{children}<Scripts /></body>`.
3. No CSS import, no `src/client.tsx`, no `src/server.ts` (Start defaults are sufficient).
4. Do not create `src/routes/index.tsx` yet (TASK-007); `routeTree.gen.ts` does not exist yet, so do not run `tsc`.

**Acceptance criteria**

- `getRouter` is exported and returns a new router each call.
- `__root.tsx` renders the document shell with `HeadContent` and `Scripts` and no global CSS.

**Validation**

Static inspection only (`pnpm --filter web check-types` will fail until TASK-007 generates the route tree).

**Checkpoint**

Confirm imports resolve to installed packages and the shell matches the documented shape; record it in `.pipeline/build.md`.

### TASK-007: `apps/web` minimal page and generated route tree

**Objective**

Add the `/` route with the minimal page, generate `routeTree.gen.ts`, and prove the Vite/Start build works.

**Dependencies**

TASK-006.

**Covers**
Covers: REQ-1, REQ-5, REQ-6

**Basis**
Assumption: A9 (documented `createFileRoute` route files); Assumptions A2, A3.

**Files to create**

- `apps/web/src/routes/index.tsx`
- `apps/web/src/routeTree.gen.ts` (generated by the Start plugin — do not hand-write)

**Files to modify**

None.

**Existing patterns**

`packages/ui/src/button.tsx:12-19` for the `Button` component, as currently used in `apps/web/app/page.tsx`.

**Estimated change budget**

- New files: 2 / 3
- Modified files: 0 / 5
- Changed lines: ~65 / 200
- Maximum per-file change: ~45 (`routeTree.gen.ts`) / 100
- Complexity: MEDIUM
- Budget status: PASS

**Implementation instructions**

1. `apps/web/src/routes/index.tsx`: `createFileRoute("/")` with `head: () => ({ meta: [{ title: "web" }] })` and a component that renders `<main><h1>web</h1><p>TanStack Start on Vite.</p><Button appName="web">Open alert</Button></main>`, importing `Button` from `@repo/ui/button`. No images, no fonts, no CSS modules, no marketing copy.
2. Run `pnpm --filter web build`. The Start plugin generates `apps/web/src/routeTree.gen.ts`; keep the generated file in the tree (A3) and do not edit it.
3. Confirm the build output directory (expected `apps/web/dist/` with client and server artifacts) and record the actual paths for TASK-011.
4. If the build fails because `@repo/ui` is externalized in SSR, add `ssr: { noExternal: ["@repo/ui"] }` to `apps/web/vite.config.ts` and re-run; record the change.
5. If `pnpm --filter web lint` flags the generated file, add `src/routeTree.gen.ts` to the app ESLint ignores (`ignores: ["src/routeTree.gen.ts"]` in `eslint.config.js`); do not edit the generated file.

**Acceptance criteria**

- `pnpm --filter web build` succeeds.
- `apps/web/src/routeTree.gen.ts` exists and is generated (contains the generated header, not hand-written code).
- `pnpm --filter web check-types` passes.
- `apps/web/dist/` contains the build artifacts.

**Validation**

`pnpm --filter web build`, `pnpm --filter web check-types`, `pnpm --filter web lint`.

**Checkpoint**

Record the build output tree, the generated route tree path and any `ssr.noExternal` change in `.pipeline/build.md`.

### TASK-008: `apps/docs` router and root route

**Objective**

Add the TanStack Start routing shell for `apps/docs`.

**Dependencies**

TASK-005.

**Covers**
Covers: REQ-2, REQ-5

**Basis**
Evidence: same as TASK-006; mirror with title "docs".

**Files to create**

- `apps/docs/src/router.tsx`
- `apps/docs/src/routes/__root.tsx`

**Files to modify**

None.

**Existing patterns**

`apps/web/src/router.tsx`, `apps/web/src/routes/__root.tsx` (TASK-006).

**Estimated change budget**

- New files: 2 / 3
- Modified files: 0 / 5
- Changed lines: ~45 / 200
- Maximum per-file change: ~35 / 100
- Complexity: MEDIUM
- Budget status: PASS

**Implementation instructions**

1. Copy the TASK-006 shapes into `apps/docs`, with `title: "docs"` and `description: "docs app"`.
2. Keep everything else identical to `apps/web`.

**Acceptance criteria**

- Same as TASK-006 for `apps/docs`.

**Validation**

Static inspection only.

**Checkpoint**

Diff `apps/docs/src` against `apps/web/src`; the only differences must be titles.

### TASK-009: `apps/docs` minimal page and generated route tree

**Objective**

Add the `/` route for `apps/docs`, generate `routeTree.gen.ts`, and prove the build.

**Dependencies**

TASK-008.

**Covers**
Covers: REQ-2, REQ-5, REQ-6

**Basis**
Evidence: TASK-007; A2, A3.

**Files to create**

- `apps/docs/src/routes/index.tsx`
- `apps/docs/src/routeTree.gen.ts` (generated)

**Files to modify**

None.

**Existing patterns**

`apps/web/src/routes/index.tsx`.

**Estimated change budget**

- New files: 2 / 3
- Modified files: 0 / 5
- Changed lines: ~65 / 200
- Maximum per-file change: ~45 / 100
- Complexity: MEDIUM
- Budget status: PASS

**Implementation instructions**

1. `apps/docs/src/routes/index.tsx`: same shape as web with `<h1>docs</h1>`, title "docs" and `<Button appName="docs">Open alert</Button>`.
2. Run `pnpm --filter docs build` to generate `apps/docs/src/routeTree.gen.ts`; keep it.
3. Record the docs build output directory.

**Acceptance criteria**

- `pnpm --filter docs build` and `pnpm --filter docs check-types` succeed.
- `apps/docs/src/routeTree.gen.ts` exists.
- `apps/docs/dist/` contains the build artifacts.

**Validation**

`pnpm --filter docs build`, `pnpm --filter docs check-types`, `pnpm --filter docs lint`.

**Checkpoint**

Record build output and generated files in `.pipeline/build.md`.

### TASK-010: Delete both Next scaffolds

**Objective**

Remove the Next app-router directories, Next config files and the Next logo asset from both apps.

**Dependencies**

TASK-007, TASK-009 (replacement routes and builds must work first).

**Covers**
Covers: REQ-3

**Basis**
Evidence: `apps/web/app/layout.tsx:1-31`, `apps/web/app/page.tsx:1-102`, `apps/web/app/page.module.css:1-186`, `apps/web/next.config.js:1-4`, `apps/web/next-env.d.ts:1-7`, `apps/web/public/next.svg` (same set under `apps/docs`).

**Files to create**

None.

**Files to modify (delete)**

Per app (`apps/web`, `apps/docs`):

- `app/layout.tsx` (31 lines)
- `app/page.tsx` (102 lines)
- `app/globals.css` (50 lines)
- `app/page.module.css` (186 lines)
- `app/favicon.ico` (binary)
- `app/fonts/GeistVF.woff` (binary)
- `app/fonts/GeistMonoVF.woff` (binary)
- `next.config.js` (4 lines)
- `next-env.d.ts` (7 lines)
- `public/next.svg` (1 line)

**Existing patterns**

Not applicable (pure deletion).

**Estimated change budget**

- New files: 0 / 3
- Modified files: 20 (deleted) / 5
- Changed lines: ~762 / 200
- Maximum per-file change: 186 (`app/page.module.css`) / 100
- Complexity: MEDIUM
- Budget status: EXCEEDED

**Budget exception**

- Limits exceeded: modified-file count (20), total changed lines (~762) and per-file lines (186).
- Why splitting is unsafe/impractical: these files are the Next app-router scaffold replaced by `src/`; deleting them is a single atomic removal, and splitting by file group would leave a half-removed `app/` directory with no independent review value. All deleted content is scaffold markup/CSS/fonts already replaced in TASK-007/009.
- Minimum additional budget required: 20 modified/deleted files, ~800 changed lines, per-file limit ≥190 for the two `page.module.css` deletions.
- Risks of approving: a large deletion diff; mitigation is reviewing that only the listed paths were removed and that nothing imports them.

**Implementation instructions**

1. Delete the ten files listed above in each app; remove the now-empty `app/` directories.
2. Also delete generated artifacts if present: `apps/web/.next/`, `apps/docs/.next/`, `apps/web/.turbo/`, `apps/docs/.turbo/` (untracked build output, not counted).
3. Do not delete the other `public/*.svg` files (they contain no Next.js reference) and do not delete the app `README.md` files (rewritten in TASK-012).

**Acceptance criteria**

- `apps/web/app` and `apps/docs/app` no longer exist.
- No `next.config.js`, `next-env.d.ts` or `public/next.svg` remains under `apps/`.
- `grep -rn "app/page\|app/layout" apps --include=*.ts --include=*.tsx --include=*.json --exclude-dir=node_modules` returns nothing (the app READMEs still mention them until TASK-012).

**Validation**

`find apps -name "next*" -not -path "*/node_modules/*"` → no output.
`pnpm --filter web build && pnpm --filter docs build` still succeed after deletion.

**Checkpoint**

List every deleted path in `.pipeline/build.md` and confirm both builds still pass.

### TASK-011: Repo wiring — turbo outputs, compose healthcheck, root ignore

**Objective**

Align repo-level build/run wiring with the Vite/Start output and remove the remaining repo-level Next ignore entry.

**Dependencies**

TASK-007, TASK-009 (output directories known).

**Covers**
Covers: REQ-3, REQ-7

**Basis**
Evidence: `turbo.json:8`, `docker-compose.yml:93`, `.gitignore:25`.

**Files to create**

None.

**Files to modify**

- `turbo.json` — `build.outputs` becomes `["dist/**"]` (use the directory actually produced in TASK-007/009; if the build emits `.output/**` instead, use that and record why).
- `docker-compose.yml` — healthcheck URL `http://localhost:3000/health` → `http://localhost:3000/`.
- `.gitignore` — remove the `.next/` line (line 25). Keep `out/`, `build`, `dist`.

**Existing patterns**

`turbo.json` task config; `docker-compose.yml` healthcheck style.

**Estimated change budget**

- New files: 0 / 3
- Modified files: 3 / 5
- Changed lines: ~6 / 200
- Maximum per-file change: ~2 / 100
- Complexity: LOW
- Budget status: PASS

**Implementation instructions**

1. Replace the three Next globs in `turbo.json:8` with the observed build output glob.
2. Change the web healthcheck path to `/` (the Start root route returns 200; there is no `/health` route).
3. Remove `.next/` from the root `.gitignore`.
4. Do not add a Dockerfile (A6) and do not change the SSR comment at `docker-compose.yml:84-86` (it is now accurate).

**Acceptance criteria**

- `turbo.json` no longer mentions `.next`.
- The compose healthcheck targets `/`.
- Root `.gitignore` has no `.next/` entry.
- `pnpm build` at the root succeeds and restores `dist/**` from cache on a second run.

**Validation**

`pnpm build` twice (second run reports cache hits for web/docs), `grep -n "\.next" turbo.json .gitignore` → no output.

**Checkpoint**

Record cache behavior (hit/miss) in `.pipeline/build.md`.

### TASK-012: Prose and docs cleanup

**Objective**

Remove the remaining Next.js claims from repository documentation and reconcile the documented stack.

**Dependencies**

TASK-011.

**Covers**
Covers: REQ-3, REQ-8

**Basis**
Evidence: `AGENTS.md:43`, `docs/README.md:19-22`, `apps/web/README.md:1-36`, `apps/docs/README.md:1-36`.

**Files to create**

None.

**Files to modify**

- `apps/web/README.md` — replace the create-next-app README with a short TanStack Start/Vite README (dev port 3000, `pnpm --filter web dev|build|check-types`, link to TanStack Start docs).
- `apps/docs/README.md` — same for docs, port 3001.
- `docs/README.md:19-22` — `docs`: "a TanStack Start app", `web`: "another TanStack Start app", `@repo/eslint-config` description without `@next/eslint-plugin-next`.
- `AGENTS.md:43` — Frontend row becomes `React 19 + TanStack Start (Vite 8) + TanStack Router`. Do not mention Tailwind (not installed anywhere) and do not change the managed Turborepo agent block.

**Existing patterns**

Existing README tone; `docs/README.md` bullet list; AGENTS.md markdown table (keep pipe alignment readable; formatter may adjust).

**Estimated change budget**

- New files: 0 / 3
- Modified files: 4 / 5
- Changed lines: ~90 / 200
- Maximum per-file change: ~48 (app README) / 100
- Complexity: LOW
- Budget status: PASS

**Implementation instructions**

1. Write the two app READMEs (≤12 lines each): what the app is, how to run dev/build/check-types with pnpm filters, port number.
2. Edit the four lines in `docs/README.md`; leave the rest of the Turborepo/Vercel remote-cache prose alone (it is Turborepo documentation, not Next.js).
3. Edit the single `AGENTS.md:43` row; leave `docs/PLANS.md:259` ("next year") untouched.

**Acceptance criteria**

- `grep -rin "next.js\|nextjs\|@next/" --include=*.md --exclude-dir=node_modules --exclude-dir=.pipeline --exclude-dir=.opencode .` returns nothing (English "next" such as `docs/PLANS.md:259` is allowed).
- `AGENTS.md` Frontend row names TanStack Start and no longer claims Tailwind.

**Validation**

The grep above, plus `pnpm --filter web lint` and `pnpm --filter docs lint` (unaffected but re-run).

**Checkpoint**

Record the final grep result in `.pipeline/build.md`.

## Test plan

No new test files are added (A5). Rationale: neither `apps/web` nor `apps/docs` has a `test` script, a Vitest config or any test file today; the migration replaces a static placeholder page and adds no branching logic. Adding `jsdom` + `@testing-library/react` + a Vitest config for two placeholder pages would add three dependencies and four files per app, which the human's "keep changes minimal" constraint excludes.

Behavior covered by validation instead:

- `apps/web` and `apps/docs` type-check (`tsc --noEmit` over `src`, including the generated route tree).
- Both build with Vite/Start and emit the expected output directory (regression guard for config/output wiring).
- Both lint with the shared `react-internal` ESLint config (regression guard for the removed Next ESLint config).
- Manual dev smoke: `pnpm dev`, open `http://localhost:3000` and `http://localhost:3001`, confirm the heading renders server-side and the `@repo/ui` Button alert fires (proves workspace package resolution and hydration).
- Lockfile guard: `pnpm install --frozen-lockfile` succeeds and no `next`/`@next/*` entry remains.

Existing test patterns: none in these apps; `packages/ui` has lint/type-check only. No regression risk to existing tests because no package defines a `test` script.

## Validation commands

Run after TASK-012, in this order (all exist in the repository):

1. `pnpm install --frozen-lockfile` — lockfile is consistent.
2. `pnpm --filter web check-types` — `tsc --noEmit`.
3. `pnpm --filter docs check-types` — `tsc --noEmit`.
4. `pnpm --filter web lint` — ESLint with the shared React config.
5. `pnpm --filter docs lint` — ESLint.
6. `pnpm --filter web build` — Vite/Start build.
7. `pnpm --filter docs build` — Vite/Start build.
8. `pnpm check-types` — turbo task graph (`dependsOn: ["^check-types"]`).
9. `pnpm build` — turbo task graph, then run again to confirm cache hits.
10. `pnpm test` — record the result; no package currently defines a `test` script (pre-existing, not caused by this change).
11. `pnpm lint` — root `biome check`; expected to fail because `@biomejs/biome` is not installed (pre-existing, not caused by this change).
12. Manual: `pnpm dev`, load both ports, click "Open alert".
13. Grep guards: `grep -rn "next" --include=*.ts --include=*.tsx --include=*.js --include=*.json --exclude-dir=node_modules --exclude-dir=.pipeline --exclude=pnpm-lock.yaml .` (only `NodeNext` allowed) and the lockfile grep from TASK-005.

## Dependencies and migrations

New dependencies (exact pins, per app): `@tanstack/react-start@1.169.7`, `@tanstack/react-router@1.170.46` (runtime); `vite@8.3.8`, `@vitejs/plugin-react@6.3.0` (dev). Removed: `next@16.4.6` (both apps), `@next/eslint-plugin-next@16.3.4` (shared config).
No database migrations, no environment-variable changes, no secrets. `pnpm install` needs network access (A7). `pnpm-lock.yaml` is regenerated, not hand-edited.

## Risks and rollback

- **No VCS baseline**: per the investigation the repository has no commits, and `git status`/`git log` are policy-denied, so a failed build cannot be rolled back with git. Mitigation: implement in task order, run the TASK-007/009 builds before TASK-010 deletes anything, and keep the deleted files recoverable until the final validation passes.
- **TanStack Start version churn**: `1.169.7` is pinned; its optional peers (`@rsbuild/core`, `@vitejs/plugin-rsc`) are intentionally not installed. A patch release changing `routeTree.gen.ts` shape is a low risk because the file is generated.
- **Build output directory**: expected `dist/**`; if the installed Start version emits `.output/**`, TASK-011 must use that glob. Recorded as a verification step, not an open decision.
- **SSR externalization of `@repo/ui`**: Vite normally bundles linked workspace packages; if the SSR build externalizes `.tsx`, TASK-007 adds `ssr.noExternal: ["@repo/ui"]`.
- **Vite 8 vs `AGENTS.md` "Vite 7"**: Vite 8.3.8 is already in the lockfile and is the only version `@tanstack/react-start@1.169.7` accepts; the doc row is corrected in TASK-012. Adding a second Vite major was rejected.
- **Docker**: `apps/web/Dockerfile` remains missing (A6); the compose `web` service still cannot build, exactly as today. `server.host: true` is required for the `3000:3000` mapping when a Dockerfile is added; it also exposes the dev server on the LAN (dev only).
- **Lint/format noise**: root `pnpm lint` (Biome) and husky `fallow*` hooks are already broken; they are not fixed here. `routeTree.gen.ts` is generated with its own lint/ts-check directives.
- **Security**: no secrets or user data involved; no new attack surface beyond the dev server binding and the removed Next image-optimizer/server runtime.
- **Rollback**: revert the tasks in reverse order; TASK-010 deletions are the only destructive step and are pure scaffold files, recoverable from the investigation's recorded contents if needed.

## Out of scope

- Adding `apps/web/Dockerfile` / `apps/api/Dockerfile` (pre-existing gap, A6).
- A production SSR server entry point (`nitro` or `srvx`) and a `start` script (A4).
- Adding Tailwind CSS, shadcn/ui wiring, TanStack Query, or any other stack item named in `AGENTS.md` that is not installed.
- Porting the Turborepo/Vercel marketing page, fonts, CSS modules or images (human decision: minimal page).
- Deleting the unused `public/*.svg` assets, root dead `tsconfig.json`/`tsconfig.app.json`, or the broken root Biome/fallow setup.
- Adding Vitest/jsdom test infrastructure to the two apps (A5).
- Editing `.opencode/**` agent/plugin files and `docs/PLANS.md` prose that merely contains the English word "next".
- Any refactoring of `packages/ui` beyond removing `"use client"`.

## Final planning checks

- Every task has one objective, acceptance criteria, file lists, change estimates and a `Covers:` line. ✓
- Tests are included where they exist (none in these apps) and validation replaces them; no coverage is reduced. ✓
- Dependencies are explicit and ordered (preset → app configs → shared cleanup → install → routes → deletion → wiring → prose). ✓
- Two tasks exceed the budget and are marked `BUDGET_EXCEPTION_REQUIRED` with justification; nothing is approved here. ✓
- No new abstraction, dependency or refactoring beyond the Start/Vite requirements. ✓
- Every Verified fact cites `file:line`. ✓
