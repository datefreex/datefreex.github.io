# datefreex — personal page

A hand-built personal site for `datefreex.github.io`. Pure HTML, CSS and Three.js — no
build step, no framework, no runtime cost.

## Stack
- **HTML5** semantic structure, single `index.html`
- **CSS3** hand-rolled design tokens, light/dark themes, scroll reveals, responsive layout
- **Three.js (ESM)** shader-driven particle scene with deterministic mouse parallax
- **Vanilla JS** GitHub REST integration, command rail, theme toggle

## File map
```
.
├── index.html         # markup
├── styles.css         # design system + layout
├── scripts/
│   ├── three-stage.js # background scene (Three.js + Canvas2D fallback)
│   ├── github.js      # live profile + repos from api.github.com
│   └── main.js        # reveals, ticker, scrollspy, theme, ⌘K
└── assets/
    └── favicon.svg
```

## Local development
The page is fully static — open `index.html` directly or run any static server, e.g.:

```bash
python -m http.server 8000
# or
npx --yes serve .
```

Then visit http://localhost:8000.

## Deploy
The repo is `datefreex/datefreex.github.io`. Commit to `main` and GitHub Pages will
publish the site automatically.

## Customize
- **Identity**: edit the hero copy, contact cards and the avatar image inside `index.html`.
- **Palette**: tweak the CSS custom properties at the top of `styles.css` (`--accent`, `--accent-2`, …).
- **Stack data**: add or remove chips in the `.chip-list` block.
- **GitHub data**: `scripts/github.js` already fetches your public repos live. To pin a
  curated list instead, replace `renderRepos()` with a hand-authored array.

## Keyboard
- `⌘/Ctrl + K` — jump to next section
- `Tab` — full keyboard navigation across the page

## Accessibility
- Honors `prefers-reduced-motion`
- Honors `prefers-color-scheme`
- All interactive elements have visible focus rings
- The 3D scene renders only `transform`/`opacity` and degrades to a Canvas2D mesh
  when WebGL is unavailable