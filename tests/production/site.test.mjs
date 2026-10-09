import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { ROOT, DIST, PAGES, filesUnder, attributes, tags, srcsetUrls, cssUrls,
  htmlUrls, localFile, normalizeAssetRefs, sha256 } from '../lib/site-files.mjs';

const read = file => readFileSync(file, 'utf8');
const appPages = PAGES.slice(1);

function assertPreserved(actual, expected, message) {
  assert.equal(typeof actual, 'string', `${message}: output section is missing`);
  assert.equal(typeof expected, 'string', `${message}: source section is missing`);
  let offset = 0;
  while (offset < expected.length && actual[offset] === expected[offset]) offset++;
  assert.equal(sha256(actual), sha256(expected), `${message}\nFirst difference at character ${offset}\n`
    + `Source: ${JSON.stringify(expected.slice(Math.max(0, offset - 40), offset + 160))}\n`
    + `Output: ${JSON.stringify(actual.slice(Math.max(0, offset - 40), offset + 160))}`);
}

test('every production HTML entry exists with compiled hashed modules on app pages', () => {
  for (const entry of PAGES) {
    const html = read(join(DIST, entry));
    assert.match(html, /<!doctype html>/i, `${entry}: missing HTML document`);
    if (entry === 'index.html') continue;
    const modules = tags(html).filter(tag => tag.name === 'script' && tag.attrs.type === 'module' && tag.attrs.src);
    assert.equal(modules.length, 1, `${entry}: expected one compiled app entry`);
    assert.match(modules[0].attrs.src, /^\/assets\/[^/]+-[\w-]+\.js$/, `${entry}: entry must be hashed`);
    localFile(modules[0].attrs.src, join(DIST, entry), DIST);
    const stylesheets = tags(html).filter(tag => tag.name === 'link' && tag.attrs.rel === 'stylesheet');
    assert.ok(stylesheets.length > 0, `${entry}: compiled app CSS must be linked`);
    for (const tag of stylesheets) {
      assert.match(tag.attrs.href, /^\/assets\/[^/]+-[\w-]+\.css$/, `${entry}: CSS must be hashed`);
      localFile(tag.attrs.href, join(DIST, entry), DIST);
    }
    assert.doesNotMatch(html, /(?:\/src\/main\.ts|(?:\.\.\/|\/|["'])dist\/site\.(?:css|js)|\{\{[^}]*\}\}|<!--\s*@include\b)/i,
      `${entry}: obsolete runtime path or unresolved template`);
  }
});

test('every local HTML resource, inline background and emitted CSS URL resolves inside dist', () => {
  let htmlResources = 0;
  let cssResources = 0;
  const cssFiles = new Set(filesUnder(DIST).filter(file => file.endsWith('.css')));
  for (const entry of PAGES) {
    const owner = join(DIST, entry);
    const html = read(owner);
    for (const url of htmlUrls(html)) if (localFile(url, owner, DIST)) htmlResources++;
    for (const tag of tags(html).filter(tag => tag.name === 'link' && tag.attrs.rel === 'stylesheet')) {
      const file = localFile(tag.attrs.href, owner, DIST);
      if (file) cssFiles.add(file);
    }
  }
  for (const owner of cssFiles) {
    for (const url of cssUrls(read(owner))) if (localFile(url, owner, DIST)) cssResources++;
  }
  assert.ok(htmlResources > 0, 'Must check actual emitted HTML assets');
  assert.ok(cssResources > 0, 'Must check self-hosted font URLs in the emitted CSS');
});

for (const entry of appPages) {
  test(`${entry} preserves authored content, inline styles and SVG except asset references`, () => {
    const sourceRaw = read(join(ROOT, entry));
    const outputRaw = read(join(DIST, entry));
    const source = normalizeAssetRefs(sourceRaw, join(ROOT, entry), ROOT);
    const output = normalizeAssetRefs(outputRaw, join(DIST, entry), DIST);
    const body = html => /<body\b[^>]*>[\s\S]*<\/body>/i.exec(html)?.[0];
    assert.ok(body(source), `${entry}: source body must be present`);
    assertPreserved(body(output), body(source), `${entry}: body markup, copy, inline styles, SVG or inline scripts changed`);
    // Ignore only Vite's head entry and generated CSS/modulepreload tags. Preserve all other head content.
    const head = html => /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1]
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, tag => {
        const attrs = attributes(/^<script\b[^>]*>/i.exec(tag)[0]);
        return attrs.type === 'module' && (attrs.src === '/src/main.ts' || /^\/assets\/[^/]+-[\w-]+\.js$/.test(attrs.src ?? '')) ? '' : tag;
      })
      .replace(/<link\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi, tag => {
        const attrs = attributes(tag);
        return ['stylesheet', 'modulepreload'].includes(attrs.rel) && /^\/assets\//.test(attrs.href ?? '') ? '' : tag;
      }).split(/(<style\b[^>]*>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>)/gi)
      .map(chunk => /^<(?:style|script)\b/i.test(chunk) ? chunk : chunk.replace(/^[ \t]*\n/gm, '')).join('').trim();
    assertPreserved(normalizeAssetRefs(head(outputRaw), join(DIST, entry), DIST),
      normalizeAssetRefs(head(sourceRaw), join(ROOT, entry), ROOT),
      `${entry}: authored head metadata or inline style blocks changed`);
  });
}

test('root redirects immediately to the concepts hub and retains an accessible fallback link', () => {
  const html = read(join(DIST, 'index.html'));
  const elements = tags(html);
  const refresh = elements.find(tag => tag.name === 'meta' && tag.attrs['http-equiv']?.toLowerCase() === 'refresh');
  assert.ok(refresh, 'Root must provide a meta redirect');
  assert.match(refresh.attrs.content, /^0\s*;\s*url=\/concepts\/$/i);
  assert.ok(elements.some(tag => tag.name === 'main'), 'Root must retain a main landmark');
  assert.match(html, /<a\b[^>]*href="\/concepts\/"[^>]*>[^<]*\S[^<]*<\/a>/i, 'Redirect must have a descriptive fallback');
  localFile('/concepts/index.html', join(DIST, 'index.html'), DIST);
});

test('production output excludes source trees, tools, dependencies, secrets and design-system harness exports', () => {
  const files = filesUnder(DIST).map(file => relative(DIST, file).split(sep).join('/'));
  const forbidden = files.filter(file => file.split('/').some(part =>
    ['src', 'tools', 'node_modules', 'harness', 'exports', 'design-system'].includes(part) || /^\.env(?:\.|$)/.test(part)));
  assert.deepEqual(forbidden, [], `Private or standalone-only files leaked into dist: ${forbidden.join(', ')}`);
});

test('GSAP and Three ship as dynamic chunks without eager Three loading from the hub', () => {
  const js = filesUnder(join(DIST, 'assets')).filter(file => file.endsWith('.js'));
  for (const prefix of ['gsap', 'ScrollTrigger', 'three.module']) {
    assert.ok(js.some(file => new RegExp(`^${prefix.replace('.', '\\.')}-[\\w-]+\\.js$`).test(file.split(sep).at(-1))), `Missing dynamic ${prefix} chunk`);
  }
  const hub = read(join(DIST, 'concepts/index.html'));
  const eager = tags(hub).filter(tag => tag.name === 'script' || (tag.name === 'link' && ['preload', 'modulepreload'].includes(tag.attrs.rel)));
  assert.ok(!eager.some(tag => /three/i.test(tag.attrs.src ?? tag.attrs.href ?? '')), 'Hub must not eagerly import/preload Three');
  assert.doesNotMatch(hub, /\bimport\s*(?:["'][^"']*three|[^;]*\bfrom\s*["'][^"']*three)/i);
  const visited = new Set();
  function inspectStaticImports(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const code = read(file);
    assert.ok(!/\/three\.module-[\w-]+\.js$/.test(file), `Hub static import graph eagerly loads Three: ${file}`);
    for (const match of code.matchAll(/\b(?:import|export)\s*(?:[^;"'`]*?\bfrom\s*)?["'`]([^"'`]+)["'`]/g)) {
      const dependency = localFile(match[1], file, DIST);
      if (dependency) inspectStaticImports(dependency);
    }
  }
  for (const tag of eager.filter(tag => tag.attrs.src || tag.attrs.rel === 'modulepreload')) {
    const file = localFile(tag.attrs.src ?? tag.attrs.href, join(DIST, 'concepts/index.html'), DIST);
    if (file) inspectStaticImports(file);
  }
  const entry = eager.find(tag => tag.name === 'script' && tag.attrs.type === 'module');
  assert.ok(entry, 'Hub app module must exist');
  const code = read(localFile(entry.attrs.src, join(DIST, 'concepts/index.html'), DIST));
  for (const prefix of ['gsap', 'ScrollTrigger', 'three.module']) {
    assert.ok(new RegExp('import\\(["\'`][^"\'`]*' + prefix.replace('.', '\\.') + '-[\\w-]+\\.js["\'`]\\)').test(code),
      `${prefix} must remain a dynamic import`);
  }
});

test('inline style parity accepts CSS minification without normalizing surrounding HTML', () => {
  const normalize = html => normalizeAssetRefs(html, join(DIST, 'index.html'), DIST);
  const before = '<!-- <style>.untouched { color: blue; }</style> -->\n<p>Keep  spaces</p>\n';
  const after = '\n<script>const css = "<style>.untouched { color: blue; }</style>";</script>\n<div style="color: red;">Copy</div>';
  const source = before + `<style media="screen">
    .photo { display: grid; gap: 16px; color: #ff0000; background: url( "https://example.invalid/photo.png" ); }
    @media (min-width: 768px) { .photo > span { padding: 0px; } }
  </style>` + after;
  const output = before + '<style media="screen">.photo{background:url(https://example.invalid/photo.png);color:red;gap:16px;display:grid}@media(width>=768px){.photo>span{padding:0}}</style>' + after;
  assertPreserved(normalize(output), normalize(source), 'Equivalent inline CSS');
  assert.ok(normalize(source).startsWith(before), 'HTML and commented styles before the block must remain exact');
  assert.ok(normalize(source).endsWith(after), 'Scripts, style attributes and HTML after the block must remain exact');
});

for (const [name, source, mutation] of [
  ['color value', '.photo{color:red}', '.photo{color:blue}'],
  ['property name', '.photo{margin:1px}', '.photo{padding:1px}'],
  ['selector', '.photo{color:red}', '.other{color:red}'],
  ['selector descendant whitespace', '.photo span{color:red}', '.photo.span{color:red}'],
  ['important priority', '.photo{color:red!important}', '.photo{color:red}'],
  ['declaration cascade order', '.photo{margin:1px;margin-left:2px}', '.photo{margin-left:2px;margin:1px}'],
  ['rule cascade order', '.photo{color:red}.active{color:blue}', '.active{color:blue}.photo{color:red}'],
  ['media condition', '@media(min-width:768px){.photo{color:red}}', '@media(min-width:769px){.photo{color:red}}'],
  ['custom property value', '.photo{--accent:red;color:var(--accent)}', '.photo{--accent:blue;color:var(--accent)}'],
  ['generated content whitespace', '.photo:before{content:"Keep  spaces"}', '.photo:before{content:"Keep spaces"}'],
]) {
  test(`inline style parity rejects changed ${name} after canonicalization`, () => {
    const normalize = css => normalizeAssetRefs(`<style>${css}</style>`, join(DIST, 'index.html'), DIST);
    assert.throws(() => assertPreserved(normalize(mutation), normalize(source), `${name} changed`),
      { code: 'ERR_ASSERTION', message: new RegExp(`${name} changed`) });
  });
}

test('inline style parity maps local URL bytes before canonicalizing URL quotes and whitespace', () => {
  const entry = 'concepts/index.html';
  const image = html => tags(html).find(tag => tag.name === 'img').attrs.src;
  const sourceAsset = image(read(join(ROOT, entry)));
  const outputAsset = image(read(join(DIST, entry)));
  const source = normalizeAssetRefs(`<style>.photo { background: url( '${sourceAsset}' ); }</style>`, join(ROOT, entry), ROOT);
  const output = normalizeAssetRefs(`<style>.photo{background:url(${outputAsset})}</style>`, join(DIST, entry), DIST);
  assertPreserved(output, source, 'Same image bytes with optimized URL syntax');
  assert.throws(() => assertPreserved(
    normalizeAssetRefs('<style>.photo{background:url(data:image/png;base64,AAAA)}</style>', join(DIST, entry), DIST),
    source, 'Image bytes changed'), { code: 'ERR_ASSERTION', message: /Image bytes changed/ });
});

test('production inline color mutation fails parity without changing any files', () => {
  const owner = join(DIST, 'concepts/cinematic/index.html');
  const original = read(owner);
  const mutated = original.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_, open, css, close) => open + css.replace(/([;{])color:[^;}]+/i, '$1color:rebeccapurple') + close);
  assert.notEqual(mutated, original, 'Mutation must change an actual production inline color');
  assert.throws(() => assertPreserved(normalizeAssetRefs(mutated, owner, DIST),
    normalizeAssetRefs(original, owner, DIST), 'Production color changed'),
    { code: 'ERR_ASSERTION', message: /Production color changed/ });
});

for (const [name, source, mutation] of [
  ['copy', '<p>Keep  spaces</p>', '<p>Keep spaces</p>'],
  ['SVG geometry', '<svg><path d="M0 0"/></svg>', '<svg><path d="M0 1"/></svg>'],
  ['style attribute property', '<div style="color:red">Copy</div>', '<div style="color:blue">Copy</div>'],
  ['inline script', '<script>const value = 1;</script>', '<script>const value = 2;</script>'],
  ['style tag attributes', '<style media="screen">.photo{color:red}</style>', '<style media="print">.photo{color:red}</style>'],
]) {
  test(`HTML parity still rejects changed ${name} beside canonicalized inline CSS`, () => {
    const normalize = html => normalizeAssetRefs('<style>.photo { color: red; }</style>' + html, join(DIST, 'index.html'), DIST);
    assert.throws(() => assertPreserved(normalize(mutation), normalize(source), `${name} changed`),
      { code: 'ERR_ASSERTION', message: new RegExp(`${name} changed`) });
  });
}

test('resource extraction covers srcsets, CSS backgrounds and fonts but not prototype navigation', () => {
  assert.deepEqual(srcsetUrls('/small.png 1x, /large.png 2x'), ['/small.png', '/large.png']);
  assert.deepEqual(srcsetUrls('data:image/png;base64,AAAA 1x, /large.png 2x'), ['data:image/png;base64,AAAA', '/large.png']);
  assert.deepEqual(htmlUrls(`<a href="/intentionally-unbuilt/">Prototype</a><img src='/photo.png' srcset='/small.png 400w, /large.png 800w'>
    <link rel="preload" as="font" href="/font.woff2"><div style="background:url('/background.png')"></div>
    <style>@font-face{src:url(/other.woff2)}</style><script src="/app.js"></script>`),
  ['/photo.png', '/small.png', '/large.png', '/font.woff2', '/background.png', '/app.js', '/other.woff2']);
  assert.throws(() => localFile('/assets/__missing_test_resource__.png', join(DIST, 'index.html'), DIST), /missing local asset/);
  assert.throws(() => localFile('../../outside.png', join(DIST, 'index.html'), DIST), /escapes output root/);
  assert.deepEqual(htmlUrls('<div style="background:url(&quot;https://example.invalid/photo.jpg&quot;)"></div>'),
    ['https://example.invalid/photo.jpg']);
  assert.deepEqual(cssUrls('@import "./theme.css";/* url(missing.png) */.photo{background:url(photo.png)}'), ['./theme.css', 'photo.png']);
  assert.deepEqual(htmlUrls('<!-- <style>div{background:url(missing.png)}</style> -->'), []);
  assert.equal(localFile('https://example.invalid/photo.jpg', join(DIST, 'index.html'), DIST), null);
  assert.throws(() => assertPreserved('<svg><path d="M0 1"/></svg>', '<svg><path d="M0 0"/></svg>', 'SVG changed'), /SVG changed/);
  assert.throws(() => assertPreserved('<div style="color:red">Copy</div>', '<div style="color:blue">Copy</div>', 'Style changed'), /Style changed/);
  const normalize = html => normalizeAssetRefs(html, join(DIST, 'index.html'), DIST);
  assert.notEqual(normalize('<p>Original</p><img src="data:image/png;base64,AAAA">'),
    normalize('<p>Changed</p><img src="data:image/png;base64,AAAA">'));
  assert.notEqual(normalize('<img src="data:image/png;base64,AAAA">'), normalize('<img src="data:image/jpeg;base64,AAAA">'));
  const asset = tags(read(join(DIST, 'concepts/index.html'))).find(tag => tag.name === 'img').attrs.src;
  assert.notEqual(normalize(`<p>${asset}</p><img src="${asset}">`), normalize('<p>Changed</p>' + `<img src="${asset}">`));
  assert.notEqual(normalize(`<svg><use href="${asset}#first"></use></svg>`), normalize(`<svg><use href="${asset}#second"></use></svg>`));
});