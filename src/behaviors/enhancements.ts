import type { SiteDSApi } from '../types/index';

interface EnhancementLoaders {
  gsap(): Promise<Pick<typeof import('gsap'), 'gsap'>>;
  scrollTrigger(): Promise<Pick<typeof import('gsap/ScrollTrigger'), 'ScrollTrigger'>>;
  three(): Promise<typeof import('three')>;
}

const defaultLoaders: EnhancementLoaders = {
  gsap: () => import('gsap'),
  scrollTrigger: () => import('gsap/ScrollTrigger'),
  three: () => import('three'),
};

export async function loadEnhancements(
  document: Document,
  window: Window,
  api: Pick<SiteDSApi, 'motion' | 'scene'>,
  loaders: EnhancementLoaders = defaultLoaders,
): Promise<void> {
  const reportMotionError = (error: unknown): void => {
    console.error('Could not load optional motion enhancements.', error);
  };
  async function loadMotion(): Promise<void> {
    try {
      const wantsMotion = document.querySelector('[data-tpl-words], [data-tpl-magnetic], [data-tpl-stack], [data-tpl-rail]');
      if (!wantsMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([loaders.gsap(), loaders.scrollTrigger()]);
      window.gsap = gsap;
      window.ScrollTrigger = ScrollTrigger;
      api.motion();
      // Font metrics affect the pinned rail's scroll distance.
      void document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(reportMotionError);
    } catch (error: unknown) {
      reportMotionError(error);
    }
  }
  async function loadScene(): Promise<void> {
    try {
      if (!document.querySelector('[data-tpl-scene]')) return;
      const THREE = await loaders.three();
      const scenes = api.scene.mountAll(THREE);
      window.addEventListener('pagehide', () => scenes.forEach(scene => scene?.stop()));
      window.addEventListener('pageshow', () => scenes.forEach(scene => scene?.start()));
    } catch (error: unknown) {
      console.error('Could not load optional scene enhancements.', error);
    }
  }
  // Neither optional feature depends on the other's download or initialization.
  await Promise.allSettled([loadMotion(), loadScene()]);
}