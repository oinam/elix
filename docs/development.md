# Development

The website lives in `public/`. Either:

- `npm install` once, then `npm run dev` and open <http://localhost:8787> (works like the live site; if another server has 8787, it says which port it took), or
- `python3 -m http.server 8000 -d public` and open <http://localhost:8000> (nothing to install).
## Tests

- `npm test` (or `mise run check`) checks the files, in a few seconds: links, each topic’s challenges and stars pill, the `data-topics` lists, colors in CSS, curly quotes and American spelling, and that every line Cello says has a voice clip.
- `npm run smoke` (or `mise run smoke`) opens every page in headless Chrome on its own local server. It fails on any JS error or failed request, or a page wider than a phone. On topic pages it also presses every button, moves every slider, and taps all over the 3D stage. It takes about four minutes; `npm run smoke -- topics/water` runs just the matching pages, and `--url http://localhost:8787` uses a server that’s already running.
