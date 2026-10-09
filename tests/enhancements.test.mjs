import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

// Execute the actual TypeScript orchestration without loading the browser runtime
// or writing generated JavaScript. Only optional module loaders are replaced.
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/behaviors/enhancements.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external',
});
const { loadEnhancements } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

function fixture(t, { motion = true, scene = true, reduced = false } = {}) {
  const counts = { motion: 0, scene: 0, refresh: 0, start: 0, stop: 0, init: 0 };
  const imports = [];
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args));
  const fonts = Promise.withResolvers();
  const document = {
    querySelector(selector) {
      assert.ok(['[data-tpl-scene]', '[data-tpl-words], [data-tpl-magnetic], [data-tpl-stack], [data-tpl-rail]'].includes(selector));
      return (selector === '[data-tpl-scene]' ? scene : motion) ? {} : null;
    },
    fonts: { ready: fonts.promise },
  };
  const events = new EventTarget();
  const window = {
    matchMedia(query) {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return { matches: reduced };
    },
    addEventListener: events.addEventListener.bind(events),
  };
  const gsap = {};
  const ScrollTrigger = { refresh() { counts.refresh++; } };
  const THREE = {};
  const api = {
    init() { counts.init++; },
    motion() {
      assert.equal(window.gsap, gsap);
      assert.equal(window.ScrollTrigger, ScrollTrigger);
      counts.motion++;
    },
    scene: {
      mountAll(module) {
        assert.equal(module, THREE);
        counts.scene++;
        return [null, { start() { counts.start++; }, stop() { counts.stop++; } }];
      },
    },
  };
  const loaders = {
    gsap: async () => { imports.push('gsap'); return { gsap }; },
    scrollTrigger: async () => { imports.push('scrollTrigger'); return { ScrollTrigger }; },
    three: async () => { imports.push('three'); return THREE; },
  };
  return { document, window, api, loaders, counts, imports, errors, events, fonts,
    load: () => loadEnhancements(document, window, api, loaders) };
}

for (const dependency of ['gsap', 'scrollTrigger']) {
  test(`${dependency} import failure still mounts the independent scene and identifies motion`, async t => {
    const f = fixture(t);
    const failure = new Error(`${dependency} chunk unavailable`);
    f.loaders[dependency] = async () => { throw failure; };
    const result = await Promise.allSettled([f.load()]);
    assert.equal(f.counts.scene, 1, 'Motion failure must not prevent scene mounting');
    assert.equal(f.counts.motion, 0);
    assert.equal(f.counts.init, 0, 'Runtime auto-init must not be repeated');
    assert.equal(result[0].status, 'fulfilled');
    assert.equal(f.errors.length, 1);
    assert.match(f.errors[0][0], /motion/i);
    assert.equal(f.errors[0][1], failure);
    f.events.dispatchEvent(new Event('pagehide'));
    f.events.dispatchEvent(new Event('pageshow'));
    assert.equal(f.counts.stop, 1);
    assert.equal(f.counts.start, 1);
  });
}

test('three import failure preserves motion and identifies scene', async t => {
  const f = fixture(t);
  const failure = new Error('three chunk unavailable');
  f.loaders.three = async () => { throw failure; };
  const result = await Promise.allSettled([f.load()]);
  assert.equal(f.counts.motion, 1);
  assert.equal(f.counts.scene, 0);
  assert.equal(result[0].status, 'fulfilled');
  assert.equal(f.errors.length, 1);
  assert.match(f.errors[0][0], /scene/i);
  assert.equal(f.errors[0][1], failure);
});

test('hub without optional hooks loads no chunks', async t => {
  const f = fixture(t, { motion: false, scene: false });
  f.window.matchMedia = () => { assert.fail('Hub does not need a motion preference query'); };
  await f.load();
  assert.deepEqual(f.imports, []);
  assert.equal(f.counts.motion, 0);
  assert.equal(f.counts.scene, 0);
  assert.equal(f.counts.init, 0);
  assert.deepEqual(f.errors, []);
});

test('reduced motion skips GSAP but still mounts one THREE scene', async t => {
  const f = fixture(t, { reduced: true });
  await f.load();
  assert.deepEqual(f.imports, ['three']);
  assert.equal(f.counts.motion, 0);
  assert.equal(f.counts.scene, 1);
  assert.equal(f.counts.refresh, 0);
  assert.deepEqual(f.errors, []);
});

test('successful motion waits for font metrics to refresh and scene lifecycle tolerates null handles', async t => {
  const f = fixture(t);
  await f.load();
  assert.deepEqual(f.imports, ['gsap', 'scrollTrigger', 'three']);
  assert.equal(f.counts.motion, 1);
  assert.equal(f.counts.scene, 1);
  assert.equal(f.counts.refresh, 0);
  assert.equal(f.counts.init, 0);
  f.fonts.resolve();
  await f.document.fonts.ready;
  assert.equal(f.counts.refresh, 1);
  f.events.dispatchEvent(new Event('pagehide'));
  f.events.dispatchEvent(new Event('pageshow'));
  assert.equal(f.counts.stop, 1);
  assert.equal(f.counts.start, 1);
  assert.deepEqual(f.errors, []);
});

test('scene starts while motion imports are pending', async t => {
  const f = fixture(t);
  const pending = Promise.withResolvers();
  const original = f.loaders.gsap;
  f.loaders.gsap = () => pending.promise;
  const loading = f.load();
  try {
    // Drain promise jobs deterministically, without timers or a race timeout.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.counts.scene, 1, 'Scene must mount before the motion chunk resolves');
    assert.equal(f.counts.motion, 0);
  } finally {
    pending.resolve(await original());
    await loading;
  }
  assert.equal(f.counts.motion, 1);
});

test('motion starts while the scene import is pending', async t => {
  const f = fixture(t);
  const pending = Promise.withResolvers();
  const original = f.loaders.three;
  f.loaders.three = () => pending.promise;
  const loading = f.load();
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.counts.motion, 1);
    assert.equal(f.counts.scene, 0);
  } finally {
    pending.resolve(await original());
    await loading;
  }
  assert.equal(f.counts.scene, 1);
});

for (const feature of ['motion', 'scene']) {
  test(`${feature}-only hooks load only their own dependencies`, async t => {
    const f = fixture(t, { motion: feature === 'motion', scene: feature === 'scene' });
    await f.load();
    assert.deepEqual(f.imports, feature === 'motion' ? ['gsap', 'scrollTrigger'] : ['three']);
    assert.equal(f.counts[feature], 1);
    assert.deepEqual(f.errors, []);
  });

  test(`${feature} initialization exceptions do not block the other feature`, async t => {
    const f = fixture(t);
    const failure = new Error(`${feature} initialization failed`);
    if (feature === 'motion') f.api.motion = () => { throw failure; };
    else f.api.scene.mountAll = () => { throw failure; };
    await f.load();
    assert.equal(f.counts[feature === 'motion' ? 'scene' : 'motion'], 1);
    assert.equal(f.errors.length, 1);
    assert.match(f.errors[0][0], new RegExp(feature, 'i'));
    assert.equal(f.errors[0][1], failure);
  });
}

test('synchronous loader failures are isolated and both features report their own error', async t => {
  const f = fixture(t);
  const motionError = new Error('motion loader failed');
  const sceneError = new Error('scene loader failed');
  f.loaders.gsap = () => { throw motionError; };
  f.loaders.three = () => { throw sceneError; };
  await f.load();
  assert.equal(f.counts.motion, 0);
  assert.equal(f.counts.scene, 0);
  assert.equal(f.errors.length, 2);
  assert.match(f.errors[0][0], /motion/i);
  assert.equal(f.errors[0][1], motionError);
  assert.match(f.errors[1][0], /scene/i);
  assert.equal(f.errors[1][1], sceneError);
});

for (const source of ['fonts', 'refresh']) {
  test(`${source} failure is reported as motion without an unhandled rejection`, async t => {
    const f = fixture(t);
    const failure = new Error(`${source} unavailable`);
    if (source === 'refresh') {
      f.loaders.scrollTrigger = async () => ({ ScrollTrigger: {
        refresh() { throw failure; },
      } });
      // This test intentionally injects a different plugin, so assert via state instead.
      f.api.motion = () => { f.counts.motion++; };
    }
    await f.load();
    if (source === 'fonts') f.fonts.reject(failure);
    else f.fonts.resolve();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.counts.motion, 1);
    assert.equal(f.counts.scene, 1);
    assert.equal(f.errors.length, 1);
    assert.match(f.errors[0][0], /motion/i);
    assert.equal(f.errors[0][1], failure);
  });
}

// Bundle the real browser entry and runtime too. Optional imports are controlled
// at the module boundary; native runtime auto-init is not replaced or duplicated.
const entryBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/main.ts', import.meta.url))],
  bundle: true, write: false, format: 'iife', platform: 'browser',
  loader: { '.css': 'empty' },
  plugins: [{
    name: 'controlled-optional-chunks',
    setup(builder) {
      builder.onResolve({ filter: /^(gsap(?:\/ScrollTrigger)?|three)$/ }, args => ({ path: args.path, namespace: 'optional' }));
      builder.onLoad({ filter: /.*/, namespace: 'optional' }, args => ({
        contents: `window.optionalLoads.push(${JSON.stringify(args.path)}); throw new Error('deliberate optional failure');`,
        loader: 'js',
      }));
    },
  }],
});

for (const readyState of ['loading', 'complete']) {
  test(`main preserves native auto-init exactly once with document ${readyState}`, async () => {
    const events = new EventTarget();
    const years = [];
    const year = { set textContent(value) { years.push(value); } };
    const errors = [];
    const window = { optionalLoads: [], matchMedia: () => ({ matches: false }) };
    const document = {
      readyState,
      addEventListener: events.addEventListener.bind(events),
      querySelector: selector => selector.includes('data-tpl-words') || selector === '[data-tpl-scene]' ? {} : null,
      querySelectorAll: selector => selector === '[data-tpl-year]' ? [year] : [],
    };
    runInNewContext(entryBundle.outputFiles[0].text, { document, window, console: { error: (...args) => errors.push(args) } });
    assert.ok(window.SiteDS, 'The actual native runtime must be imported');
    assert.deepEqual(window.optionalLoads, [], 'Native initialization is not gated on optional imports');
    assert.equal(years.length, readyState === 'loading' ? 0 : 1);
    events.dispatchEvent(new Event('DOMContentLoaded'));
    assert.equal(years.length, 1, 'Native behavior runs immediately at DOM ready');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual([...window.optionalLoads].sort(), ['gsap', 'gsap/ScrollTrigger', 'three'].sort());
    assert.equal(errors.length, 2);
    assert.ok(errors.some(([message]) => /motion/i.test(message)));
    assert.ok(errors.some(([message]) => /scene/i.test(message)));
    events.dispatchEvent(new Event('DOMContentLoaded'));
    assert.equal(years.length, 1, 'Enhancement loading must not duplicate native init');
  });
}