# Client presentation template

A white-label template for a client brand presentation: a concepts hub, one Home page per design concept, brand-kit boards and a design system, built as a Vite multi-page site with vanilla HTML, CSS and strict TypeScript. A standalone CSS/JS export targets CMS page builders (WordPress with Oxygen is the worked example).

Start a client with three skills, in order:

1. **brand-kickoff** interviews you and writes `spec/client-spec.md`, ending at an approval gate.
2. **brand-build** turns the approved spec into tokens, concepts, boards and previews, ending on `npm run verify`.
3. **prep-handoff** writes developer handoff docs for React, Vue, Angular or Vanilla TS once the client picks a concept.

`TEMPLATE.md` maps each spec section to the files it fills and documents the rename codemod.

## Run it

Use **Node.js 24 (recommended)**. Vite requires Node.js 20.19+ or 22.12+.

```bash
npm ci
npm run dev
```

Vite opens `http://127.0.0.1:5173/concepts/` (hub). Each folder under `concepts/` is a concept Home page (`/concepts/cinematic/`, `/concepts/engineered/`, `/concepts/editorial/`, `/concepts/kinetic/` in the template); boards are at `/brandkit/`. The root `/` redirects to `/concepts/`.

| Command | What |
| --- | --- |
| `npm run dev` | Development server on port 5173, opening `/concepts/` |
| `npm run typecheck` | Prepare token/icon data and check TypeScript without emitting app code |
| `npm run build` | Typecheck and build the production website into `dist/` |
| `npm run preview` | Inspect the existing production build at `http://127.0.0.1:4173/concepts/` |
| `npm test` | Run automated tests |
| `npm run check` | Check contrast, tokens and copy rules |
| `npm run test:build` | Check the built production website |
| `npm run verify` | Full gate: `npm test && npm run build && npm run check && npm run test:build` |
| `npm run build:ds` | Generate the separate design-system handoff and QA harness under `exports/` |
| `node tools/white-label.mjs` | Rename the class prefix, namespace and concept slugs (dry run unless `--apply`) |

Edit `concepts/**/*.html` and `brandkit/index.html` directly; these and the root redirect `index.html` are Vite inputs. Neither build regenerates them. `src/partials/` is **only design-system preview source**, not an include system: a shared markup change goes by hand into every page that uses it and into the matching partial.

`src/generated/` holds ignored token CSS and icon data; edit `design-system/project/tokens.json` or the icon list, not generated files. `dist/` and `exports/` are build output and never committed.

## Layout

| Path | What |
| --- | --- |
| `spec/client-spec.md` | The approved client spec (written by brand-kickoff) |
| `design-system/project/tokens.json` | **Source of truth** for tokens: brand primitives, concept themes, type, spacing, radius, shadows, layout, breakpoints, z-index |
| `design-system/project/design-system.json` | DS metadata: title, `prefix`, `namespace`, asset groups and `ctaIntents` (the one label per intent) |
| `src/css/base.css` | Reset, fluid type scale, layout primitives |
| `src/css/concepts.css` | Concept expression layer (corners, type treatment, rhythm, image grade, motion) keyed on `data-theme` |
| `src/css/components.css` | All `tpl-` components, written once against semantic tokens |
| `src/behaviors/site.ts` | Typed `window.SiteDS` behaviors: icons, sticky header, drawer, marquee, forms, job feed, optional GSAP/three.js motion |
| `src/behaviors/enhancements.ts` | On-demand loading of GSAP and three.js where their hooks appear |
| `src/partials/` | Header, footer, section, form and brand-board partials for DS previews only |
| `src/ds/components/<Comp>/preview.html` | Design-system previews (`@dsCard` marker on line 1) |
| `src/types/index.d.ts` | `<Comp>Props` interfaces: the markup contract per component |
| `src/img/`, `src/fonts/`, `src/data/` | Placeholder logo and photos, self-hosted fonts, sample job feed |
| `tools/build.mjs` | Builds the standalone design-system export in `exports/` |
| `tools/check.mjs` | Contrast matrix per concept, token notes, dash, eyebrow and CTA-label rules |
| `tools/white-label.mjs` | Prefix, namespace and concept-slug codemod |

## Deploy to Netlify

`netlify.toml` runs `npm run verify` on Node 24 and publishes `dist/`. Leave `NODE_ENV` unset and keep dev dependencies: the build needs Tabler icons, GSAP and three.js from `devDependencies`. After a deploy, check `/`, `/concepts/`, every concept Home page and `/brandkit/`.

## Design-system export

Run `npm run build:ds`, then serve `exports/` as a static root and open `/harness/` for every preview in every theme. For a page builder, use `exports/site.css`, `exports/site.js`, `exports/tokens.css`, `exports/fonts/` and `exports/vendor/` with their sibling paths intact; `design-system/project/oxygen-handoff.md` walks through it. `exports/design-system/project/` can be uploaded as a Design System artifact; image uploads map to blob ids in `design-system/asset-map.json`.
