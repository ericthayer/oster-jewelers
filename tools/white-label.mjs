// White-label codemod: renames the class prefix, the behavior namespace and concept slugs.
//   node tools/white-label.mjs --prefix ac --namespace AcmeDS --concept cinematic=harbor-line
// Dry run by default (prints every file it would change); add --apply to write.
// Current values come from design-system/project/design-system.json (prefix, namespace)
// and the theme ids in design-system/project/tokens.json.
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT = /\.(html|css|ts|mts|mjs|js|json|md|toml)$/;
const SKIP = new Set(['node_modules', 'dist', 'exports', 'generated', '.git', 'package-lock.json']);
const META = 'design-system/project/design-system.json';
const TOKENS = 'design-system/project/tokens.json';

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const pascal = (slug) => slug.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('');

export function parseArgs(argv) {
  const options = { apply: false, concepts: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined) throw new Error(`${arg} needs a value`);
      return next;
    };
    if (arg === '--apply') options.apply = true;
    else if (arg === '--prefix') options.prefix = value();
    else if (arg === '--namespace') options.namespace = value();
    else if (arg === '--concept') {
      const [from, to] = value().split('=');
      if (!from || !to) throw new Error('--concept takes <current-slug>=<new-slug>');
      options.concepts[from] = to;
    } else throw new Error(`Unknown option ${arg}`);
  }
  if (options.prefix !== undefined && !/^[a-z][a-z0-9]{1,5}$/.test(options.prefix)) throw new Error('--prefix: 2 to 6 lowercase letters or digits, starting with a letter');
  if (options.namespace !== undefined && !/^[A-Z][A-Za-z0-9]*DS$/.test(options.namespace)) throw new Error('--namespace: PascalCase ending in DS, like AcmeDS');
  for (const to of Object.values(options.concepts)) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(to)) throw new Error(`--concept: ${to} is not a kebab-case slug`);
  }
  return options;
}

/** Replacement rules for one text file. Concept slugs change only in theme, path and union contexts. */
export function rewrite(text, { fromPrefix, toPrefix, fromNamespace, toNamespace, concepts }) {
  let out = text;
  if (toPrefix && toPrefix !== fromPrefix) {
    const p = escape(fromPrefix);
    out = out
      .replace(new RegExp(`(?<![A-Za-z0-9_])${p}-`, 'g'), `${toPrefix}-`)
      .replace(new RegExp(`(?<=\\\\b)${p}-`, 'g'), `${toPrefix}-`)
      .replace(new RegExp(`(?<![A-Za-z0-9_])${p}(?=[A-Z])`, 'g'), toPrefix);
  }
  if (toNamespace && toNamespace !== fromNamespace) {
    out = out.replace(new RegExp(`\\b${escape(fromNamespace)}(?=Api\\b|\\b)`, 'g'), toNamespace);
  }
  for (const [from, to] of Object.entries(concepts)) {
    const s = escape(from);
    out = out
      .replace(/(data-(?:for-)?theme=\\?")([^"\\]*)(\\?")/g, (m, open, list, close) => open + list.split(' ').map((t) => (t === from ? to : t)).join(' ') + close)
      .replace(new RegExp(`\\[data-theme="${s}"\\]`, 'g'), `[data-theme="${to}"]`)
      .replace(new RegExp(`concepts/${s}/`, 'g'), `concepts/${to}/`)
      .replace(new RegExp(`(href="|current:|active=")${s}(?=[/"}])`, 'g'), `$1${to}`)
      .replace(new RegExp(`board-${s}\\b`, 'g'), `board-${to}`)
      .replace(new RegExp(`\\b${pascal(from)}Board\\b`, 'g'), `${pascal(to)}Board`)
      .replace(new RegExp(`\\|\\| '${s}'`, 'g'), `|| '${to}'`)
      .replace(/^(export type Theme = )(.*);$/m, (m, head, union) => head + union.replace(new RegExp(`'${s}'`, 'g'), `'${to}'`) + ';');
  }
  return out;
}

/** tokens.json: theme ids and per-theme value keys. */
export function rewriteTokens(tokens, concepts) {
  const json = JSON.parse(JSON.stringify(tokens));
  for (const theme of json.color.themes) if (concepts[theme.id]) theme.id = concepts[theme.id];
  const rekey = (value) => (value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).map(([key, v]) => [concepts[key] ?? key, v])) : value);
  for (const family of Object.values(json)) {
    if (family && Array.isArray(family.tokens)) for (const token of family.tokens) token.value = rekey(token.value);
  }
  return json;
}

function walk(root, dir = root) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(root, path) : [path];
  });
}

export function run(root, options) {
  const meta = JSON.parse(readFileSync(join(root, META), 'utf8'));
  const tokens = JSON.parse(readFileSync(join(root, TOKENS), 'utf8'));
  const themes = tokens.color.themes.map((theme) => theme.id);
  for (const from of Object.keys(options.concepts)) {
    if (!themes.includes(from)) throw new Error(`--concept: ${from} is not a theme in tokens.json (${themes.join(', ')})`);
  }
  const plan = { fromPrefix: meta.prefix, toPrefix: options.prefix, fromNamespace: meta.namespace, toNamespace: options.namespace, concepts: options.concepts };
  const changed = [];
  for (const file of walk(root).filter((f) => TEXT.test(f))) {
    const rel = relative(root, file).split(sep).join('/');
    const before = readFileSync(file, 'utf8');
    let after = rel === TOKENS && Object.keys(options.concepts).length ? JSON.stringify(rewriteTokens(JSON.parse(before), options.concepts), null, 2) + '\n' : before;
    after = rewrite(after, plan);
    if (rel === META && (options.prefix || options.namespace)) {
      const next = JSON.parse(after);
      if (options.prefix) next.prefix = options.prefix;
      if (options.namespace) next.namespace = options.namespace;
      after = JSON.stringify(next, null, 2) + '\n';
    }
    if (after !== before) { changed.push(rel); if (options.apply) writeFileSync(file, after); }
  }
  // Paths named after a concept: concept folders, board partials, board previews.
  const moves = [];
  for (const [from, to] of Object.entries(options.concepts)) {
    for (const [a, b] of [[`concepts/${from}`, `concepts/${to}`], [`src/partials/brandkit/board-${from}.html`, `src/partials/brandkit/board-${to}.html`],
      [`src/ds/components/${pascal(from)}Board`, `src/ds/components/${pascal(to)}Board`]]) {
      if (existsSync(join(root, a))) moves.push([a, b]);
    }
  }
  if (options.apply) for (const [a, b] of moves) renameSync(join(root, a), join(root, b));
  return { changed, moves };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  try {
    const options = parseArgs(process.argv.slice(2));
    const { changed, moves } = run(root, options);
    console.log(`${options.apply ? 'Changed' : 'Would change'} ${changed.length} file(s):`);
    for (const file of changed) console.log(`  ${file}`);
    for (const [a, b] of moves) console.log(`  ${options.apply ? 'moved' : 'would move'} ${a} -> ${b}`);
    if (!options.apply) console.log('\nDry run. Add --apply to write, then run npm run verify.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
