# moto-web: KESTREL moto garage

Welcome to the KESTREL moto web. It's an interactive, playful website for **KESTREL**, a made-up motorcycle brand.
You can spin and rev a 3D bike, open it up to see how its parts work, ride it on a neon grid, and learn basic bike
care in a cartoon workshop.

It's a student project: the brand, bikes and history are all fictional. It's built with plain HTML, CSS and
JavaScript, with no build step and no npm.

## What's on the page

| Section | What you can do |
|---|---|
| Hero: **Showroom** | 3D KESTREL K6 sport bike: drag to spin, hold **Hold to rev** (or Space/Enter), click the bike for a wheelie, change the paint. Turn on **Sound** in the header for an engine note. |
| Hero: **Explore** | Numbered dots pinned to 10 parts. Click a dot, the part itself or a name in the list for a short explanation. **Explode** pulls the parts apart; **X-ray** makes the bodywork see-through. Esc deselects. |
| Hero: **Ride** | Ride the bike on a neon grid: W/↑ throttle, S/↓ brake, A D/← → lean, Space wheelie, Q/E shift. A "pit radio" coach explains what the bike is doing. Touch buttons on phones. |
| On the lift | Scroll and the bike goes up on a lift: 8 stops, 8 parts, how each works plus a care tip. |
| Workbench | Four hands-on demos: 4-stroke engine (turn the crank), gearbox (shift), brakes (hold), suspension (bump). |
| Lineup | Filter chips reorder the cards (GSAP Flip). Hover a card: wheelie and name scramble. |
| Service bay | Lift tools off a pegboard to read their job card; tick the T-CLOCS pre-ride checklist. |
| Heritage | Section pins; the road draws itself and a bike rides it through 1958, 1972, 1984 and 2015. |
| Garage | Drag and throw the bike down the strip (arrow keys work too). |
| Crew | Newsletter form. Demo mode until you connect a form service (see below). |

Each section has its own accent colour (orange, blue, pink, teal, violet, yellow).

## Run it

```
python -m http.server 8000
```

Then open http://localhost:8000. An internet connection is needed: GSAP, Three.js and the
Archivo font load from CDNs.

## Files

```
index.html        Page structure
design-dna.json   Design decisions: colours, type, motion rules, allowed patterns
css/styles.css    All styling; colour tokens at the top (primitives > semantic > component)
js/data.js        All text: models, milestones, parts, lift tour, demos, service, form endpoint  <- edit this
js/main.js        GSAP motion and interactions
js/bike3d.js      Three.js 3D bike (hand-built in code; loads a GLB if you add one)
tools/test-*.mjs  Headless-Chrome tests (see Testing)
```

## Skills used to build it

The site was built with [Claude Code](https://claude.com/claude-code) and these installed skills:

| Skill | What it was used for |
|---|---|
| `genjutsu` (paint + design-audit) | Design pipeline: visual and interaction thesis first, then the design audit (durations, easings, colours, radii) |
| `design-dna` | Wrote `design-dna.json`: the visual style, motion rules and allowed/forbidden patterns |
| `design-system` | The three-layer colour tokens in `css/styles.css` (primitives > semantic > component) |
| `ui-ux-pro-max` | Layout, palette and UX choices: the workshop theme, per-section accents, touch targets |
| `motion-design` | Motion feel: the "throttle" ease, snap-forward entrances, reduced-motion behaviour |
| `web-design-guidelines` | Accessibility and UI review: keyboard use, focus rings, contrast at least 4.5:1 |
| `writing-guidelines` | Short, plain on-page text and docs |
| GSAP skills: `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-performance` | Loader, SplitText titles, pinned heritage road (DrawSVG + MotionPath), Flip lineup filter, Draggable throw, scroll-velocity marquee |
| Three.js skills: `threejs-fundamentals`, `-geometry`, `-materials`, `-lighting`, `-textures`, `-interaction`, `-animation`, `-loaders`, `-shaders`, `-postprocessing` | The hand-built 3D bike, PBR paint, day/night lighting, ground shader, part picking, exploded view, bloom, GLB loader |
| `claude-mem` (`make-plan`, `do`, `mem-search`) | The phased redesign plan, built step by step, and memory of past sessions |
| `ponytail` | Keep the code small: no build step, no extra libraries, browser features first |

## Testing

The tests drive headless Chrome, take screenshots and print console errors. Start a server first
(`python -m http.server 8765`), then for example:

```
node tools/test-page.mjs      http://localhost:8765/index.html out 1440 900 0   # whole page (INTERACT=1 adds throw + wheelie)
node tools/test-modes.mjs     http://localhost:8765/index.html out 390 844 1    # showroom / explore / explode / x-ray / ride on a phone
node tools/test-ride.mjs      http://localhost:8765/index.html out 390 844 1    # ride coach tips (RM=reduce for reduced motion)
node tools/test-lift.mjs      http://localhost:8765/index.html out 390 844 1    # lift tour
node tools/test-workbench.mjs http://localhost:8765/index.html out 1440 900 0   # workbench demos
node tools/test-service.mjs   http://localhost:8765/index.html out 1440 900 0   # service bay + checklist
```

## Adding a real 3D model (optional)

Put a `.glb` at `assets/models/bike.glb` (or an unpacked glTF so `assets/models/scene.gltf` exists) and open the
site through the local server. If its licence needs credit (e.g. CC BY), fill in `model.credit` in `js/data.js`:
the footer shows it. If the bike faces the wrong way, set `model.rotateY` (e.g. `3.1416`).

## Editing

- **Text, models, parts:** `js/data.js`. Each model has a `family` (sport, street, offroad, cruise) for the filter
  chips, and `color` / `rim` for its drawing.
- **Colours:** tokens at the top of `css/styles.css`; per-section accents sit right under the tokens. Mirrored in `design-dna.json`.
- **Facts:** general info only (engine sizes, how parts work). No horsepower, weights or prices.
- **Form:** create a form at https://formspree.io and paste its endpoint into `formEndpoint`.

## Accessibility and fallbacks

- "Reduce motion" in the OS: no loader, no pinning or scrubbing, no auto-spin; everything is shown statically.
- No WebGL: the hero shows a drawn bike instead of the 3D one.
- GSAP fails to load: content and the form still work, without animation.
- Every interactive part is reachable by keyboard; text contrast is at least 4.5:1.

## Libraries (pinned versions)

- GSAP 3.13.0 with ScrollTrigger, ScrollTo, SplitText, ScrambleText, DrawSVG, MotionPath,
  Draggable, Inertia, Flip, CustomEase, Physics2D (all free since 3.13)
- Three.js r160: OrbitControls, EffectComposer, UnrealBloomPass, OutputPass, RoomEnvironment
