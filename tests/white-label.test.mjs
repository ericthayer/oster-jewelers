import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { parseArgs, rewrite, rewriteTokens, run } from '../tools/white-label.mjs';
import { ROOT, filesUnder } from './lib/site-files.mjs';

const plan = { fromPrefix: 'tpl', toPrefix: 'ac', fromNamespace: 'SiteDS', toNamespace: 'AcmeDS', concepts: { cinematic: 'harbor-line' } };

test('prefix rename keeps word boundaries and covers classes, hooks, dataset keys and regex sources', () => {
  assert.equal(rewrite('<a class="tpl-btn tpl-btn--primary" data-tpl-magnetic>', plan), '<a class="ac-btn ac-btn--primary" data-ac-magnetic>');
  assert.equal(rewrite('el.dataset.tplSheet; /class="[^"]*\\btpl-eyebrow\\b/', plan), 'el.dataset.acSheet; /class="[^"]*\\bac-eyebrow\\b/');
  assert.equal(rewrite('template-literal atpl-x stpl-y', plan), 'template-literal atpl-x stpl-y');
  assert.equal(rewrite('window.SiteDS = api as SiteDSApi; SiteDSX', plan), 'window.AcmeDS = api as AcmeDSApi; SiteDSX');
});

test('concept slugs change only in theme, path and union contexts, never in variant classes', () => {
  const html = '<html data-theme="cinematic"><div data-for-theme="cinematic engineered"><section class="tpl-hero tpl-hero--cinematic">'
    + '<a href="cinematic/index.html">x</a><a href="../concepts/cinematic/index.html"{{current:cinematic}}>y</a>';
  assert.equal(rewrite(html, plan), '<html data-theme="harbor-line"><div data-for-theme="harbor-line engineered"><section class="ac-hero ac-hero--cinematic">'
    + '<a href="harbor-line/index.html">x</a><a href="../concepts/harbor-line/index.html"{{current:harbor-line}}>y</a>');
  assert.equal(rewrite('[data-theme="cinematic"] { --notch: 14px; }', plan), '[data-theme="harbor-line"] { --notch: 14px; }');
  assert.equal(rewrite("export type Theme = 'cinematic' | 'engineered';\nvariant: 'cinematic' | 'split';", plan),
    "export type Theme = 'harbor-line' | 'engineered';\nvariant: 'cinematic' | 'split';");
  assert.equal(rewrite('<!-- @include brandkit/board-cinematic.html --> CinematicBoard', plan), '<!-- @include brandkit/board-harbor-line.html --> HarborLineBoard');
});

test('token rename moves the theme id and every per-theme value key', () => {
  const tokens = { color: { themes: [{ id: 'cinematic', name: 'Cinematic' }], tokens: [{ name: 'surface', value: { cinematic: '#000', engineered: '#fff' } }] },
    radius: { tokens: [{ name: 'radius-xs', value: '2px' }] } };
  const out = rewriteTokens(tokens, { cinematic: 'harbor-line' });
  assert.equal(out.color.themes[0].id, 'harbor-line');
  assert.deepEqual(out.color.tokens[0].value, { 'harbor-line': '#000', engineered: '#fff' });
  assert.equal(out.radius.tokens[0].value, '2px');
});

test('arguments are validated before any file is touched', () => {
  assert.throws(() => parseArgs(['--prefix', 'Bad']), /--prefix/);
  assert.throws(() => parseArgs(['--namespace', 'Acme']), /--namespace/);
  assert.throws(() => parseArgs(['--concept', 'cinematic']), /--concept/);
  assert.throws(() => run(ROOT, parseArgs(['--concept', 'missing=x'])), /not a theme/);
  assert.deepEqual(run(ROOT, parseArgs(['--prefix', 'ac'])).changed.length > 0, true, 'Dry run must report files');
});

test('applied rename on a copy leaves no template tokens and still typechecks', { timeout: 120_000 }, t => {
  const copy = mkdtempSync(join(tmpdir(), 'white-label-'));
  t.after(() => rmSync(copy, { recursive: true, force: true }));
  const skip = new Set(['node_modules', 'dist', 'exports', 'generated', '.git']);
  cpSync(ROOT, copy, { recursive: true, filter: source => !skip.has(source.split(sep).at(-1)) });
  symlinkSync(join(ROOT, 'node_modules'), join(copy, 'node_modules'), 'dir');
  const result = run(copy, parseArgs(['--prefix', 'ac', '--namespace', 'AcmeDS', '--concept', 'cinematic=harbor-line', '--apply']));
  assert.ok(result.changed.length > 20, 'Rename must reach pages, CSS, behaviors, types and tests');
  assert.ok(existsSync(join(copy, 'concepts/harbor-line/index.html')), 'Concept folder must move');
  assert.ok(existsSync(join(copy, 'src/ds/components/HarborLineBoard/preview.html')), 'Board preview must move');
  const leftovers = filesUnder(copy, file => skip.has(file.split(sep).at(-1)))
    .filter(file => /\.(html|css|ts|mjs|json)$/.test(file) && !file.endsWith('white-label.mjs') && !file.endsWith('white-label.test.mjs'))
    .filter(file => /(?<![A-Za-z0-9_])tpl-|\bSiteDS\b|data-theme="cinematic"|concepts\/cinematic\//.test(readFileSync(file, 'utf8')))
    .map(file => relative(copy, file));
  assert.deepEqual(leftovers, [], 'No template prefix, namespace or old slug may remain');
  for (const [script, args] of [['prepare', ['tools/prepare.mjs']], ['tsc', ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.json']]]) {
    const out = spawnSync(process.execPath, args, { cwd: copy, encoding: 'utf8' });
    assert.equal(out.status, 0, `${script} failed after rename\n${out.stdout}\n${out.stderr}`);
  }
});
