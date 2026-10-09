import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { compileTokens, loadIcons } from '../tools/lib/build-data.mjs';
import { ROOT, DIST, filesUnder, fileMap } from './lib/site-files.mjs';

function authoredFileMap() {
  const directories = ['concepts', 'brandkit', 'src', 'design-system/project', 'tools'];
  const files = [join(ROOT, 'index.html')];
  for (const directory of directories) {
    files.push(...filesUnder(join(ROOT, directory), file => {
      const path = relative(ROOT, file).split(sep).join('/');
      return path === 'src/generated' || /^tools\/(?:dist|exports|node_modules|\.cache)(?:\/|$)/.test(path);
    }));
  }
  return fileMap(files);
}

function assertSameFiles(before, after, label) {
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const changes = paths.filter(path => before[path] !== after[path]).map(path =>
    `${path}: ${!(path in before) ? 'added' : !(path in after) ? 'deleted' : 'contents changed'}`);
  assert.deepEqual(after, before, `${label}\n${changes.join('\n')}`);
}

function assertGeneratedData() {
  const tokens = JSON.parse(readFileSync(join(ROOT, 'design-system/project/tokens.json'), 'utf8'));
  assert.equal(readFileSync(join(ROOT, 'src/generated/tokens.css'), 'utf8'), compileTokens(tokens),
    'Generated CSS must match current authored tokens, not a stale build');
  const icons = readFileSync(join(ROOT, 'src/generated/icons.ts'), 'utf8');
  const record = /export const ICONS: Record<IconName, string> = (\{.*\});/s.exec(icons);
  assert.ok(record, 'Build must generate the typed icon record');
  assert.deepEqual(JSON.parse(record[1]), loadIcons(), 'Generated icons must match installed source SVGs');
}

test('actual production and design-system builds preserve every authored path and byte', async t => {
  const before = authoredFileMap();
  assert.ok(Object.keys(before).length > 7, 'Snapshot must include authored assets and tools, not only page entries');
  t.diagnostic(`Protecting ${Object.keys(before).length} authored files with SHA256 path/content maps`);
  let production;
  for (const script of ['build', 'build:ds']) {
    const result = spawnSync('npm', ['run', script], {
      cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
    });
    await t.test(`${script} exits successfully`, () => {
      assert.ifError(result.error);
      assert.equal(result.signal, null, `npm run ${script} terminated by ${result.signal}`);
      assert.equal(result.status, 0, `npm run ${script} failed\n${result.stdout}\n${result.stderr}`);
    });
    // Check even on a failed build: failure must not hide a destructive partial write.
    await t.test(`${script} neither adds, deletes nor changes authored files`, () => {
      assertSameFiles(before, authoredFileMap(), `npm run ${script} mutated authored files`);
    });
    await t.test(`${script} generates current tokens and icons`, assertGeneratedData);
    if (script === 'build' && result.status === 0) production = fileMap(filesUnder(DIST), DIST);
    if (script === 'build:ds' && production) {
      await t.test('standalone export leaves the entire production output unchanged', () => {
        assertSameFiles(production, fileMap(filesUnder(DIST), DIST), 'build:ds mutated dist/');
      });
    }
  }
});