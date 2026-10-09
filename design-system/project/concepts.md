# Concepts

Four concept archetypes share one brand core and one component set. A concept is a color theme in `tokens.json`, one block of expression tokens in `src/css/concepts.css`, and a choice of section variants per page. The template ships all four under their archetype slugs; `brand-build` renames the ones the client spec keeps (`node tools/white-label.mjs --concept cinematic=<slug>`) and deletes the rest. Columns below are keyed by archetype.

| | Cinematic | Engineered | Editorial | Kinetic |
|---|---|---|---|---|
| Default role | Primary | Primary | Backup | Backup, motion-led |
| Read | Dark, cinematic, documentary | Light, engineered, precise | Light, people-first, editorial | Dark glass, light in motion; reads like an application |
| Serves best | Field teams and trade buyers; evolving a dark live site | Procurement, buyers, regulated work | Recruiting and culture; About and Careers | A modern, product-like first impression |
| Dials (variance / motion / density) | 7 / 5 / 4 | 5 / 3 / 5 | 6 / 4 / 3 | 8 / 9 / 3 |
| Surface | `neutral-950` page, `ink` raised | `neutral-50` page, `neutral-0` raised | `neutral-25` page, `neutral-0` raised | `neutral-1000` page under an accent glow veil and film grain; glass panels |
| Accent | The light in the frame: primary action, key figures, active marker | Redline markup: rules, key figures, `accent-700` text | One full accent field per page (the values band), pills | Light: the pulses in the scene, glows, the pill action, outline numerals |
| Display type | Montserrat 800, uppercase, -0.01em | Montserrat 650, sentence case, -0.03em | Montserrat 700 with 300 for contrast, -0.035em | Montserrat 500, sentence case, -0.04em; 300 for the accent words |
| Labels | Montserrat 700 uppercase, 0.08em | Michroma uppercase, 0.06em | Montserrat 600, sentence case | Michroma uppercase, 0.14em; eyebrows as hairline pills |
| Corners | `radius-none` + notch (14px) on primary buttons and photo frames | `radius-xs` everywhere | `radius-pill` actions and tags, `radius-lg` cards and media, `radius-md` fields | `radius-2xl` shells around `radius-xl` cores, `radius-pill` actions, `radius-lg` fields |
| Elevation | Borders, no shadows | Borders (`border-strong`), no shadows | One soft `shadow-raised` | Nested glass: a shell, an inset core with a 1px highlight, a deep diffuse shadow, a pointer glow |
| Section rhythm | up to `space-24` | up to `space-20` | up to `space-32` | up to `space-32` |
| Image grade | Dark, contrasty, practical light | Cool, slightly desaturated, daylight | Warm, close, people and hands | Cool, desaturated, contrasty; night work |
| Motion | 560ms, expo-out; values ticker (pausable) | 280ms, standard; almost still | 440ms, soft-out | 700ms on `cubic-bezier(0.32, 0.72, 0, 1)`: WebGL strand scene, word masks, magnetic pills, tile-to-sheet view transition, card stack, pinned values rail, blur reveals |
| Header | Bar, overlay on the hero | Bar | Bar | Island: a floating glass pill; the menu is a full-screen veil |
| Focus ring | `highlight` | `ink` | `ink` | `highlight` |
| Logo | Reversed (provisional) | Full color | Full color | Reversed (provisional) |

## Section choices on Home

| Section | Cinematic | Engineered | Editorial | Kinetic |
|---|---|---|---|---|
| Hero | `tpl-hero--cinematic`, full-bleed hero photo, overlay header | `tpl-hero--split`, scale photo over a SpecPlate title block | `tpl-hero--editorial`, a people-first headline over two photos | `tpl-hero--scene`, a headline over the StrandScene, island header |
| Services | `tpl-services--index`, a typographic list | `tpl-services--plates`, 2 + 3 spec plates with scope lists | `tpl-services--cards`, 2 photo cards + 3 tinted tiles | `tpl-services--bento`, one photo tile + four glass tiles; each opens its ServiceSheet |
| Proof | FeatureSplit with a scale photo + four reasons | Reasons grid on a sunken band | FeatureSplit on culture | CardStack: the four reasons as sticky cards that pile up |
| Safety | FeatureSplit with checks and a link | SafetyRecord plate (pending metrics) | (Careers-first; safety lives on its page) | SafetyRecord as glass cells beside the checks |
| Values | `tpl-values--marquee` with the mantra as the section title | `tpl-values--grid` six-cell plate | `tpl-values--field`, the one accent field | `tpl-values--rail`, six glass cells on a pinned horizontal rail |
| Then | AudiencePaths, Testimonial, FAQ, CTABand, SiteFooter | same | same | same, in glass shells |

## Motion stack (Kinetic)

- **Libraries**: GSAP 3 core and ScrollTrigger (free for commercial use since 3.13), loaded before the bundle; three.js as an ES module on the Home page only. All three ship pinned and self-hosted in the build (`dist/vendor/`); the design system loads GSAP as runtime libraries and three.js from cdnjs.
- **Hooks** are attributes read by `components/bundle.js`: `data-tpl-scene` (SiteDS.scene), `data-tpl-words`, `data-tpl-magnetic`, `data-tpl-stack`, `data-tpl-rail` (SiteDS.motion), `data-tpl-glow` (SiteDS.glow) and `data-tpl-sheet-host` (SiteDS.sheet, native `<dialog>` plus `document.startViewTransition`, no library).
- **Fallbacks**: without JavaScript, GSAP, WebGL or view transitions every section is complete: the hero shows its CSS glow, the stack still stacks (sticky), the rail scrolls natively with scroll-snap, the sheet opens without the morph or the tile links to the Services page.
- **Reduced motion** turns off the scene loop (one still frame), the choreography, the reveals and the morph.
- **Budget**: 16 strands and 48 pulses (10 and 30 under 768px), pixel ratio capped at 2, the render loop paused off screen and in hidden tabs; only `transform`, `opacity` and the reveal blur animate; `backdrop-filter` only on fixed layers (the island, the veil, the sheet backdrop); no scroll listeners.

## Expression tokens

Set per concept on `[data-theme="<id>"]` in `components/bundle.css` (section "concepts.css"):

`--display-weight`, `--display-transform`, `--display-tracking`, `--display-leading`, `--display-cap` (caps display is capped to the viewport so the longest word fits at 375px), `--heading-weight`, `--heading-tracking`, `--h2-weight`, `--h2-transform`, `--label-family`, `--label-weight`, `--label-transform`, `--label-tracking`, `--nav-*`, `--eyebrow-color`, `--eyebrow-size`, `--radius-control`, `--radius-field`, `--radius-card`, `--radius-media`, `--radius-tag`, `--notch`, `--rule`, `--rule-strong`, `--card-bg`, `--card-border`, `--card-shadow`, `--section-space`, `--btn-height`, `--btn-pad`, `--btn-weight`, `--btn-transform`, `--btn-tracking`, `--btn-size`, `--media-filter`, `--media-filter-hover`, `--motion-duration`, `--motion-ease`, `--reveal-distance`, `--logo-on-light`, `--logo-on-dark`, `--quote-mark-color`, and `color-scheme`.

Optional, with safe defaults (Kinetic sets them): `--glass-line`, `--glass-line-strong`, `--glass-fill`, `--glass-core`, `--shell`, `--shell-inset`, `--shell-core`, `--shell-highlight`, `--shell-glow`, `--plate-gap`, `--plate-bg`, `--plate-border`, `--plate-cell-bg`, `--plate-cell-radius`, `--cta-bg`, `--eyebrow-display`, `--eyebrow-width`, `--eyebrow-pad`, `--eyebrow-border`, `--eyebrow-radius`, `--icon-stroke`, `--reveal-anim`, `--body-bg`, `--page-veil`, `--page-veil-bg`, `--page-grain`, `--quote-weight`, `--quote-mark-weight`, `--feature-pad` and `--feature-media-radius`.

## Adding a concept

1. Add a theme to `color.themes` in `tokens.json` and give every semantic color token (and `shadow-*`) a value for it. Run the contrast check: every pair in `tools/check.mjs` must pass.
2. Copy one `[data-theme]` block in `src/css/concepts.css`, rename it, and change only the expression tokens above.
3. Pick a variant for each section (Hero, ServiceIndex, ValuesBand, and which splits to use), keeping the page rules: one theme per page, no layout family twice, at most two image-and-text splits in a row, eyebrows at one per three sections.
4. Build a Home page from the existing partials and a brand board from `src/partials/brandkit/`. No new component should be needed; if one is, add it to the system first.
