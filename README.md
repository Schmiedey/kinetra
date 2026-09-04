# LiftLab

A load and impact lab for 44 movements, plus a tighter 4-muscle barbell-bench model. Vite, React 19, TypeScript, React Three Fiber, Zustand. A Cloudflare Worker with D1 persists each visitor's library.

## Run

Node.js 22.13+ is required.

```sh
npm install
npm run dev
```

```sh
npm test
npm run lint
npm run build
```

## Features

- Lab for every catalog movement: external load or ground reaction, |r × F| joint moments, tissue demand, and a compression/impact proxy in bodyweights.
- Muscle-first 3D. Color is live demand. Force arrows are the applied load and GRF. Skeleton is off unless you turn it on.
- Load is the independent variable. ROM, stance and angle are discrete setup chips, not a slider farm.
- 44 templates across 16 patterns. Custom movements inherit the selected pattern’s load case.
- Session planner stacks tissue load across the current workout. Open any item back in the lab at its prescribed load.
- Server-persisted custom movements, favorites, current workout and history, with JSON backup import/export.
- Separate 4-muscle bench model with 101 concentric frames, pec regional split, compare slots and research notes.

## Model structure

`src/engine/tissueLoad.ts` is the whole-library static inverse-dynamics pass. It has no React dependency. Pose landmarks come from the articulated preview; forces depend on pattern and equipment (hands, ankles, or GRF at the forefoot). Tissue demand allocates those moments with explicit share tables. Impact is |F| plus moment / 5 cm as a muscle-force proxy.

The Bench tab still uses `src/engine/simulate.ts` for the four-muscle bench model. `src/data/calibration.ts` holds that model’s coefficients. Playback of either lab changes the selected frame, not the underlying calculation.

Empty isolation load produces ~zero external moment. Squats, hinges and carries still load the legs from body mass through ground reaction.

## Scientific limits

This is a simplified static model, not a validated musculoskeletal or hypertrophy simulator. It excludes inertia, most segment weights, muscle force-length-velocity, co-contraction beyond the share tables, and imaged joint contact. Muscle lengths are normalized proxies. Demand is a comparative index, not EMG. Research informs directional behavior of the bench model, not exact score calibration.

The anatomical asset contains 200 unique bone meshes and 280 muscle meshes from [BodyExplorer](https://github.com/JohanBellander/BodyExplorer), pinned to commit `7d04bf3c4de2bd9cb234dd51d7e6857c099afafd`. BodyParts3D components retain **CC BY-SA 2.1 Japan** and DBCLS attribution; four supplementary Z-Anatomy latissimus dorsi/rectus abdominis components retain **CC BY-SA 4.0**. See `public/models/ATTRIBUTION.md`. Anatomical detail does not validate modeled motion or scores.

Kinematic templates are pattern generators, not motion capture. Custom exercises inherit a selected pattern. The four-muscle pec/delt/triceps split applies only to the Bench tab.

## Persistence and deployment

`server/index.ts` exposes GET/PUT `/api/library`. A random 256-bit HttpOnly SameSite cookie identifies a visitor's private library; the data lives in D1, not localStorage. Production cookies are Secure. Writes validate the payload, check Origin and use revision-based optimistic concurrency so another tab cannot silently overwrite newer changes. Failed saves remain visible with export/retry options. Clearing cookies loses that browser's library identity; export/import transfers a backup. This is browser-scoped persistence, not account sign-in or cross-device sync.

Local development uses Node's SQLite implementation in ignored `.local/liftlab.sqlite`. Production schema changes come from generated Drizzle migrations in `drizzle/`; run `npx drizzle-kit generate` after editing `db/schema.ts`. The build emits `dist/client` assets and a Workers-compatible `dist/server/index.js`. Sites provisions the `DB` binding declared in `.openai/hosting.json` (copy from `.openai/hosting.json.example`) and applies the packaged migrations. Static Vite preview does not run the library API; use `npm run dev` for local end-to-end use.

## Verification

Vitest covers load scaling, ground-reaction squats, pattern-specific hottest tissues, fixed segment lengths, grip contact, finite poses, anatomical skin weights, bench ROM, comparison locks and explanations. API tests run the generated migrations against SQLite and verify durable round trips, visitor isolation, stale-write protection and invalid/cross-origin write rejection. Targeted visual inspection was performed for the repaired hands. WebMCP contracts are exercised in a simulated supported context.

Build and lint checks run before publishing the Worker and client assets through Sites.
