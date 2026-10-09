// Quality gate for the design system and concept pages.
//   node tools/check.mjs            -> tokens contrast matrix + copy/markup rules
// Exits non-zero when any rule fails, so it can sit in CI later.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { contrast, over, luminance } from './lib/color.mjs';

const root = new URL('..', import.meta.url).pathname;
const tokens = JSON.parse(readFileSync(join(root, 'design-system/project/tokens.json'), 'utf8'));
const themes = tokens.color.themes.map((t) => t.id);
const byName = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t]));
let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  ok    ${msg}`);

// Resolve a color token to a literal for one theme, following {alias} chains.
function resolve(name, theme, depth = 0) {
  const t = byName[name];
  if (!t) throw new Error(`unknown token ${name}`);
  if (depth > 16) throw new Error(`alias chain too deep at ${name}`);
  let v = typeof t.value === 'string' ? t.value : (t.value[theme] ?? t.value[themes[0]]);
  const m = /^\{(.+)\}$/.exec(v);
  return m ? resolve(m[1], theme, depth + 1) : v;
}

// Pairs every theme must meet: [foreground, background, minimum, why].
const TEXT = 4.5, LARGE = 3, UI = 3;
const pairs = [
  ['text', 'surface', TEXT, 'body'], ['text', 'surface-raised', TEXT, 'body'], ['text', 'surface-sunken', TEXT, 'body'], ['text', 'surface-hover', TEXT, 'hovered row'],
  ['text-muted', 'surface', TEXT, 'secondary'], ['text-muted', 'surface-raised', TEXT, 'secondary'], ['text-muted', 'surface-sunken', TEXT, 'secondary'],
  ['accent-text', 'surface', TEXT, 'accent text'], ['accent-text', 'surface-raised', TEXT, 'accent text'], ['accent-text', 'surface-sunken', TEXT, 'accent text'],
  ['accent-text-hover', 'surface', TEXT, 'link hover'], ['accent-text-hover', 'surface-raised', TEXT, 'link hover'],
  ['on-accent', 'accent', TEXT, 'button label'], ['on-accent', 'accent-hover', TEXT, 'button hover'], ['on-accent', 'surface-accent', TEXT, 'accent band'],
  ['text-inverse', 'surface-inverse', TEXT, 'inverse block'],
  ['danger', 'surface', TEXT, 'error text'], ['danger', 'surface-raised', TEXT, 'error text'], ['danger', 'surface-sunken', TEXT, 'error text'],
  ['success', 'surface', TEXT, 'success text'], ['success', 'surface-raised', TEXT, 'success text'],
  ['field-border', 'surface', UI, 'control border'], ['field-border', 'surface-raised', UI, 'control border'], ['field-border', 'surface-sunken', UI, 'control border'], ['field-border', 'surface-hover', UI, 'control border'],
  ['focus-ring', 'surface', UI, 'focus ring'], ['focus-ring', 'surface-raised', UI, 'focus ring'], ['focus-ring', 'surface-sunken', UI, 'focus ring'],
  ['focus-ring-on-accent', 'accent', UI, 'focus ring on accent'],
  ['accent', 'surface', UI, 'accent button edge'],
];

console.log('\nContrast matrix (WCAG 2.x)');
for (const theme of themes) {
  console.log(`\n  [${theme}]`);
  for (const [fg, bg, min, why] of pairs) {
    // Accent fills on light pages carry an ink label; their edge is only decorative there.
    if (fg === 'accent' && bg === 'surface' && luminance(resolve('surface', theme)) > 0.5) continue;
    const r = contrast(resolve(fg, theme), resolve(bg, theme));
    const line = `${fg.padEnd(20)} on ${bg.padEnd(15)} ${r.toFixed(2).padStart(5)}:1  (min ${min}, ${why})`;
    r >= min ? pass(line) : fail(`${theme}: ${line}`);
  }
}

// Text over photography: scrim composited over the worst case, a white sky.
console.log('\n  [photo scrim, worst case white sky]');
for (const fg of ['text-on-photo', 'text-on-photo-muted']) {
  const bg = over(resolve('scrim', themes[0]), '#ffffff');
  const r = contrast(resolve(fg, themes[0]), bg);
  const line = `${fg} over scrim ${r.toFixed(2)}:1`;
  r >= TEXT ? pass(line) : fail(line);
}

// Every token carries a usage note.
const families = Object.entries(tokens).filter(([, v]) => v && Array.isArray(v.tokens));
const missing = families.flatMap(([, f]) => f.tokens.filter((t) => !t.usage).map((t) => t.name));
missing.length ? fail(`tokens without usage: ${missing.join(', ')}`) : pass('every token has a usage note');
const names = families.flatMap(([, f]) => f.tokens.map((t) => t.name));
const dupes = names.filter((n, i) => names.indexOf(n) !== i);
dupes.length ? fail(`duplicate token names: ${dupes.join(', ')}`) : pass('token names unique across families');

// Copy and markup rules on the pages people will see (design-taste-frontend pre-flight).
// One label per intent. Labels come from ctaIntents in design-system.json; the phrases below are
// common alternatives that must not appear beside the chosen label.
const ctaIntents = JSON.parse(readFileSync(join(root, 'design-system/project/design-system.json'), 'utf8')).ctaIntents ?? {};
const ALTERNATIVES = {
  quote: ['request a quote', 'get a quote', 'free quote', 'get an estimate'],
  contact: ['contact us', 'get in touch', "let's talk", 'lets talk', 'reach out'],
  careers: ['view open roles', 'see open positions', 'view jobs', 'see open roles'],
  partner: ['start an inquiry', 'become a partner', 'partner inquiry'],
};
const phrase = (label) => label.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "'?");
const intents = Object.fromEntries(Object.entries(ALTERNATIVES).map(([intent, alternatives]) => {
  const labels = new Set([...alternatives, ...(ctaIntents[intent] ? [ctaIntents[intent].toLowerCase()] : [])]);
  return [intent, new RegExp([...labels].map(phrase).join('|'), 'gi')];
}));

const pageRoots = ['concepts', 'brandkit', 'src/ds'].map((p) => join(root, p)).filter(existsSync);
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const pages = pageRoots.flatMap(walk).filter((p) => extname(p) === '.html');
const visibleText = (html) => html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ');

console.log(`\nCopy rules on ${pages.length} HTML files`);
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  const text = visibleText(html);
  if (/[–—]/.test(text) || /alt="[^"]*[–—][^"]*"/.test(html)) fail(`${rel}: em or en dash in visible text`);
  if (/lorem ipsum/i.test(text)) fail(`${rel}: lorem ipsum`);
  // Full pages only: eyebrows capped at ceil(sections / 3), one label per CTA intent.
  if (/<main[\s>]/.test(html)) {
    const sections = (html.match(/<section[\s>]/g) || []).length;
    const eyebrows = (html.match(/class="[^"]*\btpl-eyebrow\b/g) || []).length;
    const cap = Math.ceil(sections / 3);
    eyebrows <= cap ? pass(`${rel}: ${eyebrows} eyebrow(s) for ${sections} sections`) : fail(`${rel}: ${eyebrows} eyebrows > cap ${cap}`);
    for (const [intent, re] of Object.entries(intents)) {
      const labels = new Set((text.match(re) || []).map((s) => s.toLowerCase()));
      const chosen = ctaIntents[intent]?.toLowerCase();
      const ok = labels.size === 0 || (labels.size === 1 && (!chosen || labels.has(chosen)));
      ok ? pass(`${rel}: one label for ${intent}`) : fail(`${rel}: ${intent} intent uses ${[...labels].join(' / ')}${chosen ? ` (label is "${ctaIntents[intent]}")` : ''}`);
    }
  }
}

console.log(failures ? `\n${failures} check(s) failed.\n` : '\nAll checks passed.\n');
process.exit(failures ? 1 : 0);
