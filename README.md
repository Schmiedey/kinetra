# LiftLab

An interactive bench-press biomechanics sandbox built with Vite, React 19, TypeScript, React Three Fiber, Zustand, Recharts, Tailwind and shadcn components.

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
npm run preview
```

## Features

- Flat, incline and decline barbell bench using one two-link inverse-kinematics model.
- Nine technique / set controls, 101 synchronized concentric frames, playback, reset and scrubbing.
- Anatomical BodyParts3D skeleton and muscle meshes, procedural bench and barbell; six cameras; anatomy, live demand, stimulus, length, moment and force overlays.
- Per-arm external joint moments and modeled four-muscle demand / length curves.
- Distinct mechanical-demand and Estimated Stimulus Index views with drill-down values.
- Three complete comparison configurations with shared-variable locks.
- Methodology, structured research references and deterministic change explanations.
- Downloadable JSON configuration and results. Configurations are session-local, and are not saved to an account or database.
- Optional feature-detected WebMCP configure/read tools using the same Zustand actions as the UI.

## Model structure

`src/engine/` contains the pure TypeScript engine. It has no React or Three.js dependencies. `src/data/calibration.ts` holds explicit heuristic coefficients. `src/data/evidence.ts` distinguishes research evidence from model assumptions. `src/store/useSimulationStore.ts` supplies one shared result to the articulated body, telemetry and charts. Playback changes the selected frame, not the underlying calculation.

External moments use `|r × F|`, with symmetric force `loadKg × 9.81 / 2`. Hand targets are attached to one rigid bar. A two-link solver preserves the 32 cm upper arm and 29 cm forearm. Geometry uses a generic 42 cm shoulder width; it is not personalized anatomy. Elbow-flare input steers the IK pole, rather than guaranteeing a measured flare angle. Positive inclines rotate the torso about the bench hinge.

The stimulus index integrates modeled demand weighted by normalized muscle length, then applies a configurable RIR factor and a bounded loaded-ROM factor. Rep count is set context only, not a stimulus multiplier. All scores are heuristic, not fitted physiological measurements. Empty load produces zero external moment, demand and stimulus.

## Scientific limits

This is a simplified vertical-force model, not a validated musculoskeletal or hypertrophy simulator. It excludes lateral forces, inertia, body-segment gravity, muscle forces, stabilizers, joint contact forces, individual strength and fatigue. Muscle lengths are normalized proxies, not fascicle measurements. Stimulus scores are comparative indices, not growth percentages. Research informs directional behavior, not exact score calibration. Geometry beyond ordinary touch depth is a virtual model extension.

The anatomical asset contains 200 unique BodyParts3D bone meshes and 14 selected muscle meshes from [BodyExplorer](https://github.com/JohanBellander/BodyExplorer), pinned to commit `7d04bf3c4de2bd9cb234dd51d7e6857c099afafd`. All selected muscle mappings are `source: bp3d`; no supplementary Z-Anatomy mesh is included. Derived mesh data retains **CC BY-SA 2.1 Japan** and the required DBCLS attribution. See `public/models/ATTRIBUTION.md` and `public/models/manifest.json` for exact provenance, transformations and license. `scripts/prepare_anatomy.py` reproduces the merged asset from the pinned upstream files and verifies their Git blob hashes. Anatomical detail improves visual shape, not the scientific validity of the modeled pose or scores. The bench and barbell are procedural, and the social-preview artwork was generated for LiftLab.

## Verification

Vitest covers fixed segment lengths, bar attachment, bilateral symmetry, finite and bounded values across extreme configurations, load scaling, grip/incline directionality, ROM excursion, zero-load behavior, RIR separation, playback, configuration synchronization, comparison locks and explanation deltas. WebMCP contracts are exercised in a simulated supported context; browser-native WebMCP integration has not been verified. Browser interaction and visual QA were not run in this build session.

Build output is a static site in `dist/`. Sites hosting metadata lives in `.openai/hosting.json`.
