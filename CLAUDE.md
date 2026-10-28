# CLAUDE

This is my initial note. Feel Free to update, edit, create, and move around content and files.

Build an interactive website to visually explain topics to a 10-year old in 5th Grade school that has NCERT or similar syllabus. My daughter should be able to tinker with it and see how things works.

We can use https://threejs.org or something similar that works best for the web.

Let’s try with these topics for now;

- Organizations in Systems
    - Organisms
        - Paramecium
        - Amoeba
        - Bacteria
        - Yeast
    - Single Cell Organism
    - Multi Cell Organism

## Project notes

### Stack

- Plain HTML, CSS, and ES modules. No build step for the site. npm holds Wrangler (dev and deploy) and the Anthropic SDK, which Wrangler bundles into the Worker.
- Three.js `0.186.1` from jsDelivr through an import map in each page. `three/addons/` maps to `examples/jsm/` (OrbitControls, CSS2DRenderer). Bump the version in every page’s import map together.
- Run locally with `mise run dev` (Wrangler, http://localhost:8787; installs it first if needed), or `npm run dev` without mise. It matches production: clean URLs, the 404 page, and `/api`. No-install fallback: `mise run serve` or `python3 -m http.server 8000 -d public`. `file://` won’t load modules.
- `mise.toml` pins Node 22 and holds the tasks (`mise tasks` lists them). Local secrets go in the gitignored `mise.local.toml` (template: `mise.local.toml.example`); production secrets go in Cloudflare with `npx wrangler secret put`.

### Deploy (Cloudflare)

- A Cloudflare Worker named `elix` serves `public/` as static assets, at `https://elix.oinam.com` (custom domain in `wrangler.jsonc`).
- Deploys from GitHub: Cloudflare Workers Builds runs `npx wrangler deploy` on every push to `main`. Manual deploy: `npm run deploy`.
- `public/` is the web root. Everything in it is public, and nothing outside it is served.
- Server-side code: `worker/index.js` (the `main` in `wrangler.jsonc`) runs only for `/api/*` (`run_worker_first`). Every other path is a static file from `public/`, or the 404 page. Its one secret is `ANTHROPIC_API_KEY`.

### README.md is human-edited

- `README.md` is written and edited by me (Brajeshwar). Keep it machine readable (plain Markdown, clear headings), but it’s mine.
- Never write to `README.md` without my explicit permission, asked for and given in chat for that specific change. This includes small fixes, run instructions, and status tables.
- Never stage or commit `README.md` as part of other work either; I edit it while you work. Stage commits by path, never `git add -A` or `git add .`.
- Reading it is fine. If something in it is out of date, tell me and suggest the change; don’t make it.

### Layout

Everything below lives in `public/`.

```
404.html                 "Lost in the pond" page (Cloudflare serves it for missing paths)
favicon.ico, favicon-*.png, apple-touch-icon.png, android-chrome-*.png
                         Icons copied from ~/dev/oinam.com; every page links them in <head>
oinam-logo.svg, oinam-logo-light.svg
                         The Oinam logo (dark mark, and the knockout version), from ~/dev/oinam.com
index.html               Home: the bookshelf (Science; Mathematics and Social Science coming)
science/index.html       Science: its units (Unit 4 so far)
science/unit-4.html      Unit 4: Organization in Systems. Topic cards in the book's order,
                         "Play now" or "Coming next". Every topic page's Back goes here
css/style.css            All styles, shared by every page
js/theme.js              Light/dark toggle (plain script in <head>). Follows the OS
                         until a choice is saved; window.elixTheme.watch(fn) for 3D colors
js/scene.js              createStage(): renderer, camera, lights, orbit controls,
                         labels, resize, and the animation loop (onFrame, pause)
js/explorer.js           createExplorer(): tap-to-learn parts, labels, glow, info card,
                         self-ticking "Try this!" stars, Cello, Labels/Pause buttons;
                         bindSlider(), bindToggle()
js/cellparts.js          Shared 3D cell parts: blob shapes, nucleus (pores, nucleolus,
                         threads that coil into chromosomes), mitochondria, vacuoles,
                         centrioles, chloroplasts, ER, Golgi body, ribosomes
js/mascot.js             Cello the cell: createMascot(dock).say(text, { mood }), celebrate()
js/voice.js              Cello’s voice: speak(text) plays a line’s clips sentence by sentence,
                         the 🔊 Voice toggle; voiceSentences() and voiceKey() are shared
                         with scripts/voice.mjs
js/ask.js                Ask Cello: the question box, shown only when /api/ask says it’s ready
audio/                   Voice clips, <key>.mp3, and manifest.json; made by `mise run voice`
js/progress.js           Stars per topic in localStorage; showStars() fills the menu pills
                         ("⭐ 3 of 5" per topic, or a total for data-topics="a b c")
organisms/<name>.html    One page per organism (paramecium, amoeba, bacteria, yeast):
                         topbar, 3D stage, control panel
topics/<name>.html       Concept pages: systems (a bicycle to take apart), single-cell
                         (one cell, every job; riddles), microscope (parts, eyepiece view
                         drawn in 2D, invention timeline with a how-small scale), cell
                         (membrane gatekeeper, nucleus), cytoplasm (organelles, smooth ER,
                         cytoskeleton), centrioles (cell splitting step by step),
                         plant-vs-animal, multi-cell (cell → tissue → organ → organ system
                         → organism), organ-systems (body systems; xylem and phloem in a
                         plant), special-cells (red blood, nerve, muscle, white blood
                         cells), and cancer (a gentle note: cells that stop following
                         the rules)
js/<name>.js             That page's models, animation, and controls
```

### Voice and Ask Cello

- Voice: `mise run voice` (`scripts/voice.mjs`) finds every sentence-like string in `public/` scripts, and makes one ElevenLabs clip per sentence into `public/audio/`. It’s a dry run (counts lines and characters) until `ELEVENLABS_API_KEY` is set in `mise.local.toml`. The clips are committed; the site never calls ElevenLabs. Every `cello.say()` and every tap-to-learn card speaks, if its clips exist; lines with numbers or names spliced in stay silent. After changing any line, run `mise run voice` again: it only makes the new sentences, and deletes clips nothing uses. The voice is a British female voice (`ELEVENLABS_VOICE_ID`, or the first one `mise run voices` finds); “Cello” is said “Sello”.
- Ask Cello: `worker/index.js` answers `POST /api/ask` with Claude Haiku 5.5 (`claude-haiku-5-5`), low effort, three short sentences at most, kept to the page’s topic. Limits: 5 questions a minute per visitor and 60 a minute for the site (`ratelimits` in `wrangler.jsonc`), and 200 characters a question. Without the key, the box doesn’t appear.

The look follows https://coolphabets.com in spirit: Nunito (self-hosted in `fonts/`, Latin and Latin Extended only), cream dot-grid page, chunky ink outlines (`.chunky`), hard shadows with press-down buttons (`.press`), pastel pills and tiles, wavy underlines (`.wavy`), and a slight tilt on cards. Keep tilts at 2° or less, and put any motion behind `prefers-reduced-motion`.

Colors live in CSS variables in `css/style.css`, with a `[data-theme="light"]` block. Never hard-code a color in a rule; add a variable to both themes.

To add an organism: copy `organisms/paramecium.html` for the page shell, write `js/<name>.js` on top of `createStage()` and `createExplorer()`, list its challenges as `<li data-challenge="id">`, then turn its card on the unit page (`science/unit-4.html`) into a link with the “Play now” pill and a `<span class="pill stars" id="stars-<topic>" hidden>`, and add the topic id to the `data-topics` lists on `index.html` and `science/index.html`.

Books: the scanned chapters live in `tmp/Books/` (gitignored, never published). Each unit page follows its chapter’s order; explainers are in our own words, never copied from the book.

### For the audience (a 10-year-old)

- Typography: curly quotes and apostrophes (“ ” ‘ ’) in all text she reads, docs included. Straight quotes stay only in code: JS string delimiters, HTML attributes, CSS selectors, and the SVG markup in `js/mascot.js`.
- Short sentences, everyday words. Name the real term once, in brackets: “Mouth (cytostome)”.
- Every page needs things to grab: sliders, toggles, buttons, and tap-to-learn parts with a short “what is this?” card.
- Include a “Try this!” list of experiments that ticks itself off (`data-challenge`) and earns stars, plus a “Fast facts” list.
- Cello reacts to what she does: first-time successes, mistakes, and discoveries. Keep the lines short, warm, and never scolding.
- Big type and touch-sized controls (at least 44px). Give every scene Pause and Reset view.
- Keep the science right, even when it’s simplified. Check facts against the NCERT Grade 5 to 8 books. Easy ones to get wrong: bacteria have no nucleus; yeast is a fungus and buds; the fridge stops bacteria growing but doesn’t kill them; boiling does.
- Where her school book disagrees, the site keeps the right fact. Unit 4’s timeline says electron microscopes came in the 1940s and that the 1982 tunneling microscope sees blood cells; it was 1981 and it sees atoms. Mature human red blood cells have no nucleus. Cancer is not catching, and that page stays calm and never blames anyone.
- More to keep right: magnification is eyepiece × objective; Leeuwenhoek used a single-lens microscope; the first electron microscope was 1931 (Ruska and Knoll; NCERT says 1940). Centrioles set up the spindle, but the spindle fibers do the pulling; most plant cells have no centrioles and build a new wall instead of pinching. Animal cells have small vacuoles, not none. Mitochondria are in both plant and animal cells.
