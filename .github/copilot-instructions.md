## Repo Overview

This repository is a full-stack React Router (v7) application with server-side code and DB schema in the same repo. Key areas:
- `app/` — app source: `root.tsx`, `routes.ts`, route components in `app/routes/` and small server helpers in `app/server/`.
- `app/lib/` — shared clients (e.g. `supabase.ts`).
- `app/src/db/schema.ts` & `drizzle.config.ts` — Drizzle ORM schema + migrations in `drizzle/`.
- `public/` — static assets and service worker registered in `app/root.tsx`.

Quick facts:
- Routes are declared centrally in `app/routes.ts` (maps URL paths → files in `app/routes/`).
- Path alias: `~/*` → `./app/*` (see `tsconfig.json`).
- Dev/build/start use the `react-router` CLI (see `package.json`): `npm run dev`, `npm run build`, `npm run start`.

## Architecture & Dataflow

- Routing: `app/routes.ts` exports a RouteConfig array. Each entry's `file` is a path inside `app/routes/` (e.g. `routes/face-detection/route.tsx`). Use that pattern when adding routes.
- Server helpers: lightweight server-side modules live in `app/server/` (e.g. `create-test.ts`, `image-upload.ts`). These are imported from route handlers (and from client/server shared code) via the `~` alias: `import { supabase } from "~/lib/supabase"`.
- Database: Drizzle schema lives at `app/src/db/schema.ts`. Migrations are generated/kept in `drizzle/` and `drizzle.config.ts` points to the schema. The project expects a `DATABASE_URL` env var.
- External integrations: Supabase (`app/lib/supabase.ts`), Firebase Admin (service key in `.env`), and TensorFlow / face detection libraries (used by the `face-detection` route). See `package.json` for versions.

## Environment & Secrets

- Required env vars (examples found in `.env`): `DATABASE_URL`, `SESSION_SECRET`, `FIREBASE_ADMIN_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- Supabase client created with `process.env.SUPABASE_URL` + `SUPABASE_ANON_KEY` in `app/lib/supabase.ts`.

## Developer Workflows

- Install deps: `npm install`.
- Dev with HMR + server: `npm run dev` (uses `react-router dev`). The app will typically be at `http://localhost:5173`.
- Build production server + client: `npm run build` then run `npm run start` to serve the built app.
- Type generation + typecheck: `npm run typecheck` runs `react-router typegen && tsc`.
- Drizzle migrations: use `drizzle-kit`/`drizzle` scripts (see `drizzle.config.ts`). Run migrations from the repo root; config points to `app/src/db/schema.ts`.

## Code Conventions & Patterns (project-specific)

- Route files: files under `app/routes/*` export React route components and may contain both client and server logic depending on filename/context. Follow the pattern in `app/routes/start-test.*` for dynamic segments and nested flows.
- Dynamic segments: filenames use `.$param` convention (e.g. `start-test.$testID.tsx`) and are wired from `app/routes.ts` entries.
- Server helpers: place shared server utilities in `app/server/` (not `app/routes/`) and import via the `~` alias. Example: `app/server/image-upload.ts` exports `uploadQuestionImage` which uses `app/lib/supabase.ts`.
- DB layer: prefer Drizzle types and `pgTable` definitions in `app/src/db/schema.ts`. Use these schemas when writing queries to keep types aligned with DB.
- Storage: Supabase Storage is used for question images (`question-images` bucket). See `app/server/image-upload.ts` for upload/getPublicUrl usage.

## Face-detection / ML notes

- Face/landmark detection relies on TFJS and `@tensorflow-models/*` plus `face-api.js`. Expect to run this in the browser (client-side) and follow the existing `app/routes/face-detection/route.tsx` implementation for loading models.
- When updating TF model versions, check browser backend compatibility (`@tensorflow/tfjs-backend-webgl`) and ensure model loading code (promises, async model.load) matches the package API.

## Where to look for examples

- App shell + service worker registration: `app/root.tsx`.
- Routing patterns + dynamic routes: `app/routes.ts` and `app/routes/start-test.*` files.
- Supabase usage: `app/lib/supabase.ts` and `app/server/image-upload.ts`.
- DB schema + migration flow: `app/src/db/schema.ts` and `drizzle.config.ts`.
- Server helper collection: `app/server/*` (create-test, close-test, get-test-details-with-id, etc.).

## Prompting hints for the AI

- When changing routes, update `app/routes.ts` and add the corresponding file in `app/routes/`.
- For database changes, update `app/src/db/schema.ts` and run Drizzle migrations; DO NOT hand-edit `drizzle/` snapshots directly.
- For secrets, reference `.env` to find names and sample formats used in this repo.
- Prefer using `~` import paths to locate app code (e.g. `~/server/...`, `~/lib/...`).

If anything here is unclear or you'd like me to add snippets showing the common import statements and a small example route, tell me which area to expand.
