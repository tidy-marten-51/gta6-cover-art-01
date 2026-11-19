[![GTA 6 Cover Art on make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/tidy-marten-51/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/tidy-marten-51/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

# Vice Lights — GTA-style Cover Maker

Turn your own photos and a caption into a GTA 6-style multi-panel poster, right in your browser. No upload, no watermark, no account — the app is plain static files that run offline.

## How it works

1. **Add your photos** — pick files from your machine (read locally with FileReader, never uploaded), or try the two bundled sample photos.
2. **Pick a panel** on the live preview and crop the photo inside it with zoom and pan. One photo can fill every panel, or each panel can hold a different one.
3. **Choose a layout** — Hero + three vignettes, a 2 × 2 grid, or full bleed with an inset panel.
4. **Choose a grade** — Sunset, Neon, or Gold hour: gradient-map colour passes in the Vice City dusk palette.
5. **Write your caption** — bold poster lettering with a sunset fill, fitted to the poster band.
6. **Export a PNG** in 1080 × 1080, 1080 × 1350, or 1920 × 1080.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `app/index.html` — the editor page
- `app/style.css` — the editor's dark neon styling
- `app/src/cover.js` — the cover engine: panel layouts, colour grades, caption lettering, PNG export
- `app/src/main.js` — the editor wiring: photo loading, panel selection, crop controls
- `app/src/shots.js` — screenshot mode (`?shot=cover` / `?shot=editor`) used to take the screenshots in `screenshots/`
- `app/samples/` — two sample photos made with an image model for make.fun, free to use
- `main.ts` — hands the app and screenshots to make.fun's grader
- `shots.json` — the four screenshot definitions

## Originality

Vice Lights is an original design. It uses no Rockstar Games logo, wordmark, artwork, character, or font. Lettering is drawn with heavy system sans-serif faces; the sample photos were made with an image model for make.fun and are free to use.

## License

MIT — see [LICENSE](LICENSE).
