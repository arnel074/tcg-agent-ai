# Investigation — migrate `apps/web` from Next.js to Vite

Denied commands: None.

## Requirements (verbatim)

```text
replace @apps/web  to use vite instead of nextjs ...and remove all refrence on nextjs
```

## Requirements (normative)

- REQ-1: `apps/web` runs in dev and builds for production using Vite, not Next.js.
- REQ-2: `apps/web` no longer depends on the `next` package or uses Next-only APIs (`next/image`, `next/font/local`, `Metadata`, app-router `layout.tsx`/`page.tsx` conventions).
- REQ-3: No Next.js references remain in `apps/web` source, config, lockfile entries, ignore files, README, or assets.
- REQ-4: Repo wiring (turbo `build` outputs, workspace deps, lint/type-check tasks) still works for the Vite build output.
- REQ-5: Repo-wide Next.js removal (including `apps/docs` and the shared `nextjs.json` / `next.js` ESLint config) is what "remove all refrence on nextjs" means — **unconfirmed**, see Assumptions.
- The verbatim text wins on conflict.

## 1. Problem summary

`apps/web` is the stock `create-turbo` Next.js 16 app (app router, `next/image`, `next/font/local`, Next metadata) and must be replaced with a Vite + React 19 app. The second half of the request asks to remove every Next.js reference, which potentially also covers `apps/docs` (an identical Next.js app) and the shared `@repo/eslint-config` / `@repo/typescript-config` Next.js entries.

## 2. Current implementation

### `apps/web` app code (Next app router)

- `apps/web/app/layout.tsx:1-2` imports `Metadata` from `next` and `localFont` from `next/font/local`.
- `apps/web/app/layout.tsx:5-12` builds two font variables (`--font-geist-sans`, `--font-geist-mono`) from `./fonts/GeistVF.woff` and `./fonts/GeistMonoVF.woff`.
- `apps/web/app/layout.tsx:14-17` exports static `metadata` (`title`, `description`).
- `apps/web/app/layout.tsx:25-27` emits the `<html>`/`<body>` shell and applies the font-variable classes to `<body>`.
- `apps/web/app/page.tsx:1` imports `Image` and `ImageProps` from `next/image`; `apps/web/app/page.tsx:15-16` renders light/dark `<Image>` pairs.
- `apps/web/app/page.tsx:32` passes the Next-only `priority` prop; `apps/web/app/page.tsx:50,78,92` use `<Image src="/vercel.svg">`, `/window.svg`, `/globe.svg`.
- `apps/web/app/page.tsx:44` also embeds the string "two Next.js sites" inside a Vercel clone URL (a textual Next reference).
- Styling is CSS Modules (`apps/web/app/page.module.css:1`) plus a global stylesheet (`apps/web/app/globals.css:1`); both are framework-agnostic and supported by Vite as-is.
- Static assets live in `apps/web/public/` (`globe.svg`, `next.svg`, `turborepo-*.svg`, `vercel.svg`, `window.svg`, `file-text.svg`) and are referenced by absolute path (`/vercel.svg` etc.), which Vite also serves from `public/`.
- `apps/web/app/favicon.ico` is served implicitly by Next's app router.

### `apps/web` config and scripts

- `apps/web/package.json:7-11`: `dev` = `next dev --port 3000`, `build` = `next build`, `start` = `next start`, `check-types` = `next typegen && tsc --noEmit`.
- `apps/web/package.json:15`: direct dependency `next: 16.4.6`; React 19.2.8 and `@repo/ui` are the only other runtime deps.
- `apps/web/tsconfig.json:2` extends `@repo/typescript-config/nextjs.json`; `:4-7` adds the `next` TS plugin; `:14-16` includes `next-env.d.ts`, `next.config.js`, `.next/types/**/*.ts`.
- `apps/web/eslint.config.js:1` imports `nextJsConfig` from `@repo/eslint-config/next-js`.
- `apps/web/next.config.js:1-4` is an empty Next config.
- `apps/web/next-env.d.ts:1-3` references `next`, `next/image-types/global`, and generated `.next/types` files.
- `apps/web/.gitignore:12-14,36` ignores `/.next/`, `/out/`, `next-env.d.ts`.
- `apps/web/README.md:1,21,25-36` is Next.js/`next/font`/Vercel documentation.
- `apps/web/node_modules/.bin` currently exposes `next`, `eslint`, `tsc` — no `vite`.

### Shared packages

- `packages/typescript-config/nextjs.json:5,9` adds the `next` TS plugin and `"jsx": "preserve"`; `:6-7` set `module: ESNext` + `moduleResolution: Bundler` (the only Vite-compatible bits).
- `packages/eslint-config/package.json:8` exports `./next-js`; `:16` depends on `@next/eslint-plugin-next@16.3.4`.
- `packages/eslint-config/next.js:4,16-19,31-35` wires the Next plugin, its recommended/core-web-vitals rules, and Next output ignores.
- `packages/eslint-config/react-internal.js:1-24` is the framework-agnostic React config already used by `@repo/ui` (`packages/ui/eslint.config.mjs:1`) and is the natural replacement for web.
- `packages/ui/package.json:5-7` exports `./*` → `./src/*.tsx`; `packages/ui/src/button.tsx:1` starts with `"use client";`, a Next/RSC directive that Vite will warn about and ignore.
- `packages/ui` has no build step (source-only exports), so it works unchanged under Vite.

### Repo wiring

- `turbo.json:8` caches only `.next/**` as `build` output; a Vite build writes `dist/`, so cache outputs would be wrong/missing.
- `pnpm-workspace.yaml:1-3` includes `apps/*`; `:5` disables the `esbuild` build script (Vite/esbuild platform binaries still work; vitest already runs Vite this way).
- Root scripts (`package.json:8-16`) call `turbo run build|dev|lint|check-types|test`; nothing is web-specific.
- `docker-compose.yml:62-93` already defines a `web` service with `VITE_API_URL`, `VITE_CORS_ORIGINS`, `API_INTERNAL_URL`, `VITE_GTM_ID` env vars and a `http://localhost:3000/health` healthcheck, but `docker-compose.yml:65` points at `apps/web/Dockerfile`, which does not exist in the repo.
- `AGENTS.md:43` already documents the intended frontend as "React 19 + Vite 7 + TanStack Router + Tailwind CSS 3" — none of which is installed in `apps/web` today.
- `docs/README.md:19-22` describes both `web` and `docs` as Next.js apps and the eslint config as including `@next/eslint-plugin-next`.

### `apps/docs`

- `apps/docs` is a byte-for-byte sibling of the same Next scaffold: `apps/docs/package.json:7-11,15` has the same `next` scripts and dependency; `apps/docs/app/layout.tsx:1-2` uses `next/font/local`; `apps/docs/app/page.tsx:1` uses `next/image`; `apps/docs/tsconfig.json`, `apps/docs/eslint.config.js`, `apps/docs/next.config.js`, `apps/docs/next-env.d.ts` mirror web (ports 3001).

## 3. Evidence

- App-router/metadata/fonts: `apps/web/app/layout.tsx:1-2,5-17,25-27`.
- `next/image` + `priority`: `apps/web/app/page.tsx:1,15-16,32,50,78,92`.
- Next scripts/dep: `apps/web/package.json:7-11,15`.
- Next tsconfig/plugin/generated includes: `apps/web/tsconfig.json:2,4-7,14-16`; `packages/typescript-config/nextjs.json:5,9`.
- Next ESLint config: `apps/web/eslint.config.js:1`; `packages/eslint-config/next.js:4,16-19,31-35`; `packages/eslint-config/package.json:8,16`.
- `next-env.d.ts` content: `apps/web/next-env.d.ts:1-3`.
- Next-specific ignores: `apps/web/.gitignore:12-14,36`.
- Turbo output mismatch: `turbo.json:8` (`".next/**"` only) vs Vite default `dist/`.
- Next dependency in lockfile: `pnpm-lock.yaml:1745` (`next@16.4.6`); Vite already resolved transitively: `pnpm-lock.yaml:1973` (`vite@8.3.8`), `:2016` (`vitest@4.1.12`). `node_modules/.pnpm` contains `vite@8.3.8`; `@vitejs/plugin-react` is **not** in the lockfile (`grep -n "@vitejs/plugin-react" pnpm-lock.yaml` returned no package entry).
- Installed Vite engine requirement: `node -p ...vite/package.json` → `8.3.8`, `engines.node = "^20.19.0 || >=22.12.0"`; `.nvmrc` is `26.13.1` and root `package.json` requires Node `>=24`.
- Plugin compatibility (official registry): `https://registry.npmjs.org/@vitejs/plugin-react/latest` → `6.3.0`, `peerDependencies.vite = "^8.0.0"`, engines `^20.19.0 || >=22.12.0`; optional peers (`oxc-transform-react`, `@rolldown/plugin-babel`, `babel-plugin-react-compiler`) are marked optional.
- `@repo/ui` source export map and RSC directive: `packages/ui/package.json:5-7`; `packages/ui/src/button.tsx:1`.
- Docker wiring already assumes Vite-style env vars: `docker-compose.yml:82-87`; SSR comment at `docker-compose.yml:84-86`; healthcheck at `:93`; missing Dockerfile at `:65` (`find . -name "Dockerfile*" -not -path "*/node_modules/*"` returned nothing).
- Repo docs contradict code: `AGENTS.md:43` (Vite 7 + TanStack Router + Tailwind) vs `apps/web/package.json:15` (`next`); `docs/README.md:19-22` (Next.js apps).
- No knowledge graph available: `find . -name "graph.json" -not -path "*/node_modules/*"` returned nothing, so no `graphify query` was possible. No git history either: `git log` → "your current branch 'main' does not have any commits yet"; all files are untracked.
- Dead Vite leftovers at repo root: `tsconfig.json:4-5` references `./tsconfig.app.json` and `./tsconfig.node.json`, but `tsconfig.node.json` does not exist (`ls tsconfig.node.json` → No such file). `tsconfig.app.json:7,20` has `types: ["vite/client"]` and `jsx: react-jsx` but no `strict`, and `include: ["src"]` points at a non-existent root `src/`. Nothing else references either file (`grep -rn tsconfig.app.json|tsconfig.node.json` shows only `tsconfig.json:4-5`).
- Root `pnpm lint` is `biome check` (`package.json:9`), but `@biomejs/biome` is not installed (`ls node_modules/@biomejs` → No such file) — pre-existing, unrelated to this change.

## Assumptions

- "remove all refrence on nextjs" means code/config/assets, not incidental prose in `AGENTS.md`/`docs/PLANS.md` → confirm by asking the human whether docs prose must change too.
- `apps/docs` is in scope for the migration → confirm; if not, shared Next configs (`nextjs.json`, `next.js`, `@next/eslint-plugin-next`) must stay and REQ-5 cannot be fully met.
- The scaffold page content (Turborepo/Vercel marketing) may be replaced by a minimal page → confirm; the alternative is a literal 1:1 port including the "two Next.js sites" URL text at `apps/web/app/page.tsx:44`.
- Vite 8.3.8 (already in the lockfile) is acceptable despite `AGENTS.md:43` saying Vite 7 → confirm; pinning 8.3.8 avoids a second Vite version in the repo.
- Plain Vite SPA is acceptable (no SSR) → refuted/confirmed by the docker comment at `docker-compose.yml:84-86` mentioning "SSR loaders"; if SSR is required, TanStack Start (or Vite SSR) is needed, which is a much larger change.
- Keeping per-package ESLint (not migrating to the root Biome setup) is acceptable → confirm, since the repo currently mixes both.
- `apps/web` has no tests and none are required beyond build/type-check for a config migration → confirm against the AGENTS.md "every feature requires tests" rule.

## 4. Root cause or implementation direction

This is a feature/replacement, not a bug. Recommended approach: **minimal Vite 8 + React 19 SPA** in `apps/web`, reusing existing repo conventions.

Concrete target layout:

```
apps/web/
  index.html                     # new: <div id="root">, title/meta, favicon, /src/main.tsx
  vite.config.ts                 # new: react(), server.port 3000, server.host true
  src/
    main.tsx                     # new: createRoot(...).render(<App/>), import ./globals.css
    App.tsx                      # ported from app/page.tsx, <img> instead of next/image
    App.module.css               # moved from app/page.module.css (unchanged)
    globals.css                  # moved from app/globals.css + @font-face + :root font vars
    vite-env.d.ts                # new: /// <reference types="vite/client" />
  public/
    favicon.ico                  # moved from app/favicon.ico
    fonts/GeistVF.woff           # moved from app/fonts/
    fonts/GeistMonoVF.woff
    *.svg                        # kept; delete next.svg
```

Package changes (`apps/web/package.json`):

- scripts: `dev: "vite"` (host/port in `vite.config.ts`), `build: "tsc --noEmit && vite build"` (preserves today's type-checked build), `start: "vite preview --port 3000"`, `check-types: "tsc --noEmit"`, `lint` unchanged.
- deps: remove `next`; add `"vite": "8.3.8"` and `"@vitejs/plugin-react": "6.3.0"` (exact pins match the repo's style; versions verified against the installed Vite and the registry).

Config changes:

- `apps/web/tsconfig.json`: stop extending `nextjs.json`. Either add a new `packages/typescript-config/vite.json` (`extends ./base.json`, `module: ESNext`, `moduleResolution: Bundler`, `jsx: react-jsx`, `noEmit: true`, `types: ["vite/client"]`) and extend it, or extend `react-library.json` and override `module`/`moduleResolution`/`types` inline. Include `src`; drop `next-env.d.ts`, `next.config.js`, `.next/types`.
- `apps/web/eslint.config.js`: import `{ config } from "@repo/eslint-config/react-internal"` (same pattern as `packages/ui/eslint.config.mjs:1`).
- `turbo.json:8`: outputs become `["dist/**"]` if all apps migrate, or `["dist/**", ".next/**", "!.next/cache/**", "!.next/dev/**"]` if `apps/docs` stays on Next.
- `packages/ui/src/button.tsx:1`: delete `"use client";` (Next-only directive; Vite warns and ignores it).
- `apps/web/.gitignore`: drop `/.next/`, `/out/`, `next-env.d.ts`; `/dist/` is already covered by the root `.gitignore:28`.
- `apps/web/README.md`: rewrite for Vite (or delete — confirm).

Delete (needs human approval per AGENTS.md):

- `apps/web/next.config.js`, `apps/web/next-env.d.ts`
- `apps/web/app/` (after moving layout/page/styles/fonts/favicon out)
- `apps/web/public/next.svg` (Next.js logo, unreferenced)
- generated `apps/web/.next/` and `apps/web/.turbo/*.log`
- if docs also migrates: `apps/docs/app/`, `apps/docs/next.config.js`, `apps/docs/next-env.d.ts`, `apps/docs/public/next.svg`, `packages/typescript-config/nextjs.json`, `packages/eslint-config/next.js`, the `./next-js` export and `@next/eslint-plugin-next` dep in `packages/eslint-config/package.json`, and the Next entry in `docs/README.md:19-22`.
- dead root leftovers (optional, needs approval): `tsconfig.json` and `tsconfig.app.json` (broken reference to missing `tsconfig.node.json`).

Porting details:

- `next/font/local` → `@font-face` in `globals.css` (`font-family: "Geist"` / `"GeistMono"`, `url("/fonts/GeistVF.woff")`, `font-display: swap`) and define `--font-geist-sans` / `--font-geist-mono` on `:root` so `page.module.css` variables keep working.
- Next metadata → static `<title>` / `<meta name="description">` in `index.html`; no per-route head needed for one page.
- `next/image` → `<img width height>`; drop `priority`, drop the `ImageProps`-based `ThemeImage` type in favor of plain `ImgHTMLAttributes`. Fix the two relative `srcLight`/`srcDark` paths (`apps/web/app/page.tsx:27-28`) to `/turborepo-*.svg`.
- CSS Modules need no config in Vite (`*.module.css` is built in).

Alternatives considered:

1. Keep `apps/docs` on Next and only migrate `web` — smallest change, but `next` remains in the repo and shared Next configs stay, so REQ-5 is only met for `apps/web`.
2. Migrate both apps to Vite — slightly more work (identical files), lets `next`, `@next/eslint-plugin-next`, `nextjs.json` and `eslint-config/next.js` all be deleted.
3. `next build` static export (`output: "export"`) — rejected: keeps Next as the framework, does not satisfy the request.
4. Vite + TanStack Start for SSR — only if the SSR loaders implied by `docker-compose.yml:84-86` are a real requirement; not needed for the current placeholder page.

## 5. Affected files

Change:

- `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/eslint.config.js`, `apps/web/.gitignore`, `apps/web/README.md`
- `turbo.json` (build outputs)
- `packages/ui/src/button.tsx` (`"use client"`)
- `docker-compose.yml` only if a web Dockerfile is added or the healthcheck/SSR comment needs adjusting
- `docs/README.md` if repo-wide removal is in scope
- `pnpm-lock.yaml` (regenerated by `pnpm install` after dependency swap)

Add:

- `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/App.module.css`, `apps/web/src/globals.css`, `apps/web/src/vite-env.d.ts`
- optionally `packages/typescript-config/vite.json`

Delete (approval required):

- `apps/web/next.config.js`, `apps/web/next-env.d.ts`, `apps/web/app/*` (after move), `apps/web/public/next.svg`
- generated `apps/web/.next/`
- if docs migrates: `apps/docs/app/*`, `apps/docs/next.config.js`, `apps/docs/next-env.d.ts`, `apps/docs/public/next.svg`, `packages/typescript-config/nextjs.json`, `packages/eslint-config/next.js`
- optionally dead root `tsconfig.json`, `tsconfig.app.json`

Depends on the above: `apps/web` (only consumer of its own tsconfig/eslint), `@repo/ui` consumers (web/docs), root turbo tasks and the husky hooks that call `pnpm build` / `pnpm check-types` (`.husky/_/post-commit`, `.husky/_/pre-push`).

## 6. Constraints and risks

- **SSR assumption**: `docker-compose.yml:84-86` says "SSR loaders run inside this container". A plain Vite SPA has no SSR; if that comment reflects a real requirement, the correct target is TanStack Start, not plain Vite. Must be resolved before building.
- **`apps/docs` scope**: leaving it on Next keeps `next@16.4.6`, `@next/eslint-plugin-next`, `nextjs.json` and `eslint-config/next.js` in the repo, contradicting "remove all references".
- **Vite version drift**: installed/lockfile Vite is 8.3.8, `AGENTS.md:43` says Vite 7. Adding a second Vite major is worse than using 8.3.8; confirm.
- **New dependency**: `@vitejs/plugin-react@6.3.0` is not installed; requires `pnpm install` (lockfile change, network). Its peers (`vite ^8`) match. Without the plugin, JSX still compiles but React Fast Refresh is lost.
- **Workspace package resolution**: `@repo/ui` resolves outside `apps/web`; Vite dev-server `server.fs.allow` defaults to the workspace root (detected via `pnpm-workspace.yaml`), so it should work. If not, add `server.fs.allow: ["../.."]`.
- **Turbo cache correctness**: `turbo.json:8` must change or Vite builds will not be cached/restored. Old `.next` artifacts must be cleared so stale cache is not replayed.
- **Type checking parity**: `next build` type-checked; `vite build` does not. Use `tsc --noEmit && vite build` (recommended) or rely on the separate `check-types` task.
- **Docker**: `docker-compose.yml:65` references a non-existent `apps/web/Dockerfile`; this is broken today and stays broken unless a Dockerfile is added. Vite must bind `0.0.0.0` inside the container (`server.host: true`) or the port mapping will not reach it. The `/health` healthcheck should still get the SPA fallback HTML.
- **ESLint setup**: `@repo/eslint-config/react-internal` has browser globals and react-hooks but no Next rules; no replacement needed for a SPA. Root `pnpm lint` is Biome, which is not installed — pre-existing failure, not caused by this change.
- **Security**: no secrets involved. Removing Next removes its image optimizer and server runtime; static SVG assets are unaffected. No new attack surface beyond the dev server binding all interfaces (dev only).
- **Regression risk**: the only behavior on the page is the `@repo/ui` `Button` alert (`packages/ui/src/button.tsx:13-17`); port it unchanged.

## 7. Missing information

- Human decision: is `apps/docs` part of "remove all refrence on nextjs"?
- Human decision: must the placeholder page copy be preserved 1:1 (including `apps/web/app/page.tsx:44` "two Next.js sites") or replaced with a minimal page?
- Human decision: plain Vite SPA vs SSR-capable Vite (TanStack Start), given the docker comment.
- Human approval for the file deletions listed in §5.
- Whether a `apps/web/Dockerfile` is expected (referenced but absent; also `apps/api/Dockerfile` is absent).
- Whether `pnpm install` may be run to add `@vitejs/plugin-react` and regenerate `pnpm-lock.yaml`.
- No git history and no graphify graph exist, so there is no prior Vite implementation to recover or compare against.

## 8. Suggested tests

Existing: none for `apps/web` (no `test` script, no test files); `apps/web/.turbo/turbo-build.log` and `turbo-check-types.log` show the old Next build/typegen passing. `packages/ui` has only lint/type-check.

To add/run after the change:

- `pnpm --filter web check-types` — `tsc --noEmit` over `src`.
- `pnpm --filter web build` — Vite build produces `apps/web/dist/index.html` and hashed assets.
- `pnpm --filter web dev` — smoke: page renders, `@repo/ui` Button alert works, dark/light logo swap works, fonts load from `/fonts/*.woff`.
- `pnpm --filter web lint` — react-internal config accepts `.tsx`.
- `pnpm build` and `pnpm check-types` at root (turbo) to confirm outputs/caching.
- Optional (needs new deps `jsdom` + `@testing-library/react`, not currently installed): one Vitest smoke test rendering `App` and asserting the heading/button, to satisfy the AGENTS.md testing rule.

## 9. Recommended next step

Planning can proceed for the `apps/web`-only scope now. Before building, get three decisions: (1) does `apps/docs` also migrate, (2) plain Vite SPA vs SSR, (3) is the placeholder page replaced or ported verbatim. Also confirm the deletions and the `pnpm install` for `@vitejs/plugin-react@6.3.0`. If the human says "web only, keep docs", the plan must explicitly leave `next`, `@next/eslint-plugin-next`, `nextjs.json`, `eslint-config/next.js` and the `.next` turbo output in place.
