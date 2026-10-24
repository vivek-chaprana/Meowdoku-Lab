# Meowdoku Solver

**Turn a screenshot into a puzzle. Find a home for every cat.**

A free, browser-based Meowdoku solver with screenshot import, a colorful board
editor, and side-by-side algorithm comparisons. Image processing and solving run
on your device, with no account, API key, or backend required.

## Features

- **Screenshot to board** — import PNG, JPEG, or WebP images and review the extracted colors before solving.
- **Interactive editor** — create 4×4 to 12×12 boards with 12 colors, drag to paint, erase, undo, or load an example.
- **Explore solutions** — find unique, multiple, or impossible puzzle configurations.
- **Compare approaches** — run backtracking and deduction-based solving on the same board, with search statistics and individual solution selectors.
- **Installable and offline-ready** — use the PWA after its first online load.
- **Responsive interface** — build and solve on desktop or mobile, with keyboard painting and numbered colors.
- **Private by design** — screenshots stay in the browser; computation runs in Web Workers.

## How to use

1. Open the home page and choose **Create a board** or **Upload a screenshot**.
2. Paint or review every cell. An N×N puzzle must contain exactly N colors.
3. Select **Find the cats** to solve. If multiple solutions exist, choose one to explore.
4. Visit **Compare solvers** to try both methods. This page also accepts a JSON matrix of integer color IDs.

### Puzzle rules

Place exactly one cat in each row, column, and color region. Each cell holds at
most one cat, and cats cannot touch horizontally, vertically, or diagonally.
The touching rule does **not** require exactly one cat in every 3×3 area.

### Screenshot tips

Use a straight screenshot showing all four board edges and visible gaps between
cells. Uploads can be up to 20 MB; images are resized to a maximum 1400-pixel edge
for analysis. The importer detects a regular square grid and groups its colors.

Review the result before solving. Photographs, rotated boards, covered cells,
very pale regions, or different themes may need manual correction. Existing cat
and X marks are not imported as fixed placements. Failed extraction keeps the
current board; **Undo** restores the previous board and palette after an import.

## Run locally

**Requirements:** Node.js 22.12+ (Node.js 24 recommended) and npm or Yarn.

```sh
git clone https://github.com/vivek-chaprana/Meowdoku-Lab.git
cd Meowdoku-Lab
npm install
npm run dev
```

Open the local URL printed by Vite.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check, build the app, generate SEO pages and the offline cache |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the existing solver tests |

The repository includes a Yarn lockfile; use `yarn install --frozen-lockfile` for
installs based on that lockfile. Avoid committing a second package-manager lockfile.

## Deploy to Vercel

1. Push the project to a GitHub repository and import it into Vercel.
2. Choose the **Vite** framework preset and Node.js **24.x**.
3. Use `npm run build` as the build command and `dist` as the output directory.
4. Set **SITE_URL** to your final public origin, such as `https://your-domain.com`, in the build environment variables.
5. Deploy. If you change the domain, update `SITE_URL` and redeploy.

`vercel.json` includes the comparison-page rewrite and service-worker cache
headers. Host this app at the domain root. Unknown routes are not rewritten to
the homepage, so Vercel can return genuine 404 responses.

If `SITE_URL` is omitted, the build uses `VERCEL_PROJECT_PRODUCTION_URL` when
available. Local builds without either value omit canonical URLs and the sitemap
instead of publishing placeholder URLs. For a local SEO build, export `SITE_URL`
in your shell before running the build; the standalone build script reads process
environment variables, not `.env` files.

### Search and sharing

The production build generates:

- Distinct HTML titles, descriptions, and readable introductory content for both pages.
- Canonical links and a two-page XML sitemap when the public origin is configured.
- Open Graph and Twitter card metadata using the app icon as the sharing image.
- WebApplication structured data and `robots.txt`.
- `noindex` metadata and a disallow rule for Vercel preview builds.

After production deployment, check `/robots.txt` and `/sitemap.xml`, then submit
the sitemap in Google Search Console. These features support discovery; indexing
and search rankings depend on the search engine.

## Install and use offline

Build and preview the production app, or open the deployed site:

```sh
npm run build
npm run preview
```

Open it online once and allow offline preparation to complete. Use **Install app**
in the navbar to open the supported browser prompt or installation instructions.
The help dialog reports offline readiness. Installation support varies by browser.

Both pages, the editor, screenshot importer, and solvers are cached locally.
Draft boards and uploaded images are **not saved across reloads**. Clearing site
data or browser storage eviction requires another online visit. App updates
activate after older app tabs close. Service workers require HTTPS or localhost
and are disabled in development mode.

## How it works

Built with **TypeScript, Vite, Canvas, and Web Workers**, without a UI framework or
runtime service dependencies.

The solver uses a fewest-candidates-first search. The deduction-enabled version
also places forced cats and excludes cells that conflict with every remaining
option in a required row, column, or color group. Both methods enumerate all
solutions and compare their solution sets. The implementation uses arrays and
conflict sets; it does not implement Algorithm X or Dancing Links.

Solving runs in cancellable workers. A run stops after 15 seconds and is reported
as incomplete, not as proof that no solution exists. Timings represent individual
runs and include setup; they are not stable benchmark averages.

```text
src/
  board-workspace.ts    Shared editor, upload flow, and solve controls
  board-extraction.ts   Grid detection and color clustering
  puzzle-solver.ts      Search, deductions, and board validation
  comparison-results.ts  Side-by-side solution and metric rendering
  *.worker.ts           Background extraction and solving
  navigation.ts         Shared navbar and install dialog
  pwa.ts                Installation and service-worker registration
scripts/
  build-seo.mjs         Static page metadata, robots.txt, and sitemap
  build-sw.mjs          Versioned offline asset cache
public/                 App icons and web manifest
tests/                 Solver tests
```

## Contributing

Bug reports, clear reproduction steps, and focused pull requests are welcome.
Before a larger change, open an issue to discuss the approach.

1. Fork and clone the repository, then install dependencies.
2. Make a focused change and update documentation where behavior changes.
3. Run `npm run build`; run `npm test` for solver changes.
4. Check affected flows on desktop and mobile before opening a pull request.

For extraction bugs, include a screenshot you have permission to share, the
expected grid size, and the incorrect cells. For solver bugs, include the color
matrix, expected behavior, and actual result. Remove personal information from
screenshots and logs.

## Project status and license

This is an independent Meowdoku puzzle tool, not an official game client.

Licensed under the [MIT License](LICENSE). Copyright © 2026 Vivek Chaprana.
