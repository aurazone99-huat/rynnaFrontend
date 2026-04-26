# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Visual Portfolio Showcase" — a single-page React portfolio for "Rynna". 

## Commands

No lint, test, or typecheck scripts are defined. Only:

- `npm install` — install deps
- `npm run dev` — Vite dev server on `0.0.0.0:3000`
- `npm run build` — production build
- `npm run preview` — serve the build

To typecheck manually: `npx tsc --noEmit` (project sets `"noEmit": true`).

## Architecture

### Unusual layout

Source files live at the **repo root**, not in `src/`. `App.tsx`, `index.tsx`, `index.css`, `types.ts`, and the `components/` folder are all top-level. `src/` only holds `custom.d.ts` (image module declarations). Keep new top-level app files at the root to match convention; do not migrate to `src/` without a reason.

Path alias: `@/*` resolves to the project root (defined in both `tsconfig.json` and `vite.config.ts`).

### React loading (important)

React 19 is loaded **two ways simultaneously**:

1. Via npm/Vite bundling (`package.json` deps).
2. Via an ESM import map in `index.html` pointing to `esm.sh`.

The import map is a leftover from the AI Studio scaffold. Vite's bundler wins for the built app, but be aware when debugging module resolution or adding React-ecosystem libraries.

### Styling

- **Tailwind** is loaded via CDN (`<script src="https://cdn.tailwindcss.com">` in `index.html`). There is **no `tailwind.config.js`** and no PostCSS pipeline — you cannot extend the theme through config. Use arbitrary-value classes (`bg-[#...]`) or add CSS to `index.css`.
- Custom "claymorphism" utility classes live in `index.css`: `clay-puffy`, `clay-puffy-sm`, `clay-inset`, `clay-button`, and color helpers `bg-clay-pink`, `bg-clay-lavender`, `bg-clay-mint`, `bg-clay-blue`, `text-clay-dark`. Reuse these instead of re-deriving the shadow stacks.
- Font is Inter via Google Fonts (loaded in `index.html`).
- Global `user-select: none` and `cursor: default` are set in `index.css` — intentional for the portfolio feel.

### Section composition

`App.tsx` is the layout and owns the gallery-section dust-particle canvas animation. Each section has its own component in `components/`:

### Shared types

`types.ts` exports `GenreType`, `GalleryItem`, `SocialLink`. Only `GenreType` and `GalleryItem` are wired up.
