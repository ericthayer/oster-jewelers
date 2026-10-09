# Oxygen handoff

How this system moves into WordPress with the Oxygen builder. Everything here is written for Oxygen 6 (Variables, class-first styling, Components); notes for Oxygen Classic 4.x are at the end. Only the chosen concept ships: its theme values become the production variables.

## Generate the handoff

Run `npm run build:ds` from the repository root. It prepares shared token/icon data, then writes the standalone handoff only under ignored `exports/`. The normal Vite build writes the website to `dist/` separately; neither build regenerates authored concept or brandkit pages.

- **Oxygen static assets:** `exports/tokens.css`, `exports/site.css`, `exports/site.js`, `exports/fonts/` and `exports/vendor/`. `site.css` already includes token CSS and font declarations with sibling `fonts/` URLs; do not also load `tokens.css` when using it. Keep those relative paths when hosting the files.
- **Importable design-system artifact:** `exports/design-system/project/` copies this project's assets, fonts, metadata and guidelines, then replaces its component bundles, type declarations and 38 previews with generated versions. Its `components/bundle.css` intentionally excludes tokens because the artifact supplies them from `tokens.json`. Its previews retain blob image URLs and pinned CDN vendor URLs for the artifact host; they are not standalone browser pages.
- **Local QA:** serve `exports/` as a static HTTP root and open `/harness/`. Its 38 component pages use local `../site.css`, `../site.js`, `../vendor/`, copied `../src/img/` images and `../src/data/` sample data. No `dist/` directory is needed inside the export.

The tracked root `harness/` and tracked `design-system/project/components/` generated files are legacy snapshots, not current build output. Use `exports/harness/` for verification and the exported artifact for handoff. Do not edit generated files; change the token JSON, source CSS, `src/behaviors/site.ts`, or `src/ds/components/` preview templates and rebuild.

## 1. Fonts

- Self-host the brand families from the client spec (the template ships Montserrat, plus Michroma for Engineered and Kinetic labels). The files in `fonts/` are the Latin subset; add the Latin Extended files with a `unicode-range` if names with accents appear.
- Do not load Google Fonts from the page. Declare the faces in a global stylesheet with `font-display: swap` and preload the roman Montserrat file on every page.

## 2. Variables

Create one Oxygen Variables collection per token family and keep the token names, so the component CSS works unchanged:

| Collection | Type | Tokens |
|---|---|---|
| Brand colors | Color | `brand-accent`, `ink`, `highlight`, the `accent-*` and `neutral-*` steps |
| Semantic colors | Color | `surface*`, `text*`, `accent*`, `on-accent`, `border*`, `field-border`, `focus-ring*`, `danger`, `success` with the chosen concept's values |
| Spacing | Unit | `space-1` to `space-32` |
| Radius | Unit | `radius-none`, `radius-xs`, `radius-md`, `radius-lg`, `radius-pill` |
| Layout | Unit | `container-max`, `container-text`, `gutter`, `gutter-mobile`, `header-height`, `header-height-mobile` |
| Fonts | Font Family | `font-sans`, `font-wide` |

`scrim`, `scrim-soft`, the shadows and the fluid `--fs-*` clamps are not single values Oxygen variables accept everywhere; keep them in the global stylesheet. Confirm in the build that variables are emitted as `--<name>` custom properties; if Oxygen prefixes them, add a small alias block (`--surface: var(--oxy-surface);`).

## 3. Global stylesheet

Paste `components/bundle.css` from the exported artifact into one global stylesheet, in order: base, the chosen concept's expression block (drop the other three), components. Supply variables through Oxygen as described above, or prepend the generated `exports/tokens.css` with font URLs adapted to their WordPress location. Alternatively, enqueue `exports/site.css` with its sibling `fonts/` directory for a complete static stylesheet. The component CSS is flat with `tpl-` prefixed classes, no nesting and no `@layer`, so Oxygen's own un-layered CSS cannot silently out-rank it. Remove the unused concept's selectors to keep the file small.

## 4. Classes

Oxygen 6 is class-first: register the `tpl-` classes as global classes and apply them to elements instead of styling elements directly. Modifiers stay modifiers: an element gets `tpl-btn tpl-btn--primary`, never a one-off style. Avoid Oxygen's per-element style panels for anything the system already covers.

## 5. Components

Build one Oxygen Component per system component, with properties for the content slots listed in each component's guideline (the `<Comp>Props` interfaces in `components/index.d.ts` list them):

- SiteHeader and SiteFooter as header and footer templates.
- Hero with a "variant" property (cinematic, split, editorial) mapped to the modifier class; only the chosen concept's variant needs building.
- ServiceIndex bound to a Services custom post type (name, icon, description, scope list, photo, anchor) so the Home list and the Services page share one source.
- FAQ bound to a repeater or an FAQ post type; output native `<details>` elements.
- SpecPlate, SafetyRecord, Timeline and LeaderCard bound to ACF or Meta Box fields, so pending values become real ones without touching layout.

## 6. Behavior

Enqueue the exported artifact's `components/bundle.js` (or the identical `exports/site.js`) once, in the footer. It is a classic IIFE compiled from `src/behaviors/site.ts`, dependency-free and self-initializing (`window.SiteDS`), with the `@ds-bundle` namespace marker preserved. Optional motion libraries are type-only imports and are not bundled. Every behavior hooks onto `data-tpl-*` attributes: `data-tpl-header` (stuck state), `data-tpl-nav-toggle` and `data-tpl-drawer` (mobile drawer), `data-tpl-marquee`, `data-tpl-form`, `data-tpl-jobs`. Scroll reveals are CSS only (`data-tpl-reveal`). Nothing listens to scroll events.

**Kinetic only.** Enqueue GSAP core and ScrollTrigger from `exports/vendor/` (self-hosted, 3.13 or later, free for commercial use) before the bundle on every page, and import three.js from `exports/vendor/three.module.js` with its sibling `three.core.js` on the Home template only, followed by `SiteDS.scene.mountAll(THREE)`. The artifact previews instead use the pinned CDN's `three.module.min.js` and sibling `three.core.min.js`. Add `@view-transition { navigation: auto; }` to the global stylesheet so the island header holds its place between pages. The ServiceSheet is a native `<dialog>` in a code block after the ServiceIndex. Test the Home page on a mid-range phone before launch: the scene is the heaviest thing on the site.

## 7. Forms

The three forms (quote, subcontractor inquiry, contact topics) are specified in QuoteForm and SubcontractorForm. Build them in the chosen form plugin (Gravity Forms, Fluent Forms or WPForms) and map its markup to the system classes: field wrapper `tpl-field`, label `tpl-field__label`, hint `tpl-field__hint`, control `tpl-input` / `tpl-select` / `tpl-textarea`, error `tpl-field__error`, the summary `tpl-notice tpl-notice--danger`. Keep labels above fields, errors below, and route each topic to its inbox. Remove `data-tpl-demo` so submissions actually send.

## 8. Careers and the job feed

- **Plugin outputs markup**: style its list with the JobList classes (`tpl-jobs__list`, `tpl-job`, `tpl-job__title`, `tpl-job__meta`), or have the theme render the feed itself: a Paylocity Recruiting feed (the default `JobPosting` shape) returns Title, JobLocation, HiringDepartment, PublishedDate, ApplyUrl and Description per posting, which `SiteDS.jobs.render()` already maps.
- **Plugin only offers an iframe**: wrap it in `tpl-embed`, keep the error Notice with a direct link to the careers site, and set a sensible `min-height`.
- Either way keep the empty and error states from JobList, and redirect any old careers link.

## 9. Images

Upload the shoot photography at 2000px or wider and let WordPress generate responsive sizes (WebP where the host supports it). Set focal points to match each concept's crops (`--focus` values in the Home pages). The hero image is the LCP element: exclude it from lazy loading and give it `fetchpriority="high"`.

## Oxygen Classic (4.x) notes

Classic has no Variables panel: paste the chosen concept's `:root` custom properties (from `tokens.css` generated by this system) at the top of the global stylesheet, map the brand and semantic colors into Global Colors for editor convenience, and use Selectors for the `tpl-` classes. Reusable Parts replace Components.
