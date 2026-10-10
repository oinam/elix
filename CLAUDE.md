# CLAUDE

This is my initial note. Feel Free to update, edit, create, and move around content and files.

Build an interactive website to visually explain topics to a 10-year old in 5th Grade school that has NCERT or similar syllabus. My daughter should be able to tinker with it and see how things works.

We can use https://threejs.org or something similar that works best for the web.

Let's try with these topics for now;

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

- Plain HTML, CSS, and ES modules. No build step, no npm dependencies.
- Three.js `0.186.1` from jsDelivr through an import map in each page. `three/addons/` maps to `examples/jsm/` (OrbitControls, CSS2DRenderer). Bump the version in every page's import map together.
- Serve with `python3 -m http.server 8000`; `file://` won't load modules.

### README.md is human-edited

- `README.md` is written and edited by me (Brajeshwar). Keep it machine readable (plain Markdown, clear headings), but it's mine.
- Never write to `README.md` without my explicit permission, asked for and given in chat for that specific change. This includes small fixes, run instructions, and status tables.
- Reading it is fine. If something in it is out of date, tell me and suggest the change; don't make it.

### Layout

```
index.html               Home: topic cards ("Play now" / "Coming next")
css/style.css            All styles, shared by every page
js/theme.js              Light/dark toggle (plain script in <head>). Follows the OS
                         until a choice is saved; window.elixTheme.watch(fn) for 3D colors
js/scene.js              createStage(): renderer, camera, lights, orbit controls,
                         labels, resize, and the animation loop (onFrame, pause)
js/mascot.js             Cello the cell: createMascot(dock).say(text, { mood }), celebrate()
js/progress.js           Stars per topic in localStorage (the home card shows "⭐ 3 of 5")
organisms/<name>.html    One page per organism: topbar, 3D stage, control panel
js/<name>.js             That organism's model, animation, and controls
```

The look follows https://coolphabets.com in spirit: Nunito (fontsource on jsDelivr), cream dot-grid page, chunky ink outlines (`.chunky`), hard shadows with press-down buttons (`.press`), pastel pills and tiles, wavy underlines (`.wavy`), and a slight tilt on cards. Keep tilts at 2° or less, and put any motion behind `prefers-reduced-motion`.

Colors live in CSS variables in `css/style.css`, with a `[data-theme="light"]` block. Never hard-code a color in a rule; add a variable to both themes.

To add an organism: copy `organisms/paramecium.html` for the page shell, write `js/<name>.js` on top of `createStage()`, then turn its home card into a link with the "Play now" badge.

### For the audience (a 10-year-old)

- Short sentences, everyday words. Name the real term once, in brackets: "Mouth (cytostome)".
- Every page needs things to grab: sliders, toggles, buttons, and tap-to-learn parts with a short "what is this?" card.
- Include a "Try this!" list of experiments that ticks itself off (`data-challenge`) and earns stars, plus a "Fast facts" list.
- Cello reacts to what she does: first-time successes, mistakes, and discoveries. Keep the lines short, warm, and never scolding.
- Big type and touch-sized controls (at least 44px). Give every scene Pause and Reset view.
- Keep the science right, even when it's simplified. Check facts against the NCERT Grade 5 to 8 books.
