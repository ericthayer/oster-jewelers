// Site behaviors. Hooks are data-tpl-* attributes.
// Only static icon data is imported at runtime; optional animation libraries are injected.
import { ICONS } from '../generated/icons';
import type { IconName, SiteDSApi, JobPosting, StrandSceneOptions } from '../types/index';
import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger';
import type * as Three from 'three';

type ThreeModule = typeof import('three');
type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
interface FieldError { host: HTMLElement; control: FormControl }
interface SheetHandle { open(tile: HTMLElement, link: HTMLAnchorElement): void; close(): void }
interface SheetHost extends HTMLElement { tplSheet?: SheetHandle }
interface SceneHandle {
  renderer: Three.WebGLRenderer;
  scene: Three.Scene;
  camera: Three.PerspectiveCamera;
  start(): void;
  stop(): void;
  dispose(): void;
}

declare global {
  interface Window {
    gsap?: typeof Gsap;
    ScrollTrigger?: typeof ScrollTriggerPlugin;
  }
}

const doc = document;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => entities[c] ?? c);
}
export function safeUrl(url: unknown): string {
  return /^https?:\/\//i.test(String(url || '')) ? String(url) : '#';
}
function once(el: HTMLElement, key: string): boolean {
  const flag = 'tplReady' + key;
  if (el.dataset[flag]) return false;
  el.dataset[flag] = '1';
  return true;
}
function isIconName(name: string | null): name is IconName {
  return name !== null && Object.prototype.hasOwnProperty.call(ICONS, name);
}

// ---------------------------------------------------------------- icons
export function icon(name: IconName, opts: { label?: string; className?: string } = {}): string {
  const inner = ICONS[name];
  if (!inner) return '';
  const a11y = opts.label
    ? ' role="img" aria-label="' + escapeHtml(opts.label) + '"'
    : ' aria-hidden="true" focusable="false"';
  return '<svg class="tpl-icon' + (opts.className ? ' ' + opts.className : '') + '" viewBox="0 0 24 24" fill="none"'
    + ' stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"' + a11y + '>' + inner + '</svg>';
}
export function hydrateIcons(root: ParentNode = doc): void {
  root.querySelectorAll<SVGSVGElement>('svg[data-tpl-icon]').forEach(el => {
    if (el.childElementCount) return;
    const name = el.getAttribute('data-tpl-icon');
    if (!isIconName(name)) return;
    const inner = ICONS[name];
    if (!inner) return;
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    if (!el.hasAttribute('aria-label')) { el.setAttribute('aria-hidden', 'true'); el.setAttribute('focusable', 'false'); }
    el.innerHTML = inner;
  });
}

// ---------------------------------------------------------------- header: stuck state from a sentinel
export function header(root: ParentNode = doc): void {
  const el = root.querySelector<HTMLElement>('[data-tpl-header]');
  if (!el || !once(el, 'Header') || !('IntersectionObserver' in window)) return;
  const offset = parseInt(el.getAttribute('data-tpl-header-offset') || '8', 10);
  const sentinel = doc.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:' + offset + 'px;pointer-events:none;';
  doc.body.insertBefore(sentinel, doc.body.firstChild);
  new IntersectionObserver(entries => {
    const entry = entries[0];
    if (entry) el.classList.toggle('is-stuck', !entry.isIntersecting);
  }).observe(sentinel);
}

// ---------------------------------------------------------------- mobile nav drawer: focus trap, Esc, backdrop
export function nav(root: ParentNode = doc): void {
  root.querySelectorAll<HTMLElement>('[data-tpl-nav-toggle]').forEach(navOne);
}
function navOne(toggle: HTMLElement): void {
  const candidate = doc.getElementById(toggle.getAttribute('aria-controls') || '') || doc.querySelector<HTMLElement>('[data-tpl-drawer]');
  if (!candidate || !once(toggle, 'Nav')) return;
  const drawer = candidate;
  let lastFocus: HTMLElement | SVGElement | null = null;
  const desktop = window.matchMedia('(min-width: 1024px)');
  function focusables(): HTMLElement[] {
    return Array.from(drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]'))
      .filter(n => n.getAttribute('tabindex') !== '-1' && n.offsetParent !== null);
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    const first = f[0];
    const last = f[f.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function open(): void {
    const active = doc.activeElement;
    lastFocus = active instanceof HTMLElement || active instanceof SVGElement ? active : null;
    drawer.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    doc.documentElement.style.overflow = 'hidden';
    const closeBtn = drawer.querySelector<HTMLButtonElement>('button[data-tpl-drawer-close]:not([tabindex="-1"])');
    (closeBtn || focusables()[0] || drawer).focus();
    doc.addEventListener('keydown', onKey);
  }
  function close(): void {
    if (drawer.hidden) return;
    drawer.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    doc.documentElement.style.overflow = '';
    doc.removeEventListener('keydown', onKey);
    lastFocus?.focus();
  }
  toggle.addEventListener('click', () => { if (drawer.hidden) open(); else close(); });
  drawer.addEventListener('click', e => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('[data-tpl-drawer-close]') || e.target.closest('a[href^="#"]')) close();
  });
  const onChange = (e: MediaQueryListEvent): void => { if (e.matches) close(); };
  if (desktop.addEventListener) desktop.addEventListener('change', onChange); else desktop.addListener(onChange);
}

// ---------------------------------------------------------------- marquee pause control (WCAG 2.2.2)
export function marquee(root: ParentNode = doc): void {
  root.querySelectorAll<HTMLElement>('[data-tpl-marquee]').forEach(m => {
    const btn = m.querySelector<HTMLButtonElement>('[data-tpl-marquee-toggle]');
    if (!btn || !once(m, 'Marquee')) return;
    const label = btn.querySelector<HTMLElement>('[data-tpl-label]');
    btn.addEventListener('click', () => {
      const paused = m.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', String(paused));
      if (label) label.textContent = paused ? 'Play' : 'Pause';
    });
  });
}

// ---------------------------------------------------------------- forms: inline errors + error summary, demo success
function labelFor(control: FormControl): string {
  const field = control.closest<HTMLElement>('.tpl-field, .tpl-fieldset');
  const label = field?.querySelector<HTMLElement>('.tpl-field__label, .tpl-fieldset__legend');
  return label ? (label.childNodes[0]?.textContent ?? '').trim() : (control.name || 'this field');
}
function messageFor(control: FormControl): string {
  const custom = control.getAttribute('data-tpl-error');
  if (custom) return custom;
  const v = control.validity;
  const label = labelFor(control);
  if (v.valueMissing) {
    if (control.type === 'file') return 'Attach ' + label.toLowerCase();
    if (control.type === 'checkbox' || control.type === 'radio' || control.tagName === 'SELECT') return 'Choose ' + label.toLowerCase();
    return 'Enter ' + label.toLowerCase();
  }
  if (v.typeMismatch && control.type === 'email') return 'Enter an email address like name@company.com';
  if (v.patternMismatch && control.type === 'tel') return 'Enter a phone number like (555) 010-0100';
  if (v.tooShort && !(control instanceof HTMLSelectElement)) return label + ' must be at least ' + control.minLength + ' characters';
  return 'Check ' + label.toLowerCase();
}
function setError(host: HTMLElement, control: FormControl, message: string): void {
  let err = host.querySelector<HTMLParagraphElement>(':scope > .tpl-field__error');
  const errId = (control.id || control.name) + '-error';
  if (!message) {
    host.classList.remove('is-invalid');
    control.removeAttribute('aria-invalid');
    err?.remove();
    control.setAttribute('aria-describedby', (control.getAttribute('aria-describedby') || '').replace(errId, '').trim());
    if (!control.getAttribute('aria-describedby')) control.removeAttribute('aria-describedby');
    return;
  }
  if (!err) {
    err = doc.createElement('p');
    err.className = 'tpl-field__error';
    err.id = errId;
    const anchor = host.querySelector<HTMLElement>('.tpl-select-wrap, .tpl-choices') || control;
    anchor.insertAdjacentElement('afterend', err);
  }
  err.innerHTML = icon('alert-circle') + '<span><span class="tpl-visually-hidden">Error: </span>' + escapeHtml(message) + '</span>';
  host.classList.add('is-invalid');
  control.setAttribute('aria-invalid', 'true');
  const described = (control.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
  if (described.indexOf(errId) === -1) described.push(errId);
  control.setAttribute('aria-describedby', described.join(' '));
}
function validate(host: HTMLElement): FieldError | null {
  const control = host.querySelector<FormControl>('input, select, textarea');
  if (!control) return null;
  if (host.classList.contains('tpl-fieldset')) {
    const boxes = host.querySelectorAll<HTMLInputElement>('input');
    const first = boxes[0];
    if (!first) return null;
    const needs = host.hasAttribute('data-tpl-required');
    const checked = Array.from(boxes).some(b => b.checked);
    const bad = needs && !checked;
    setError(host, first, bad ? (host.getAttribute('data-tpl-error') || 'Choose at least one ' + labelFor(first).toLowerCase()) : '');
    return bad ? { host, control: first } : null;
  }
  const ok = control.checkValidity();
  setError(host, control, ok ? '' : messageFor(control));
  return ok ? null : { host, control };
}
export function forms(root: ParentNode = doc): void {
  root.querySelectorAll<HTMLFormElement>('form[data-tpl-form]').forEach(form => {
    if (!once(form, 'Form')) return;
    form.setAttribute('novalidate', '');
    const summary = form.querySelector<HTMLElement>('[data-tpl-error-summary]');
    const success = form.parentElement?.querySelector<HTMLElement>('[data-tpl-success]');
    const hosts = (): NodeListOf<HTMLElement> => form.querySelectorAll<HTMLElement>('.tpl-field, .tpl-fieldset[data-tpl-required]');
    form.addEventListener('submit', e => {
      const errors: FieldError[] = [];
      hosts().forEach(h => { const r = validate(h); if (r) errors.push(r); });
      if (errors.length) {
        e.preventDefault();
        if (summary) {
          const list = summary.querySelector<HTMLElement>('[data-tpl-error-list]');
          if (list) list.innerHTML = errors.map(r => {
            const text = r.host.querySelector<HTMLElement>('.tpl-field__error')?.textContent || '';
            return '<li><a href="#' + escapeHtml(r.control.id) + '">' + escapeHtml(text.trim().replace(/^Error:\s*/, '')) + '</a></li>';
          }).join('');
          summary.hidden = false;
          summary.focus();
        } else {
          errors[0]?.control.focus();
        }
        return;
      }
      if (summary) summary.hidden = true;
      if (form.hasAttribute('data-tpl-demo')) {
        e.preventDefault();
        const btn = form.querySelector<HTMLElement>('[type="submit"]');
        if (btn) btn.setAttribute('aria-busy', 'true');
        window.setTimeout(() => {
          btn?.removeAttribute('aria-busy');
          if (success) { form.hidden = true; success.hidden = false; success.focus(); }
        }, 600);
      }
    });
    summary?.addEventListener('click', e => {
      if (!(e.target instanceof Element)) return;
      const link = e.target.closest<HTMLAnchorElement>('a[href^="#"]');
      const href = link?.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      const target = doc.getElementById(href.slice(1));
      if (target) { target.focus(); target.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' }); }
    });
    const recheck = (e: Event): void => {
      if (!(e.target instanceof Element)) return;
      const host = e.target.closest<HTMLElement>('.tpl-field, .tpl-fieldset');
      if (host?.classList.contains('is-invalid')) validate(host);
      if (e.target instanceof HTMLInputElement && e.target.type === 'file') {
        const hint = host?.querySelector<HTMLElement>('[data-tpl-file-names]');
        if (hint) hint.textContent = Array.from(e.target.files ?? []).map(f => f.name).join(', ') || hint.getAttribute('data-tpl-file-names');
      }
    };
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);
  });
}

// ---------------------------------------------------------------- jobs: job feed (Paylocity Recruiting shape) -> job rows
export function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function jobString(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error('Invalid job field');
  return value;
}
function normalizeJob(value: unknown): JobPosting {
  if (!isRecord(value)) throw new Error('Invalid job posting');
  // The old feed renderer did not require IDs, supported DisplayUrl-only postings,
  // and treated null metadata as absent. Normalize those cases at the JSON boundary.
  const job: JobPosting = {
    JobId: typeof value.JobId === 'string' ? value.JobId : '',
    Title: jobString(value.Title),
    ApplyUrl: jobString(value.ApplyUrl),
    DisplayUrl: jobString(value.DisplayUrl),
    PublishedDate: jobString(value.PublishedDate),
    HiringDepartment: jobString(value.HiringDepartment),
  };
  if (value.JobLocation != null) {
    if (!isRecord(value.JobLocation)) throw new Error('Invalid job location');
    job.JobLocation = {
      Name: jobString(value.JobLocation.Name),
      City: jobString(value.JobLocation.City),
      State: jobString(value.JobLocation.State),
    };
  }
  return job;
}
function jobArray(data: unknown): JobPosting[] {
  const source: unknown = Array.isArray(data) ? data : isRecord(data) ? (data.jobs || data.Jobs || []) : [];
  if (!Array.isArray(source)) throw new Error('Invalid job feed');
  // JSON is untrusted: normalize it before giving the renderer the documented shape.
  const entries: unknown[] = source;
  return entries.map(normalizeJob);
}
export function renderJobs(el: HTMLElement, data: unknown): void {
  const list = el.querySelector<HTMLElement>('.tpl-jobs__list');
  const empty = el.querySelector<HTMLElement>('[data-tpl-jobs-empty]');
  const failed = el.querySelector<HTMLElement>('[data-tpl-jobs-error]');
  if (!list) return;
  const jobsArr = jobArray(data);
  if (failed) failed.hidden = true;
  list.setAttribute('aria-busy', 'false');
  if (!jobsArr.length) {
    list.innerHTML = '';
    list.hidden = true;
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  list.hidden = false;
  list.innerHTML = jobsArr.map(j => {
    const loc = j.JobLocation ? [j.JobLocation.City, j.JobLocation.State].filter(Boolean).join(', ') || j.JobLocation.Name : '';
    const meta = [
      loc ? '<span>' + icon('map-pin') + escapeHtml(loc) + '</span>' : '',
      j.HiringDepartment ? '<span>' + icon('briefcase') + escapeHtml(j.HiringDepartment) + '</span>' : '',
      j.PublishedDate ? '<span>' + icon('calendar') + 'Posted ' + escapeHtml(formatDate(j.PublishedDate)) + '</span>' : '',
    ].join('');
    return '<li class="tpl-job"><div class="tpl-stack" style="--stack-gap: var(--space-2)">'
      + '<h3 class="tpl-job__title"><a href="' + escapeHtml(safeUrl(j.ApplyUrl || j.DisplayUrl)) + '" target="_blank" rel="noopener">'
      + escapeHtml(j.Title) + '<span class="tpl-visually-hidden">, opens the application</span></a></h3>'
      + '<p class="tpl-job__meta">' + meta + '</p></div>'
      + '<span class="tpl-job__apply" aria-hidden="true">View and apply' + icon('arrow-up-right') + '</span></li>';
  }).join('');
}
export function renderJobsError(el: HTMLElement): void {
  const list = el.querySelector<HTMLElement>('.tpl-jobs__list');
  const failed = el.querySelector<HTMLElement>('[data-tpl-jobs-error]');
  if (list) { list.setAttribute('aria-busy', 'false'); list.hidden = true; }
  if (failed) failed.hidden = false;
}
export function jobs(root: ParentNode = doc): void {
  root.querySelectorAll<HTMLElement>('[data-tpl-jobs][data-src]').forEach(el => {
    const src = el.getAttribute('data-src');
    if (!src || !once(el, 'Jobs')) return;
    fetch(src, { headers: { Accept: 'application/json' } })
      .then((r): Promise<unknown> => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(data => { renderJobs(el, data); })
      .catch(() => { renderJobsError(el); });
  });
}

// ---------------------------------------------------------------- pointer glow on glass shells
export function glow(root: ParentNode = doc): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  root.querySelectorAll<HTMLElement>('[data-tpl-glow]').forEach(host => {
    if (!once(host, 'Glow')) return;
    host.addEventListener('pointermove', e => {
      if (!(e.target instanceof Element)) return;
      const shell = e.target.closest<HTMLElement>('.tpl-shell');
      if (!shell || !host.contains(shell)) return;
      const r = shell.getBoundingClientRect();
      shell.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      shell.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  });
}

// ---------------------------------------------------------------- motion choreography (GSAP, optional)
// CSS-only states remain intact until the injected optional libraries arrive.
export function motion(root: ParentNode = doc): void {
  const g = window.gsap;
  if (!g || reduceMotion.matches) return;
  const ST = window.ScrollTrigger;
  if (ST && g.registerPlugin) g.registerPlugin(ST);
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Headline: words rise out of masks. Plain-text headlines only.
  root.querySelectorAll<HTMLElement>('[data-tpl-words]').forEach(el => {
    if (!once(el, 'Words')) return;
    const words = (el.textContent ?? '').trim().split(/\s+/);
    el.innerHTML = words.map(w => '<span class="tpl-word"><span class="tpl-word__in">' + escapeHtml(w) + '</span></span>').join(' ');
    el.style.animation = 'none';
    g.from(el.querySelectorAll<HTMLElement>('.tpl-word__in'), { yPercent: 112, duration: 1.15, ease: 'expo.out', stagger: 0.07, delay: 0.15 });
  });

  // Magnetic pills: the button leans toward the pointer and springs back.
  if (fine) root.querySelectorAll<HTMLElement>('[data-tpl-magnetic]').forEach(el => {
    if (!once(el, 'Magnetic')) return;
    const xTo = g.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = g.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.26);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.26);
    }, { passive: true });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });

  if (!ST) return;
  // Card stack: each stuck card gently scales down as the next one arrives.
  root.querySelectorAll<HTMLElement>('[data-tpl-stack]').forEach(list => {
    if (!once(list, 'Stack')) return;
    const cards = Array.from(list.children);
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      g.to(card, {
        scale: 0.965, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top+=' + (140 + i * 16), scrub: true, invalidateOnRefresh: true },
      });
    });
  });

  // Values rail: on wide screens the section pins and vertical scroll drives the track.
  if (window.matchMedia('(min-width: 1024px)').matches) root.querySelectorAll<HTMLElement>('[data-tpl-rail]').forEach(section => {
    if (!once(section, 'Rail')) return;
    const track = section.querySelector<HTMLElement>('[data-tpl-rail-track]');
    const rail = track?.parentElement;
    if (!track || !rail) return;
    const distance = (): number => {
      const cs = getComputedStyle(rail);
      const inner = rail.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return Math.max(0, track.scrollWidth - inner);
    };
    if (distance() <= 0) return;
    section.classList.add('is-pinned');
    g.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 0.4, anticipatePin: 1, invalidateOnRefresh: true },
    });
  });
}

// ---------------------------------------------------------------- sheet: a tile morphs into a detail dialog
export function sheet(root: ParentNode = doc): void {
  root.querySelectorAll<SheetHost>('[data-tpl-sheet-host]').forEach(host => {
    if (!once(host, 'Sheet')) return;
    const dialog = doc.getElementById(host.getAttribute('data-tpl-sheet-host') ?? '');
    if (!(dialog instanceof HTMLDialogElement) || typeof dialog.showModal !== 'function') return;
    const panel = dialog.querySelector<HTMLElement>('.tpl-sheet__panel') || dialog;
    const slot = (name: string): HTMLElement | null => dialog.querySelector<HTMLElement>('[data-tpl-sheet-' + name + ']');
    let current: { tile: HTMLElement; link: HTMLAnchorElement } | null = null;
    const transition = (update: () => void): ViewTransition | null => {
      if (!doc.startViewTransition || reduceMotion.matches) { update(); return null; }
      return doc.startViewTransition(update);
    };
    const fill = (tile: HTMLElement, link: HTMLAnchorElement): void => {
      const items = Array.from(tile.parentElement?.children ?? []);
      const pad = (n: number): string => (n < 10 ? '0' : '') + n;
      const index = slot('index');
      if (index) index.textContent = pad(items.indexOf(tile) + 1) + ' / ' + pad(items.length);
      const title = slot('title');
      if (title) title.textContent = (link.textContent ?? '').trim();
      const desc = tile.querySelector<HTMLElement>('.tpl-service__desc');
      const description = slot('desc');
      if (description) description.textContent = (desc?.textContent ?? '').trim();
      const scope = tile.querySelector<HTMLElement>('.tpl-service__scope');
      const scopeSlot = slot('scope');
      if (scopeSlot) { scopeSlot.innerHTML = scope?.innerHTML ?? ''; scopeSlot.hidden = !scope; }
      const media = slot('media');
      const img = tile.querySelector<HTMLImageElement>('.tpl-service__media img');
      const glyph = tile.querySelector<SVGElement>('.tpl-service__icon');
      if (media) {
        media.innerHTML = '';
        media.classList.toggle('is-icon', !img);
        if (img) {
          // cloneNode's DOM signature returns Node; the source is a checked <img>.
          const copy = img.cloneNode();
          if (copy instanceof HTMLImageElement) { copy.removeAttribute('loading'); media.appendChild(copy); }
        } else if (glyph) media.appendChild(glyph.cloneNode(true));
      }
      const action = dialog.querySelector<HTMLAnchorElement>('[data-tpl-sheet-link]');
      if (action) action.href = link.href;
    };
    const open = (tile: HTMLElement, link: HTMLAnchorElement): void => {
      current = { tile, link };
      fill(tile, link);
      tile.style.viewTransitionName = 'tpl-sheet';
      const t = transition(() => {
        tile.style.viewTransitionName = '';
        panel.style.viewTransitionName = 'tpl-sheet';
        doc.documentElement.style.overflow = 'hidden';
        dialog.showModal();
      });
      const done = (): void => { panel.style.viewTransitionName = ''; tile.style.viewTransitionName = ''; };
      if (t) void t.finished.then(done, done); else done();
    };
    const close = (): void => {
      if (!dialog.open) return;
      const was = current;
      panel.style.viewTransitionName = 'tpl-sheet';
      const t = transition(() => {
        panel.style.viewTransitionName = '';
        if (was) was.tile.style.viewTransitionName = 'tpl-sheet';
        dialog.close();
        doc.documentElement.style.overflow = '';
      });
      const done = (): void => {
        panel.style.viewTransitionName = '';
        if (was) { was.tile.style.viewTransitionName = ''; was.link.focus({ preventScroll: true }); }
      };
      if (t) void t.finished.then(done, done); else done();
    };
    host.addEventListener('click', e => {
      if (!(e.target instanceof Element)) return;
      const link = e.target.closest<HTMLAnchorElement>('.tpl-service__link');
      if (!link || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const tile = link.closest<HTMLElement>('.tpl-service');
      if (!tile) return;
      e.preventDefault();
      open(tile, link);
    });
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    dialog.addEventListener('click', e => {
      if (e.target === dialog || (e.target instanceof Element && e.target.closest('[data-tpl-sheet-close]'))) close();
    });
    host.tplSheet = { open, close };
  });
}

// ---------------------------------------------------------------- strand scene (three.js, injected)
function isThreeModule(value: unknown): value is ThreeModule {
  if (!isRecord(value)) return false;
  // Injection boundary: accept a module-shaped namespace with every constructor used
  // below and its blending constant. Constructor internals remain the library's contract.
  return ['WebGLRenderer', 'Scene', 'Fog', 'Color', 'PerspectiveCamera', 'Group',
    'MeshBasicMaterial', 'Vector3', 'CatmullRomCurve3', 'Mesh', 'TubeGeometry',
    'BufferGeometry', 'BufferAttribute', 'Points', 'PointsMaterial', 'CanvasTexture']
    .every(name => typeof value[name] === 'function') && typeof value.AdditiveBlending === 'number';
}
export function mountScene(el: HTMLElement, module: unknown, opts: StrandSceneOptions = {}): SceneHandle | null {
  if (!el || !isThreeModule(module) || !once(el, 'Scene')) return null;
  const THREE = module;
  const css = getComputedStyle(doc.documentElement);
  const cssColor = (name: string, fallback: string): string => (css.getPropertyValue(name) || '').trim() || fallback;
  let renderer: Three.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch { return null; }
  const still = reduceMotion.matches;
  const narrow = el.clientWidth < 768;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2));
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(new THREE.Color(cssColor('--surface', '#080807')), 5, 15);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 0, 7.5);
  const group = new THREE.Group();
  scene.add(group);

  // Deterministic layout so the scene looks the same on every visit.
  let seed = 7;
  const rand = (): number => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const strandCount = opts.strands || (narrow ? 10 : 16);
  const curves: Three.CatmullRomCurve3[] = [];
  const strandGeometries: Three.TubeGeometry[] = [];
  const strandMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cssColor('--neutral-300', '#bfbdbb')), transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < strandCount; i++) {
    const pts: Three.Vector3[] = [];
    const y0 = (rand() - 0.5) * 5.5;
    const z0 = (rand() - 0.5) * 5;
    for (let k = 0; k < 6; k++) {
      pts.push(new THREE.Vector3(-11 + k * 4.4 + (rand() - 0.5) * 1.2, y0 + Math.sin(k * 1.3 + i) * (0.6 + rand() * 0.9), z0 + (rand() - 0.5) * 1.6));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    curves.push(curve);
    const tube = new THREE.TubeGeometry(curve, 96, 0.012 + rand() * 0.022, 6, false);
    strandGeometries.push(tube);
    group.add(new THREE.Mesh(tube, strandMat));
  }

  // Pulses: additive point sprites moving along the strands.
  const sprite = doc.createElement('canvas');
  sprite.width = sprite.height = 64;
  const ctx = sprite.getContext('2d');
  if (!ctx) {
    strandGeometries.forEach(geometry => geometry.dispose());
    strandMat.dispose();
    renderer.dispose();
    canvas.remove();
    return null;
  }
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const pulseCount = opts.pulses || strandCount * 3;
  const positions = new Float32Array(pulseCount * 3);
  const colors = new Float32Array(pulseCount * 3);
  const accent = new THREE.Color(cssColor('--brand-accent', '#e87722'));
  const highlight = new THREE.Color(cssColor('--highlight', '#efd347'));
  const pulses: { curve: Three.CatmullRomCurve3; t: number; speed: number }[] = [];
  for (let p = 0; p < pulseCount; p++) {
    const c = rand() < 0.8 ? accent : highlight;
    colors[p * 3] = c.r; colors[p * 3 + 1] = c.g; colors[p * 3 + 2] = c.b;
    const curve = curves[p % curves.length];
    if (curve) pulses.push({ curve, t: rand(), speed: 0.03 + rand() * 0.09 });
  }
  const geo = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  geo.setAttribute('position', positionAttribute);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const texture = new THREE.CanvasTexture(sprite);
  const pointMat = new THREE.PointsMaterial({ size: 0.34, map: texture, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geo, pointMat);
  group.add(points);

  const target = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };
  const onMove = (e: PointerEvent): void => { target.x = e.clientX / window.innerWidth - 0.5; target.y = e.clientY / window.innerHeight - 0.5; };
  if (!still && window.matchMedia('(hover: hover)').matches) window.addEventListener('pointermove', onMove, { passive: true });

  const host = el.closest<HTMLElement>('.tpl-hero') || el;
  const progress = (): number => {
    const r = host.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  };
  const placePulses = (dt: number): void => {
    pulses.forEach((pu, q) => {
      pu.t = (pu.t + pu.speed * dt) % 1;
      if (!(pu.t >= 0)) pu.t = 0;
      const v = pu.curve.getPointAt(pu.t);
      positions[q * 3] = v.x; positions[q * 3 + 1] = v.y; positions[q * 3 + 2] = v.z;
    });
    positionAttribute.needsUpdate = true;
  };
  const pose = (): void => {
    const pr = progress();
    group.rotation.y = pointer.x * 0.14 + pr * 0.4;
    group.rotation.x = -pointer.y * 0.1 + pr * 0.12;
    group.position.y = pr * 1.4;
    camera.position.z = 7.5 - pr * 3.2;
  };
  let disposed = false;
  const resize = (): void => {
    if (disposed) return;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (still) { placePulses(0); pose(); renderer.render(scene, camera); }
  };
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(el);
  resize();

  let running = false, wanted = true, last = 0;
  let frameId: number | null = null;
  const frame = (now: number): void => {
    if (!running || disposed) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0));
    last = now;
    pointer.x += (target.x - pointer.x) * 0.05;
    pointer.y += (target.y - pointer.y) * 0.05;
    placePulses(dt);
    pose();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(frame);
  };
  const start = (): void => { if (running || still || disposed || !wanted || doc.hidden) return; running = true; last = performance.now(); frameId = requestAnimationFrame(frame); };
  const stop = (): void => { running = false; if (frameId !== null) cancelAnimationFrame(frameId); frameId = null; };
  const onVisibility = (): void => { doc.hidden ? stop() : start(); };
  let intersectionObserver: IntersectionObserver | null = null;
  if (still) { placePulses(0); pose(); renderer.render(scene, camera); }
  else {
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(entries => {
        const entry = entries[0];
        if (!entry || disposed) return;
        wanted = entry.isIntersecting;
        wanted ? start() : stop();
      }, { threshold: 0.02 });
      intersectionObserver.observe(el);
    }
    doc.addEventListener('visibilitychange', onVisibility);
    start();
  }
  return {
    renderer, scene, camera, start, stop,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      strandGeometries.forEach(geometry => geometry.dispose());
      strandMat.dispose();
      geo.dispose();
      pointMat.dispose();
      texture.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
export function mountScenes(THREE: unknown, root: ParentNode = doc): (SceneHandle | null)[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-tpl-scene]'), el => mountScene(el, THREE));
}

// ---------------------------------------------------------------- small things
export function year(root: ParentNode = doc): void {
  root.querySelectorAll<HTMLElement>('[data-tpl-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });
}
export function init(root: ParentNode = doc): void {
  hydrateIcons(root);
  header(root);
  nav(root);
  marquee(root);
  forms(root);
  jobs(root);
  glow(root);
  sheet(root);
  motion(root);
  year(root);
}

export const SiteDS: SiteDSApi = {
  version: '0.2.0',
  icons: ICONS,
  icon, init, hydrateIcons, header, nav, marquee, forms, glow, sheet, motion,
  scene: { mount: mountScene, mountAll: mountScenes },
  jobs: { load: jobs, render: renderJobs, renderError: renderJobsError },
};
window.SiteDS = SiteDS;

if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => { init(); }, { once: true });
else init();