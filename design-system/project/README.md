This is the presentation template's design system: one site, up to four design concepts on one brand core, and a component set written once. Client facts (name, services, offices, CTA labels, photography) come from the approved `spec/client-spec.md`; until `brand-build` fills them, every value here is a neutral placeholder. The default delivery target is a CMS or page builder (WordPress with Oxygen is the worked example), so every component is plain HTML with `tpl-` classes and every value is a CSS custom property.

## How the system is built

- **Export separately from the website.** Run `npm run build:ds` at the repository root. Generated handoff files live only in ignored `exports/`; Vite owns `dist/` and authored concept/brandkit pages are never regenerated. Shared token/icon preparation writes only ignored `src/generated/`.
- **Use the current output.** `exports/design-system/project/` contains a copy of this project's assets, fonts, metadata and guidelines plus regenerated component bundles, types and blob/CDN-mode previews. `exports/site.css` includes tokens with sibling `fonts/` URLs; `exports/site.js` is the classic, self-initializing `window.SiteDS` bundle compiled from the typed runtime, without bundled GSAP or three.js. Artifact `components/bundle.css` excludes tokens because the artifact handles `tokens.json` itself.
- **Verify locally.** Serve `exports/` as a static HTTP root and open `/harness/` for every component preview in all themes. See `oxygen-handoff.md` for hosting and stylesheet choices.
- **The brand core never changes between concepts**: the type families, `brand-accent`, `ink`, the client's logo and the client's own photography.
- **Concepts are themes.** The color themes `cinematic`, `engineered`, `editorial` and `kinetic` are the four concept archetypes. Set `data-theme` on `<html>` (or on any element, for side-by-side boards) and every component repaints: colors from `tokens.json`, and corners, type treatment, rhythm, image grade and motion from the expression layer in `src/css/concepts.css`.
- **Components are written once.** Variants are modifier classes (`tpl-hero--cinematic`, `tpl-services--plates`), never theme checks. A concept is a choice of variants per section plus its theme; `concepts.md` has the recipe.
- **Semantic tokens only in components.** Paint surfaces with `surface`, `surface-raised`, `surface-sunken`; text with `text`, `text-muted`, `accent-text`. Never reference `neutral-*` or `accent-*` steps from a component; they exist for the semantic layer and for documentation.

## Voice and content

- Plain, direct and specific. Name the service, the place and the outcome. `voice.md` holds the client's owned words and rules once `brand-build` writes them.
- One label per intent, everywhere. The labels live in `ctaIntents` in `design-system.json`, and `npm run check` enforces them. Buttons are verb first, sentence case in copy (a concept may set them uppercase with CSS, never in the text).
- No em dashes or en dashes in site copy; use a period, a comma or a colon. No invented numbers: figures the client has not supplied render as `tpl-pending` ("Client to provide"). No lorem ipsum.

## Color

- `brand-accent` is the only accent. Use it as a fill (`accent`) for the one primary action in view, key figures and the active nav marker. Text on the accent is always `on-accent`; pick ink or white by contrast at kickoff (with the default accent, white measures 2.96:1 and fails WCAG AA).
- Accent text on light surfaces is `accent-text` (a darker ramp step at 4.5:1 or better); on dark surfaces `accent-text` can be `brand-accent` itself when it passes.
- `logo-accent`, `logo-ink` and `logo-detail` live inside the logo art only; never use them as UI colors.
- `highlight` is the Cinematic and Kinetic focus ring and a small highlight on dark grounds. It never carries text on a light surface.
- Status colors always come with an icon and a word: `danger` for errors, `success` (blue, never green) for confirmations, so they are never told apart by hue alone.
- Photography under text sits on `scrim`; `text-on-photo` over it holds 4.5:1 or better even on a white sky.

## Type

- The template ships Montserrat for everything, self-hosted from `fonts/` (variable, roman and italic), and Michroma for labels only in Engineered and Kinetic (`wide-label`). Swap families per the client spec; concepts change weight, case and tracking through the expression layer, never the family.
- Display: `display-xl` for the Home hero, `display-lg` for inner page headers. Headings: `heading-xl` section titles, `heading-lg` sub-sections, `heading-md` card titles, `heading-sm` FAQ questions and job titles. Body: `body-md` default, `body-lg` for leads, `body-sm` for captions and helper text. Labels: `label-md` for buttons, nav and field labels; `label-sm` uppercase for tags.
- Sizes in `tokens.json` are desktop sizes; pages scale them between 375px and 1280px with the `--fs-*` clamps.
- Hero headlines run two lines at most on desktop; hero subtext is 20 words or fewer. Phone numbers and figures use tabular numerals (`tpl-tabular`, `figure-lg`).
- Eyebrows (`tpl-eyebrow`) are rationed: one per three sections at most.

## Spacing and layout

- 4px base: `space-2` icon gaps, `space-5` between form fields, `space-6` card padding on mobile, `space-8` desktop gutter and card padding, `space-10` between a section title and its content.
- Sections breathe by concept: Cinematic up to `space-24`, Engineered up to `space-20`, Editorial and Kinetic up to `space-32`.
- Content sits in `tpl-container` (`container-max` 1320px plus the gutter). Long text caps at `container-text`.
- Breakpoints are min-width: `bp-md` 768px starts multi-column sections, `bp-lg` 1024px swaps the drawer for the one-line desktop nav. Every multi-column layout collapses to one column under 768px. No section layout family repeats on a page, and no more than two image-and-text splits run in a row.

## Shape, borders and elevation

- Each concept locks one corner system: Cinematic `radius-none` everywhere, with an optional notch cut on primary buttons and photo frames; Engineered `radius-xs` everywhere; Editorial `radius-pill` for buttons and tags, `radius-lg` for cards and media, `radius-md` for fields; Kinetic `radius-2xl` glass shells around `radius-xl` cores, `radius-pill` actions and `radius-lg` fields.
- Separate with `border` hairlines; use `border-strong` only where rules organize data. Control borders are `field-border` (3:1 or better everywhere).
- Cinematic and Engineered use no shadows. Editorial uses one soft ink-tinted `shadow-raised`. Kinetic's `shadow-raised` is a deep, diffuse shadow plus a 1px inner highlight. `shadow-overlay` is for the drawer, the island header and the service sheet.

## Imagery

- Use the client's own photography. The template ships six labelled placeholders in `assets/Photography`; each concept grades photos through `--media-filter`.
- Never stock photos, never AI imagery, never text or pills over a photo. Captions go below the image.
- A shot that does not exist yet is a `tpl-slot` ("Photo needed" plus a one-line brief) sized like the photo it replaces. The slots are the client shot list.
- Every meaningful image has alt text that says what the people in it are doing; decorative crops use `alt=""`.

## Logo

- Use the client's files as they are; never redraw, stretch, recolor or re-typeset the mark. The full-color lockup goes on light grounds; the reversed variant goes on dark grounds and photography and stays provisional until the client approves it. The template ships placeholder SVGs in `assets/Logos`.
- Keep the clear space the client's brand guide sets. The header uses the full lockup at 44px tall on mobile and 52px on desktop.

## Iconography

- One family: Tabler outline, 1.5 stroke, `currentColor`, inlined as SVG (`<svg class="tpl-icon" data-tpl-icon="phone"></svg>`; the build or `SiteDS.hydrateIcons()` fills the paths). Icon names are listed in `tools/lib/build-data.mjs`.
- Icons are decorative (`aria-hidden`) unless they stand alone; a standalone icon button carries a visible or visually hidden label. No emoji.

## Motion

- Motion only shows hierarchy, sequence or feedback. Heroes rise in once on load; sections reveal with CSS scroll-driven animation (`data-tpl-reveal`, no JavaScript); the Cinematic values ticker has a Pause button. Kinetic is the motion-led concept: a three.js strand scene behind its hero, GSAP word-mask and scroll choreography, and a view transition that morphs a service tile into its sheet. Every piece is optional: without the libraries the page is complete and static.
- Durations and easing come from each concept (`--motion-duration`). Animate only `transform` and `opacity`. `prefers-reduced-motion` turns all of it off.

## Accessibility

- Every text pair meets 4.5:1 in every theme (3:1 for 24px and larger, control borders and focus rings); `tools/check.mjs` tests the matrix on every build.
- Keyboard focus is a solid 2px `focus-ring` 3px outside the control (`focus-ring-on-accent` on accent fields). A skip link leads every page; the drawer traps focus, closes on Esc and returns focus to its toggle.
- Forms: label above the control, hint below the label, error below the control with an icon and the word "Error", an error summary that takes focus on submit. Never placeholder-only labels.
- Touch targets are 44px or larger.

## Components and pages

- Components live in `src/ds/components/` with a live preview each; behavior ships as `window.SiteDS` and needs no framework. Previews for Hero, ServiceIndex and ValuesBand follow the theme switcher and show the variant each concept uses.
- `concepts.md` holds each archetype's dials, expression tokens and section choices. `page-blueprints.md` holds the section stack, audience, CTAs and client inputs per page. `oxygen-handoff.md` maps tokens, classes, components, forms, the job feed and fonts into a page builder; `prep-handoff` covers React, Vue, Angular and Vanilla TS.
