import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileTokens, loadIcons } from '../tools/lib/build-data.mjs';

const tokens = JSON.parse(readFileSync(new URL('../design-system/project/tokens.json', import.meta.url), 'utf8'));

test('tokens preserve all four themes, aliases, typography and self-hosted fonts', () => {
  const css = compileTokens(tokens, '../fonts/');
  for (const theme of tokens.color.themes) assert.ok(css.includes(`[data-theme="${theme.id}"]`));
  assert.ok(css.includes('--brand-accent: #e87722;'));
  assert.ok(css.includes('--surface: var(--neutral-950);'));
  assert.ok(css.includes('.wide-label {'));
  assert.ok(css.includes('url("../fonts/montserrat-latin-wght-normal.woff2")'));
  assert.ok(css.includes('font-display: swap;'));
});

test('every documented icon exists and contains SVG inner markup only', () => {
  const icons = loadIcons();
  const names = [...readFileSync(new URL('../src/types/index.d.ts', import.meta.url), 'utf8')
    .split('export type IconName =')[1].split(';')[0].matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(Object.keys(icons).sort(), names.sort());
  for (const svg of Object.values(icons)) {
    assert.match(svg, /<(path|circle|rect|ellipse|polyline|line)/);
    assert.doesNotMatch(svg, /<svg|<script|onload=/i);
  }
});

test('design-system export does not regenerate directly editable app pages', () => {
  const builder = readFileSync(new URL('../tools/build.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(builder, /src\/pages/);
  assert.doesNotMatch(builder, /write\(\s*out\s*,\s*processHtml/);
});