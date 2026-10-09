// Standalone Oxygen/artifact export. Run: npm run build:ds
// All export output lives in exports/. Authored app pages and Vite's dist/ are never written.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync, cpSync, statSync } from 'node:fs';
import { join, dirname, basename, relative, posix } from 'node:path';
import { build } from 'esbuild';
import { ROOT, compileTokens, loadIcons, prepareData } from './lib/build-data.mjs';

prepareData();

const at = (...p) => join(ROOT, ...p);
const read = (p) => readFileSync(at(p), 'utf8');
const OUTPUT = at('exports');
const write = (p, s) => { mkdirSync(dirname(join(OUTPUT, p)), { recursive: true }); writeFileSync(join(OUTPUT, p), s); };
const copy = (src, out) => { mkdirSync(dirname(join(OUTPUT, out)), { recursive: true }); cpSync(at(src), join(OUTPUT, out), { recursive: true }); };
const walk = (dir) => (existsSync(at(dir)) ? readdirSync(at(dir)).flatMap((f) => {
  const p = posix.join(dir, f);
  return statSync(at(p)).isDirectory() ? walk(p) : [p];
}) : []);
const warnings = [];

// Preserve the original project metadata, guidelines and assets in the exported artifact.
// Generated bundles and previews below replace only this copy, never the tracked source.
copy('design-system/project', 'design-system/project');
copy('src/fonts', 'fonts');
copy('src/fonts', 'design-system/project/fonts');
copy('src/img', 'src/img');
copy('src/data', 'src/data');

// ---------------------------------------------------------------- assets
// DS asset path (Group/file) -> local source file. Uploads land in design-system/asset-map.json.
const ASSETS = {
  'Logos/logo.svg': 'src/img/logo/logo.svg',
  'Logos/logo-reversed.svg': 'src/img/logo/logo-reversed.svg',
  'Photography/photo-wide.svg': 'src/img/photos/photo-wide.svg',
  'Photography/photo-hero.svg': 'src/img/photos/photo-hero.svg',
  'Photography/photo-people.svg': 'src/img/photos/photo-people.svg',
  'Photography/photo-detail.svg': 'src/img/photos/photo-detail.svg',
  'Photography/photo-craft.svg': 'src/img/photos/photo-craft.svg',
  'Photography/photo-site.svg': 'src/img/photos/photo-site.svg',
};
const assetMap = existsSync(at('design-system/asset-map.json')) ? JSON.parse(read('design-system/asset-map.json')) : {};

// ---------------------------------------------------------------- vendored libraries (Kinetic motion and scene)
// {{vendor:key}} -> exports/vendor in local harnesses, pinned cdnjs builds in DS previews.
// (previews may only load scripts from the artifact CDNs). GSAP also ships as DS libraries in components/lib.
const pkgVersion = (name) => JSON.parse(readFileSync(at('node_modules', name, 'package.json'), 'utf8')).version;
const VENDOR = {
  gsap: { src: 'node_modules/gsap/dist/gsap.min.js', dist: 'vendor/gsap.min.js', lib: 'design-system/project/components/lib/gsap.min.js', cdn: `https://cdnjs.cloudflare.com/ajax/libs/gsap/${pkgVersion('gsap')}/gsap.min.js` },
  'gsap-scrolltrigger': { src: 'node_modules/gsap/dist/ScrollTrigger.min.js', dist: 'vendor/ScrollTrigger.min.js', lib: 'design-system/project/components/lib/ScrollTrigger.min.js', cdn: `https://cdnjs.cloudflare.com/ajax/libs/gsap/${pkgVersion('gsap')}/ScrollTrigger.min.js` },
  three: { src: 'node_modules/three/build/three.module.js', dist: 'vendor/three.module.js', cdn: `https://cdnjs.cloudflare.com/ajax/libs/three.js/${pkgVersion('three')}/three.module.min.js` },
  // three.module.js imports ./three.core.js beside it (the cdnjs build imports three.core.min.js the same way).
  'three-core': { src: 'node_modules/three/build/three.core.js', dist: 'vendor/three.core.js', cdn: `https://cdnjs.cloudflare.com/ajax/libs/three.js/${pkgVersion('three')}/three.core.min.js` },
};
for (const v of Object.values(VENDOR)) {
  if (!existsSync(at(v.src))) { warnings.push(`vendor file missing: ${v.src} (run npm install)`); continue; }
  for (const out of [v.dist, v.lib].filter(Boolean)) { mkdirSync(dirname(join(OUTPUT, out)), { recursive: true }); copyFileSync(at(v.src), join(OUTPUT, out)); }
}

// ---------------------------------------------------------------- icons (Tabler outline, MIT)
const ICONS = loadIcons();
const iconSvg = (attrs, name) => {
  if (!ICONS[name]) { warnings.push(`unknown icon in markup: ${name}`); return `<svg${attrs}></svg>`; }
  const labelled = /aria-label=/.test(attrs);
  const a11y = labelled ? ' role="img"' : ' aria-hidden="true" focusable="false"';
  return `<svg${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"${a11y}>${ICONS[name]}</svg>`;
};

// ---------------------------------------------------------------- 1. tokens -> standalone static CSS
const tokens = JSON.parse(read('design-system/project/tokens.json'));
const themes = tokens.color.themes.map((t) => t.id);
const first = themes[0];
const tokensCss = compileTokens(tokens, 'fonts/');
write('tokens.css', tokensCss);

// ---------------------------------------------------------------- 2. CSS bundle
const CSS_PARTS = ['src/css/base.css', 'src/css/concepts.css', 'src/css/components.css'];
const bundleCss = CSS_PARTS.map((p) => `/* ---- ${basename(p)} ---- */\n${read(p)}`).join('\n');
if (/<\/style/i.test(bundleCss)) throw new Error('bundle.css contains </style');
write('design-system/project/components/bundle.css', `/* Site design system. Built from src/css by tools/build.mjs. */\n${bundleCss}`);
write('site.css', `${tokensCss}\n${bundleCss}`);

// ---------------------------------------------------------------- 3. JS bundle
const result = await build({
  absWorkingDir: ROOT,
  entryPoints: ['src/behaviors/site.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2017',
  write: false,
  metafile: true,
  banner: { js: `/* @ds-bundle: {"format":4,"namespace":"${JSON.parse(read('design-system/project/design-system.json')).namespace}","components":[]} */` },
});
// Optional GSAP/three imports are type-only. Catch accidental runtime dependencies.
if (Object.keys(result.metafile.inputs).some((p) => p.includes('node_modules/'))) {
  throw new Error('Standalone runtime must not bundle optional vendor libraries');
}
const bundleJs = result.outputFiles[0].text;
if (/<\/script|<!--/i.test(bundleJs)) throw new Error('bundle.js contains </script or <!--');
write('design-system/project/components/bundle.js', bundleJs);
write('site.js', bundleJs);
write('design-system/project/components/index.d.ts', read('src/types/index.d.ts'));

// ---------------------------------------------------------------- 4. HTML processing
function processHtml(html, { outFile, mode }) {
  // Partials: <!-- @include name.html key="value" -->  ->  src/partials/name.html with {{key}} / {{key|default}}
  for (let pass = 0; pass < 4; pass++) {
    html = html.replace(/<!--\s*@include\s+([\w./-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g, (_, name, argStr) => {
      const args = Object.fromEntries([...argStr.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
      let part = read(`src/partials/${name}`);
      part = part.replace(/\{\{current:([\w-]+)\}\}/g, (_m, key) => (args.active === key ? ' aria-current="page"' : ''));
      return part.replace(/\{\{([\w-]+)(?:\|([^}]*))?\}\}/g, (m, key, def) => (key in args ? args[key] : def ?? m));
    });
  }
  // Asset paths
  html = html.replace(/\{\{asset:([^}]+)\}\}/g, (_, key) => {
    const local = ASSETS[key];
    if (!local) { warnings.push(`${outFile}: unknown asset ${key}`); return ''; }
    if (mode === 'ds') {
      const rec = assetMap[key];
      if (!rec) { warnings.push(`${outFile}: ${key} not uploaded yet`); return `/_blob/PENDING-${key}`; }
      return `/_blob/${rec.blob}`;
    }
    return relative(dirname(join(OUTPUT, outFile)), join(OUTPUT, local));
  });
  // Vendored scripts: {{vendor:three}}
  html = html.replace(/\{\{vendor:([\w-]+)\}\}/g, (_, key) => {
    const v = VENDOR[key];
    if (!v) { warnings.push(`${outFile}: unknown vendor ${key}`); return ''; }
    return mode === 'ds' ? v.cdn : relative(dirname(join(OUTPUT, outFile)), join(OUTPUT, v.dist));
  });
  // Legacy preview helpers point to root/src/data or root/dist/vendor.
  // In local exports both live directly under the export root; there is no dist/.
  const root = relative(dirname(join(OUTPUT, outFile)), OUTPUT) || '.';
  html = html.replace(/\{\{root\}\}\/dist(?=\/|["'])/g, root);
  html = html.replace(/\{\{root\}\}/g, root);
  // Inline icons: <svg class="tpl-icon" data-tpl-icon="phone"></svg>
  html = html.replace(/<svg((?:\s+[\w:-]+(?:="[^"]*")?)*?\s+data-tpl-icon="([\w-]+)"(?:\s+[\w:-]+(?:="[^"]*")?)*?)\s*><\/svg>/g,
    (_, attrs, name) => iconSvg(attrs, name));
  return html;
}

// DS previews only. Never walk or generate authored app pages.
const previews = walk('src/ds/components').filter((p) => p.endsWith('/preview.html'));
const harnessLinks = [];
for (const src of previews) {
  const comp = src.split('/').at(-2);
  const dsOut = `design-system/project/components/${comp}/preview.html`;
  const raw = read(src);
  const dsHtml = processHtml(raw, { outFile: dsOut, mode: 'ds' });
  if (!/^<!-- @dsCard /.test(dsHtml)) warnings.push(`${src}: line 1 must be the @dsCard marker`);
  write(dsOut, dsHtml);

  const hxOut = `harness/${comp}.html`;
  const local = processHtml(raw, { outFile: hxOut, mode: 'local' });
  const marker = /^<!-- @dsCard ([^>]*)-->/.exec(local)?.[1] || '';
  const height = /height=(\d+)/.exec(marker)?.[1] || '120';
  const headStyles = [...local.matchAll(/<head[\s\S]*?<\/head>/gi)].flatMap((m) => m[0].match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(local)?.[1] ?? local.replace(/^<!--[^>]*-->/, '');
  write(hxOut, `<!doctype html>
<html lang="en" data-theme="${first}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${comp} (harness)</title>
<link rel="stylesheet" href="../site.css">
<script src="../vendor/gsap.min.js"></script>
<script src="../vendor/ScrollTrigger.min.js"></script>
<script src="../site.js"></script>
${headStyles}
<style>.hx-bar{position:fixed;right:8px;bottom:8px;z-index:9999;display:flex;gap:4px;font:12px/1 system-ui,sans-serif}.hx-bar button{padding:6px 8px;border:1px solid #888;background:#fff;color:#111;cursor:pointer}.hx-bar button[aria-pressed="true"]{background:#111;color:#fff}</style>
</head>
<body>
${body}
<div class="hx-bar" role="group" aria-label="Theme">${themes.map((t) => `<button type="button" data-t="${t}" aria-pressed="${t === first}">${t}</button>`).join('')}</div>
<script>document.querySelector('.hx-bar').addEventListener('click',function(e){var t=e.target.closest('button');if(!t)return;document.documentElement.setAttribute('data-theme',t.dataset.t);this.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b===t))});});</script>
</body>
</html>
`);
  harnessLinks.push({ comp, height: Number(height), group: /group="([^"]+)"/.exec(marker)?.[1] || '' });
}
write('harness/index.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DS preview harness</title>
<style>body{margin:0;font:14px/1.4 system-ui,sans-serif;background:#ddd;color:#111}h1{margin:16px}section{margin:0 16px 24px}h2{font-size:14px;margin:0 0 6px}.row{display:grid;grid-template-columns:repeat(${themes.length},1fr);gap:8px}iframe{width:100%;border:1px solid #999;background:#fff}</style></head>
<body><h1>Design system previews, all themes</h1>
${harnessLinks.map(({ comp, height, group }) => `<section><h2>${group ? group + ' / ' : ''}${comp}</h2><div class="row">${themes.map((t) => `<iframe title="${comp} ${t}" loading="lazy" style="height:${Math.min(height + 24, 1400)}px" src="${comp}.html" data-theme="${t}" onload="try{this.contentDocument.documentElement.setAttribute('data-theme','${t}');var b=this.contentDocument.querySelector('.hx-bar');if(b)b.remove()}catch(e){}"></iframe>`).join('')}</div></section>`).join('\n')}
</body></html>
`);

console.log(`built: exports/ (Oxygen assets, design-system/project/, harness/; ${previews.length} previews)`);
if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); for (const w of [...new Set(warnings)]) console.log(`  - ${w}`); }
