# LiftLab

A movement library, anatomical explorer, workout planner and detailed bench-press biomechanics lab built with Vite, React 19, TypeScript, React Three Fiber, Zustand, Recharts, Tailwind and shadcn components. A Cloudflare Worker with D1 persists each visitor's library.

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

- 44 movement templates across 16 patterns: presses, pulls, squats, hinges, lunges, isolation, carries and core work. Search by movement or muscle and filter by pattern/equipment.
- Full-body anatomical previews with assigned primary/supporting muscle highlights, playback, scrubbing, camera controls and pattern-specific setup adjustments.
- Create, edit, duplicate and favorite custom movements with equipment, muscle roles, cues, notes and setup parameters.
- Build and reorder workouts; track sets, reps or seconds, total external load, notes and rest timers. Save the last 30 sessions and repeat a previous plan.
- Server-persisted custom movements, favorites, current workout and history, with validated JSON backup import/export.

- Flat, incline and decline barbell bench using one two-link inverse-kinematics model.
- Nine technique / set controls, 101 synchronized concentric frames, playback, reset and scrubbing.
- Anatomical BodyParts3D skeleton and muscle meshes, procedural bench and barbell; six cameras; anatomy, live demand, stimulus, length, moment and force overlays.
- Per-arm external joint moments and modeled four-muscle demand / length curves.
- Distinct mechanical-demand and Estimated Stimulus Index views with drill-down values.
- Three complete comparison configurations with shared-variable locks.
- Methodology, structured research references and deterministic change explanations.
- Downloadable Bench lab JSON configuration and results. Detailed bench comparison slots remain session-local; saved movement variations and workouts persist separately.
- Optional feature-detected WebMCP configure/read tools using the same Zustand actions as the UI.

## Model structure

`src/engine/` contains the pure TypeScript engine. It has no React or Three.js dependencies. `src/data/calibration.ts` holds explicit heuristic coefficients. `src/data/evidence.ts` distinguishes research evidence from model assumptions. `src/store/useSimulationStore.ts` supplies one shared result to the articulated body, telemetry and charts. Playback changes the selected frame, not the underlying calculation.

External moments use `|r × F|`, with symmetric force `loadKg × 9.81 / 2`. Hand targets are attached to one rigid bar. A two-link solver preserves the 32 cm upper arm and 29 cm forearm. Geometry uses a generic 42 cm shoulder width; it is not personalized anatomy. Elbow-flare input steers the IK pole, rather than guaranteeing a measured flare angle. Positive inclines rotate the torso about the bench hinge.

The stimulus index integrates modeled demand weighted by normalized muscle length, then applies a configurable RIR factor and a bounded loaded-ROM factor. Rep count is set context only, not a stimulus multiplier. All scores are heuristic, not fitted physiological measurements. Empty load produces zero external moment, demand and stimulus.

## Scientific limits

This is a simplified vertical-force model, not a validated musculoskeletal or hypertrophy simulator. It excludes lateral forces, inertia, body-segment gravity, muscle forces, stabilizers, joint contact forces, individual strength and fatigue. Muscle lengths are normalized proxies, not fascicle measurements. Stimulus scores are comparative indices, not growth percentages. Research informs directional behavior, not exact score calibration. Geometry beyond ordinary touch depth is a virtual model extension.

The anatomical asset contains 200 unique bone meshes and 62 muscle meshes from [BodyExplorer](https://github.com/JohanBellander/BodyExplorer), pinned to commit `7d04bf3c4de2bd9cb234dd51d7e6857c099afafd`. BodyParts3D components retain **CC BY-SA 2.1 Japan** and DBCLS attribution; four supplementary Z-Anatomy latissimus dorsi/rectus abdominis components retain **CC BY-SA 4.0**. See `public/models/ATTRIBUTION.md` and `public/models/manifest.json` for per-component provenance and licenses. `scripts/prepare_anatomy.py` reproduces the merged asset and checks upstream Git blob hashes. Finger phalanges use independent rigid rotations to preserve bone shapes, with opposed thumbs and a handle-aligned grip frame. Anatomical detail does not validate modeled motion or scores. The bench and weights are procedural; the social-preview artwork was generated for LiftLab.

The broad movement library uses illustrative pattern templates, not individually validated motion capture. Its highlights represent assigned muscle roles, not measured activation. Custom exercises inherit a selected pattern. The numerical biomechanical model applies only to the Bench lab.

## Persistence and deployment

`server/index.ts` exposes GET/PUT `/api/library`. A random 256-bit HttpOnly SameSite cookie identifies a visitor's private library; the data lives in D1, not localStorage. Production cookies are Secure. Writes validate the payload, check Origin and use revision-based optimistic concurrency so another tab cannot silently overwrite newer changes. Failed saves remain visible with export/retry options. Clearing cookies loses that browser's library identity; export/import transfers a backup. This is browser-scoped persistence, not account sign-in or cross-device sync.

Local development uses Node's SQLite implementation in ignored `.local/liftlab.sqlite`. Production schema changes come from generated Drizzle migrations in `drizzle/`; run `npx drizzle-kit generate` after editing `db/schema.ts`. The build emits `dist/client` assets and a Workers-compatible `dist/server/index.js`. Sites provisions the `DB` binding declared in `.openai/hosting.json` and applies the packaged migrations. Static Vite preview does not run the library API; use `npm run dev` for local end-to-end use.

## Verification

Vitest covers fixed segment lengths, grip contact on the handle across all templates, finite poses, anatomical skin weights, load scaling, ROM, comparison locks and explanations. API tests run the generated migrations against SQLite and verify durable round trips, visitor isolation, stale-write protection and invalid/cross-origin write rejection. Targeted visual inspection was performed for the repaired hands. WebMCP contracts are exercised in a simulated supported context.

Build and lint checks run before publishing the Worker and client assets through Sites.
