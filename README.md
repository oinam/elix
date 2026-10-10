# ELIx

> Explain Like I’m X

My daughter is 10-years old and is in Grade-5 at a school whose curriculum is CBSE with NCERT Books. This website is to "Explain Like I’m 10-years" for her on topics taught at her school books.

Live at <https://elix.oinam.com>.

### Topics

Organizations in Systems:

- Organisms: Paramecium, Amoeba, Bacteria, and Yeast, each in 3D to poke, feed, and tinker with
- Single-cell organisms: one cell does every job
- Multi-cell organisms: cell → tissue → organ → organ system → organism

### Run it locally

The website lives in `public/`. Either:

- `npm install` once, then `npm run dev` and open <http://localhost:8787> (works like the live site), or
- `python3 -m http.server 8000 -d public` and open <http://localhost:8000> (nothing to install).

### Deploy

Every push to `main` on GitHub deploys to Cloudflare by itself. To deploy by hand: `npm run deploy`.

### References

- CBSE https://en.wikipedia.org/wiki/Central_Board_of_Secondary_Education
- NCERT https://en.wikipedia.org/wiki/National_Council_of_Educational_Research_and_Training