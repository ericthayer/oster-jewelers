# Template map

How `spec/client-spec.md` becomes a client presentation. `brand-build` treats this file as the authority on where each value goes. Everything not listed here (component CSS, behaviors, checks, tests, build scripts) stays as the template ships it unless the spec needs a new component.

## 1. Rename first

```bash
node tools/white-label.mjs --prefix ac --namespace AcmeDS \
  --concept cinematic=harbor-line --concept engineered=survey
node tools/white-label.mjs ...same flags... --apply
npm run verify
```

- `--prefix`: 2 to 6 lowercase letters or digits. Renames `tpl-` classes, `data-tpl-*` hooks and `dataset.tpl*` keys, and sets `prefix` in `design-system.json`.
- `--namespace`: PascalCase ending in `DS`. Renames `window.SiteDS` and `SiteDSApi`, and sets `namespace` in `design-system.json` (the export banner reads it).
- `--concept <current>=<new>`: renames a theme id in `tokens.json`, `data-theme` and `data-for-theme` values, `[data-theme]` selectors, `concepts/<slug>/`, `board-<slug>.html`, `<Pascal>Board` previews and the `Theme` union. Section variant classes (`tpl-hero--cinematic`) are not touched.
- Current values are read from `design-system.json` and `tokens.json`, so the codemod can run again later. It skips `node_modules/`, `dist/`, `exports/` and `src/generated/`.

Delete the concept folders, theme entries, `[data-theme]` blocks, boards and board previews for archetypes the spec does not use, then rerun `npm run verify`.

## 2. Spec section to files

| Spec section | Files |
|---|---|
| Client | `package.json` (name, description); `design-system.json` (title); `tokens.json` (name, meta); page `<title>` and meta description in `concepts/**`, `brandkit/index.html`, `index.html`; header and footer markup in every page and in `src/partials/header.html`, `footer.html`; `src/types/index.d.ts` (`SiteFooterProps` regions, social networks) |
| Audiences | `ctaIntents` in `design-system.json`; CTA labels and destinations in every page and partial; `voice.md` action table; AudiencePaths copy |
| Services | ServiceIndex markup in every concept page and `src/partials/sections/services.html`, `service-sheet.html`; anchors `#service-one` to `#service-five` (rename to the spec's slugs); form service options in `src/partials/forms/`; `Service` in `src/types/index.d.ts` |
| Voice | `design-system/project/voice.md`; hero, section and values copy; the mantra and the six values in every ValuesBand variant |
| Brand | `tokens.json` (`brand-accent`, `logo-accent`, `highlight`, `logo-detail`, `ink`, `logo-ink`, the `accent-*` and `neutral-*` ramps, every semantic token per theme, `type.fonts`, `type.families`); `src/fonts/`; `src/img/logo/logo.svg`, `logo-reversed.svg`; `src/img/photos/` |
| Pages | `design-system/project/page-blueprints.md` (pages, redirects, open items) |
| Concepts | Theme ids and names in `tokens.json`; `src/css/concepts.css` expression blocks; `concepts/<slug>/index.html`; hub cards in `concepts/index.html`; `brandkit/index.html` boards and `src/partials/brandkit/`; `design-system/project/concepts.md` columns |
| Proof | SafetyRecord, SpecPlate, Testimonial and FAQ copy; unconfirmed values stay `tpl-pending` "Client to provide" |
| Delivery | Read by `prep-handoff`; `oxygen-handoff.md` only if the target is a page builder |
| Owed by client | `page-blueprints.md` open items; every `tpl-pending` and `tpl-slot` on the pages |

## 3. Concept archetypes

Each archetype is a proven set of variants. `concepts.md` holds the full recipe; this is the summary `brand-kickoff` offers.

| Archetype | Theme | Hero | Services | Values | Header | Focus ring | Motion |
|---|---|---|---|---|---|---|---|
| `cinematic` | Dark, documentary | `tpl-hero--cinematic` | `--index` | `--marquee` | Bar, overlay | `highlight` | 560ms, values ticker |
| `engineered` | Light, precise | `--split` | `--plates` | `--grid` | Bar | `ink` | 280ms, almost still |
| `editorial` | Light, people-first | `--editorial` | `--cards` | `--field` | Bar | `ink` | 440ms, soft |
| `kinetic` | Dark glass | `--scene` | `--bento` | `--rail` | Island | `highlight` | GSAP, three.js strand scene, view transitions |

## 4. Placeholders to replace

| Placeholder | Where | Replace with |
|---|---|---|
| "Client Name", "Client", "Name" | Titles, alt text, footer, Cover preview | Display name from the spec |
| (555) 010-0100, `tel:+15550100100`, `info@example.com` | Header, footer, CTA bands, forms, notices | The spec's phone and email |
| "Region one/two", "100 Main Street", "City, ST 00000" | Footer, FAQ | Offices from the spec |
| "Service one" to "Service five" | Services, forms, slots | The client's service names |
| "Value one" to "Value six", the mantra line | ValuesBand variants, boards | The client's values and mantra |
| `photo-*.svg`, `logo*.svg` | `src/img/`, `design-system/project/assets/` | Client photos (2000px or wider) and logo files |
| Sample jobs | `src/data/sample-jobs.json`, JobList preview | The client's job feed (or keep labelled samples) |

Check for leftovers with `rg -n "Client Name|Service (one|two|three|four|five)|Value (one|two|three|four|five|six)|555\) 010|example\.com|photo-(hero|people|wide|detail|craft|site)" concepts brandkit src`.
