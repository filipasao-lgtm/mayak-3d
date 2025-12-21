# Copilot instructions for MAYAK-3D

Purpose: Provide short, actionable guidance so an AI coding agent can be productive immediately in this repo.

Summary
- Minimal React + Vite 3D demo using @react-three/fiber, @react-three/drei and Three.js.
- Single-page app renders a `mayak.glb` model from `public/` and exposes simple interactions and animation sequences.

Quick start (commands)
- Dev server: `npm run dev` (starts Vite with HMR)
- Build: `npm run build` (Vite production build)
- Preview: `npm run preview` (Vite preview of build)
- Lint: `npm run lint` (runs ESLint per `eslint.config.js`)

Project layout & key files
- `index.html` — app entry; mounts React at `<div id="root">` and loads `/src/main.jsx`.
- `src/main.jsx` — renders `<App />` inside React StrictMode.
- `src/App.jsx` — the single main component: sets up the `Canvas`, lights, `Environment`, `OrbitControls`, `ContactShadows` and loads the `mayak.glb` model via `useGLTF`.
- `public/mayak.glb` — model file loaded at runtime via `useGLTF('/mayak.glb')`.
- `eslint.config.js` — project lint rules. Note: `no-unused-vars` is configured to ignore identifiers beginning with uppercase or underscore (`'^[A-Z_]'`).

Architecture & behavior notes (what to preserve)
- Camera and intro sequence: App starts camera at `[0, 10, 8]`. An `Intro` component lerps the camera down to a normal view and disables/enables `OrbitControls` via `introFinished` state. Preserve this gating when changing controls or camera logic.
- Model + animations: `MayakModel` uses `useGLTF` and `useAnimations`. Animation names are mapped in `ANIMATION_NAMES` constant and played via `actions[name].play()`; `playSequence` schedules animation playback with `setTimeout`. Keep animation name mapping and click-based play semantics (clicks are detected using the clicked mesh name: `e.object.name.includes('btn_CASSETTE')`).
- Shadows & lighting: Meshes are configured to `castShadow` and `receiveShadow`. The `Canvas` uses `shadows` and lights have `castShadow` set; preserve shadow config when modifying scene graph.

Conventions & patterns
- File extensions: `.jsx` for React components (no TypeScript in repo yet).
- Constants: animation names and other globals are UPPER_SNAKE_CASE (e.g., `ANIMATION_NAMES`). ESLint ignores unused vars that start uppercase — don't automatically remove such constants if lint complains locally.
- Public assets: files in `public/` are served from the root path (e.g., `/mayak.glb`). Use that convention for new static assets.
- Interaction pattern: click handlers use `e.object.name` to identify sub-meshes in the GLB. Prefer name containment checks (`includes`) as the model uses prefixed names.

Performance & build quirks
- `package.json` overrides `vite` to `rolldown-vite@7.2.5` (see `overrides`). Avoid upgrading Vite without verifying the custom rolldown build behavior.

What’s NOT in the repo
- No unit/integration tests configured. If adding tests, include simple render and interaction tests for `App.jsx`/`MayakModel`.
- No CI workflows or pre-commit hooks exist yet.

When editing the model or animations
- Update `ANIMATION_NAMES` in `src/App.jsx` if animation clip names change.
- Use `scene.traverse` to set `castShadow` / `receiveShadow` on meshes (this is already done in `MayakModel`).
- If adding new interactions, attach handlers to the `primitive object={scene}` or specific mesh nodes and check `e.object.name`.

Examples (copy-paste)
# Copilot instructions for MAYAK-3D

Purpose: short, actionable guidance so an AI coding agent can be productive immediately in this repo.

Summary
- Minimal React + Vite 3D demo using @react-three/fiber, @react-three/drei and Three.js.
- Single-page app renders `public/mayak.glb` and exposes click-driven interactions and animation sequences.

Quick start (commands)
- Dev: `npm run dev` — Vite with HMR
- Build: `npm run build` — production build
- Preview: `npm run preview` — preview built site
- Lint: `npm run lint` — ESLint per `eslint.config.js`

Project layout & primary files
- `index.html` — mounts React at `<div id="root">` and loads `src/main.jsx`.
- `src/main.jsx` — renders `<App />` inside React StrictMode.
- `src/App.jsx` — main scene: sets up `Canvas`, lights, `Environment`, `OrbitControls`, `ContactShadows`, `StudioBackground`, and loads the GLB via `useGLTF`.
- `src/App.jsx` specifics to preserve:
	- `ANIMATION_NAMES` constant maps human names → animation clips (update this if clips change).
	- `Intro` component lerps camera from `[0,10,8]` toward `y=0.5, z=4` and toggles `OrbitControls` via `introFinished`.
	- `MayakModel` uses `useGLTF('/mayak.glb')`, `useAnimations` and `scene.traverse` to set `castShadow`/`receiveShadow` on meshes.
- `public/mayak.glb` — GLB model loaded at runtime (referenced as `/mayak.glb`).
- `eslint.config.js` — ESLint config (note: `no-unused-vars` ignores identifiers that match `^[A-Z_]`).

Conventions & common patterns
- File extensions: `.jsx` (no TypeScript present).
- Naming: animation/constant names are UPPER_SNAKE_CASE (e.g., `ANIMATION_NAMES`). Don’t remove these even if lint flags them.
- Asset serving: files in `public/` are served from the root (use `/your-file` paths).
- Interaction pattern: clicks detect parts using `e.object.name.includes('<substring>')`. Use `e.stopPropagation()` inside handlers to avoid multiple triggers.
- Play pattern: animations are reset, set to `THREE.LoopOnce`, `clampWhenFinished = true`, then played (see examples below).

Dev notes & gotchas
- Vite override: `package.json` pins `vite` to `npm:rolldown-vite@7.2.5` via `overrides` — do not upgrade Vite without validating against this custom build.
- Shadows: spotLight uses `shadow-mapSize` and `shadow-bias` tuning. Meshes explicitly set `castShadow` and `receiveShadow` in `MayakModel`.
- Camera & controls: keep the `Intro` gating (disable controls until intro finishes) to preserve initial camera animation and UX.
- ContactShadows vs Backdrop: `StudioBackground` (Backdrop) provides the curved wall/floor; `ContactShadows` is optional for extra darkness beneath the model.

Integration points & external deps
- @react-three/fiber, @react-three/drei, three: Scene and runtime behaviour depend on these versions in `package.json`.
- GLB names: Model sub-mesh names are authoritative (use `e.object.name.includes(...)` to target parts). Changing names in the GLB requires updating `ANIMATION_NAMES` and click checks.

Examples (copy-paste)
- Safe play of an animation clip:
```js
const anim = actions[ANIMATION_NAMES.button];
if (anim) {
	anim.reset();
	anim.setLoop(THREE.LoopOnce);
	anim.clampWhenFinished = true;
	anim.play();
}
```
- Click handler pattern on the scene primitive:
```js
<primitive
	object={scene}
	scale={5}
	onClick={(e) => {
		if (e.object.name.includes('btn_CASSETTE')) {
			e.stopPropagation();
			playSequence();
		}
	}}
/>
```

What’s NOT included
- No unit/integration tests or CI workflows yet. If you add tests, focus on rendering + interaction smoke tests for `App.jsx` / `MayakModel` (simulate clicks and assert animations/actions are invoked).

Editing the model or animations (checklist)
- Update `ANIMATION_NAMES` in `src/App.jsx` when clip names change.
- Use `scene.traverse` to set `castShadow` / `receiveShadow` on new meshes.
- Attach interactions to `primitive object={scene}` or specific nodes and use `e.object.name.includes()` for detection.

Missing details / follow-ups
- Confirm target browsers / Node version if adding CI or specifying `engines`.
- If you want, I can add a small Jest + React Testing Library smoke test that renders `App.jsx` and simulates a button click.

---

If any section is unclear or you want extra examples (tests, CI, or model editing tips), tell me which area to expand. ✅
