import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { build, createServer, loadConfigFromFile } from 'vite';
import { ROOT, TOKEN_FILE, compileTokens, loadIcons } from '../tools/lib/build-data.mjs';

async function projectConfig(command) {
  const loaded = await loadConfigFromFile({ command, mode: command === 'build' ? 'production' : 'development' },
    join(ROOT, 'vite.config.ts'));
  assert.ok(loaded, 'Vite must load the actual TypeScript configuration');
  return { ...loaded.config, root: ROOT, configFile: false, logLevel: 'silent' };
}

// Prevent the old closeBundle bug from writing shared dist/ during RED runs.
// Successful production copies still use the real filesystem inside this test's temp directory.
function isolateCopies(t, directory) {
  const copies = [];
  const copy = fs.cpSync;
  t.mock.method(fs, 'cpSync', (source, destination, options) => {
    copies.push({ source, destination });
    if (directory && resolve(destination).startsWith(directory + sep)) copy(source, destination, options);
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  return copies;
}

function temporaryOutput(t) {
  const directory = fs.mkdtempSync(join(tmpdir(), 'template-vite-lifecycle-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('token hot update refreshes every real cached generated module before reload and before watcher events', async t => {
  isolateCopies(t);
  const config = await projectConfig('serve');
  const generated = ['tokens.css', 'icons.ts'].map(file => join(ROOT, 'src/generated', file));
  let revision = 1;
  const fixture = {
    name: 'in-memory-generated-data', enforce: 'pre',
    load(id) {
      const file = id.split('?')[0];
      if (file === generated[0]) return `.lifecycle-token { --revision: ${revision}; }`;
      if (file === generated[1]) return `export const revision = ${revision};`;
    },
  };
  const server = await createServer({ ...config, plugins: [...config.plugins, fixture],
    server: { middlewareMode: true, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const urls = ['/src/generated/tokens.css', '/src/generated/tokens.css?direct',
      '/src/generated/icons.ts', '/src/generated/icons.ts?fixture'];
    for (const url of urls) assert.match((await server.transformRequest(url)).code, /revision(?::| =) 1/);
    const modules = generated.flatMap(file => [...server.moduleGraph.getModulesByFile(file)]);
    assert.equal(modules.length, urls.length, 'Exercise multiple served modules for each generated file');
    assert.ok(modules.every(module => module.transformResult), 'Prime actual Vite transform caches');
    const invalidated = [];
    const invalidate = server.moduleGraph.invalidateModule.bind(server.moduleGraph);
    t.mock.method(server.moduleGraph, 'invalidateModule', (...args) => {
      invalidated.push(args[0]);
      return invalidate(...args);
    });
    const reloads = [];
    t.mock.method(server.ws, 'send', message => {
      reloads.push({ message, cachesCleared: modules.every(module => module.transformResult === null) });
    });
    const plugin = server.config.plugins.find(plugin => plugin.name === 'project-data');
    const hook = typeof plugin.handleHotUpdate === 'function' ? plugin.handleHotUpdate : plugin.handleHotUpdate.handler;
    const context = { file: TOKEN_FILE, server, modules: [], timestamp: Date.now(),
      read: () => fs.readFileSync(TOKEN_FILE, 'utf8') };
    assert.equal(await hook({ ...context, file: join(ROOT, 'src/css/base.css') }), undefined);
    assert.equal(invalidated.length, 0);
    assert.equal(reloads.length, 0);
    // Only the generation boundary is in-memory; cache lookup, invalidation and requests are real Vite.
    // No authored/generated file is edited, and the watcher is disabled throughout.
    revision = 2;
    assert.deepEqual(await hook(context), []);
    for (const url of urls) {
      assert.match((await server.transformRequest(url)).code, /revision(?::| =) 2/,
        `${url} must return fresh data immediately after the token hook`);
    }
    assert.ok(modules.every(module => invalidated.includes(module)), 'Invalidate every module for both generated files');
    assert.deepEqual(reloads, [{ message: { type: 'full-reload' }, cachesCleared: true }]);
  } finally { await server.close(); }
});

test('cold dev startup prepares current tokens and icons without copying files on restart or shutdown', async t => {
  const copies = isolateCopies(t);
  const config = await projectConfig('serve');
  const server = await createServer({ ...config, server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    assert.equal(fs.readFileSync(join(ROOT, 'src/generated/tokens.css'), 'utf8'), compileTokens(tokens));
    const icons = fs.readFileSync(join(ROOT, 'src/generated/icons.ts'), 'utf8');
    assert.deepEqual(JSON.parse(/export const ICONS: Record<IconName, string> = (\{.*\});/s.exec(icons)[1]), loadIcons());
    assert.ok(await server.transformRequest('/src/generated/tokens.css'));
    await server.restart();
  } finally { await server.close(); }
  assert.deepEqual(copies, [], 'Dev restart and shutdown must never copy files');
});

test('failed and non-writing production builds never copy files or write output', async t => {
  const directory = temporaryOutput(t);
  const copies = isolateCopies(t, directory);
  const config = await projectConfig('build');
  const buildOptions = { ...config.build, outDir: join(directory, 'not-written'),
    rolldownOptions: { input: join(ROOT, 'index.html') } };
  await assert.rejects(build({ ...config, build: buildOptions, plugins: [...config.plugins,
    { name: 'deliberate-build-failure', buildStart() { throw new Error('lifecycle build failure'); } }] }),
  /lifecycle build failure/);
  assert.deepEqual(copies, [], 'A failed build must not copy files from closeBundle');
  await build({ ...config, build: { ...buildOptions, write: false } });
  assert.deepEqual(copies, [], 'Generating a bundle without writing output must not copy files');
  assert.equal(fs.existsSync(buildOptions.outDir), false);
});