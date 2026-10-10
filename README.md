# ELIX

> Explain Like I’m X

My daughter is 10-years old and is in Grade-5 at a school whose curriculum is CBSE with NCERT Books.

This website is to "Explain Like I’m 10-years" for her on topics taught at her school books.

## Run it

It's a plain static site with no build step. Browsers won't load JavaScript modules from a double-clicked file, so serve the folder:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. An internet connection is needed the first time, because Three.js loads from the jsDelivr CDN.

## What's inside

| Topic | Status |
| --- | --- |
| Paramecium | Interactive 3D: swim, feed, water pumps, tap-to-learn parts |
| Amoeba, Bacteria, Yeast | Coming next |
| Single-cell and multi-cell organisms | Coming next |

### References

- CBSE https://en.wikipedia.org/wiki/Central_Board_of_Secondary_Education
- NCERT https://en.wikipedia.org/wiki/National_Council_of_Educational_Research_and_Training
- Three.js https://threejs.org
