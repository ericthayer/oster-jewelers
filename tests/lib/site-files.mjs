import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const DIST = join(ROOT, 'dist');
export const CONCEPTS = readdirSync(join(ROOT, 'concepts'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(join(ROOT, 'concepts', entry.name, 'index.html')))
  .map(entry => entry.name).sort();
export const PAGES = ['index.html', 'concepts/index.html', ...CONCEPTS.map(name => `concepts/${name}/index.html`), 'brandkit/index.html'];
export const sha256 = content => createHash('sha256').update(content).digest('hex');

function decodeEntities(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    return named[entity.toLowerCase()] ?? String.fromCodePoint(entity[2].toLowerCase() === 'x'
      ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10));
  });
}

export function filesUnder(directory, exclude = () => false) {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => {
      const file = join(directory, entry.name);
      if (exclude(file)) return [];
      return entry.isDirectory() ? filesUnder(file, exclude) : [file];
    });
}

export function fileMap(files, root = ROOT) {
  return Object.fromEntries(files.map(file => [relative(root, file).split(sep).join('/'), sha256(readFileSync(file))])
    .sort(([a], [b]) => a.localeCompare(b)));
}

export function attributes(tag) {
  const result = {};
  const body = tag.replace(/^<\/?[\w:-]+/, '').replace(/\/?>$/, '');
  for (const match of body.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return result;
}

export function tags(html) {
  // Do not mistake commented markup or strings inside scripts/styles for HTML elements.
  const markup = html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<(?:script|style)\b[^>]*>)[\s\S]*?(<\/(?:script|style)>)/gi, '$1$2');
  return [...markup.matchAll(/<([a-z][\w:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)]
    .map(match => ({ name: match[1].toLowerCase(), raw: match[0], attrs: attributes(match[0]) }));
}

export function srcsetUrls(value) {
  const urls = [];
  let remaining = value.trim();
  while (remaining) {
    remaining = remaining.replace(/^[\s,]+/, '');
    if (!remaining) break;
    const token = /^\S+/.exec(remaining)[0];
    const url = token.replace(/,+$/, '');
    urls.push(url);
    remaining = remaining.slice(token.length);
    if (!token.endsWith(',')) remaining = remaining.replace(/^[^,]*(?:,|$)/, '');
  }
  return urls;
}

export function cssUrls(css) {
  const active = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...active.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)|@import\s+["']([^"']+)["']/gi)]
    .map(match => match[1] ?? match[2] ?? match[3] ?? match[4]);
}

export function htmlUrls(html) {
  const urls = [];
  for (const { name, attrs } of tags(html)) {
    if (attrs.src) urls.push(attrs.src);
    if (attrs.poster) urls.push(attrs.poster);
    if (attrs.srcset) urls.push(...srcsetUrls(attrs.srcset));
    if (attrs.imagesrcset) urls.push(...srcsetUrls(attrs.imagesrcset));
    if (['link', 'image', 'use'].includes(name) && attrs.href) urls.push(attrs.href);
    if (['image', 'use'].includes(name) && attrs['xlink:href']) urls.push(attrs['xlink:href']);
    if (name === 'object' && attrs.data) urls.push(attrs.data);
    if (attrs.style) urls.push(...cssUrls(decodeEntities(attrs.style)));
  }
  const active = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  for (const match of active.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) urls.push(...cssUrls(match[1]));
  return [...new Set(urls)];
}

export function localFile(url, owner, root) {
  const decoded = decodeEntities(url.trim());
  if (!decoded || decoded.startsWith('#') || decoded.startsWith('//') || /^[a-z][\w+.-]*:/i.test(decoded)) return null;
  const pathname = decodeURIComponent(decoded.split(/[?#]/, 1)[0]);
  const file = pathname.startsWith('/') ? resolve(root, '.' + pathname) : resolve(owner, '..', pathname);
  assert.ok(file.startsWith(resolve(root) + sep), `${relative(root, owner)}: asset escapes output root: ${url}`);
  assert.ok(statSync(file, { throwIfNoEntry: false })?.isFile(), `${relative(root, owner)}: missing local asset ${url} (${file})`);
  return file;
}

// Identity is media type plus bytes, so a file and the data URL Vite may inline for it (small SVG logos) match.
const MEDIA_TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.woff2': 'font/woff2' };

export function resourceIdentity(url, owner, root) {
  if (/^data:/i.test(url)) {
    const match = /^data:([^,]*),(.*)$/s.exec(url);
    assert.ok(match, `Invalid inline asset in ${owner}`);
    const type = match[1].split(';')[0].toLowerCase();
    return `asset:${type}:${sha256(/;base64$/i.test(match[1]) ? Buffer.from(match[2], 'base64') : Buffer.from(decodeURIComponent(match[2])))}`;
  }
  const file = localFile(url, owner, root);
  if (!file) return url;
  const type = MEDIA_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  return `asset:${type}:${sha256(readFileSync(file))}${/[?#].*$/.exec(url)?.[0] ?? ''}`;
}

export function normalizeAssetRefs(html, owner, root) {
  // Match resources by bytes, not just basename: a wrong but existing image must fail parity.
  const normalizeCss = css => css.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi,
    (match, double, single, bare) => {
      const url = double ?? single ?? bare;
      return match.replace(url, resourceIdentity(decodeEntities(url), owner, root));
    });
  function normalizeTag(tag) {
    const name = /^<([\w:-]+)/.exec(tag)?.[1].toLowerCase();
    return tag.replace(/(\s)([\w:-]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
      (match, space, key, equals, double, single, bare) => {
        const value = double ?? single ?? bare;
        key = key.toLowerCase();
        let normalized = value;
        if (key === 'style') normalized = normalizeCss(value);
        else if (['srcset', 'imagesrcset'].includes(key)) {
          for (const url of srcsetUrls(value).sort((a, b) => b.length - a.length)) {
            normalized = normalized.split(url).join(resourceIdentity(url, owner, root));
          }
        } else if (['src', 'poster'].includes(key) || (key === 'data' && name === 'object')
          || (['href', 'xlink:href'].includes(key) && ['link', 'image', 'use'].includes(name))) {
          normalized = resourceIdentity(value, owner, root);
        }
        const quote = double !== undefined ? '"' : single !== undefined ? "'" : '';
        return space + key + equals + quote + normalized + quote;
      });
  }
  return html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[a-z][\w:-]*\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi, chunk => {
    if (chunk.startsWith('<!--')) return chunk;
    if (/^<script\b/i.test(chunk)) return chunk.replace(/^<script\b[^>]*>/i, normalizeTag);
    if (/^<style\b/i.test(chunk)) return chunk.replace(/^(<style\b[^>]*>)([\s\S]*)(<\/style>)$/i,
      // Normalize both sides with the installed CSS optimizer, after mapping URLs by bytes.
      // This preserves cascade semantics, not production whitespace or URL quote choices.
      (_, open, css, close) => open + transform({ code: Buffer.from(normalizeCss(css)), minify: true }).code.toString() + close);
    return normalizeTag(chunk);
  });
}