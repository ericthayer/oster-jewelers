import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/behaviors/site.ts', import.meta.url))],
  bundle: true, write: false, format: 'iife', globalName: 'runtime', platform: 'browser',
});

function fixture({ reduced = false } = {}) {
  const cards = Array.from({ length: 4 }, () => ({}));
  const list = { children: cards, dataset: {} };
  const tweens = [];
  const context = {
    document: { readyState: 'loading', addEventListener() {} },
    window: {
      matchMedia: query => ({ matches: query === '(prefers-reduced-motion: reduce)' && reduced }),
      gsap: { registerPlugin() {}, to: (target, vars) => tweens.push({ target, vars }) },
      ScrollTrigger: {},
    },
  };
  runInNewContext(bundle.outputFiles[0].text, context);
  const root = { querySelectorAll: selector => selector === '[data-tpl-stack]' ? [list] : [] };
  return { cards, tweens, animate: () => context.runtime.motion(root) };
}

test('partner cards recede subtly without dimming their text or glass surfaces', () => {
  const f = fixture();
  f.animate();
  assert.equal(f.tweens.length, 3, 'The final card must remain unanimated');
  f.tweens.forEach(({ target, vars }, i) => {
    assert.equal(target, f.cards[i]);
    assert.equal(vars.scale, 0.965);
    assert.equal(vars.filter, undefined, 'Stacking must not reduce card brightness');
    assert.equal(vars.scrollTrigger.trigger, f.cards[i + 1]);
    assert.equal(vars.scrollTrigger.scrub, true);
  });
  f.animate();
  assert.equal(f.tweens.length, 3, 'Repeated initialization must not duplicate stack tweens');
});

test('reduced motion leaves the partner cards in their CSS-only state', () => {
  const f = fixture({ reduced: true });
  f.animate();
  assert.equal(f.tweens.length, 0);
});