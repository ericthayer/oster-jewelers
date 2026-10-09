// Presentation template design system: types as documentation.
// Components are vanilla HTML + tpl- classes (Oxygen global classes). Vite loads typed
// behaviors via src/main.ts; build:ds exports window.SiteDS in site.js and
// design-system/project/components/bundle.js under exports/. Each <Comp>Props interface documents the
// markup contract a consumer fills in: modifier classes, attributes and content slots.

export type Theme = 'cinematic' | 'engineered' | 'editorial' | 'kinetic';

export type IconName =
  | 'arrow-right' | 'arrow-up-right' | 'arrow-down' | 'chevron-down' | 'chevron-right' | 'menu-2' | 'x' | 'plus' | 'minus'
  | 'check' | 'circle-check' | 'alert-circle' | 'alert-triangle' | 'info-circle' | 'upload' | 'file-upload' | 'file-text'
  | 'external-link' | 'loader-2' | 'search' | 'phone' | 'phone-call' | 'mail' | 'map-pin' | 'map-2' | 'clock' | 'calendar'
  | 'brand-linkedin' | 'brand-instagram' | 'brand-facebook'
  | 'plug-connected' | 'backhoe' | 'crane' | 'building-broadcast-tower' | 'road' | 'route' | 'home-signal' | 'network'
  | 'shield-check' | 'first-aid-kit' | 'certificate' | 'cone' | 'clipboard-check' | 'eye-check' | 'users-group' | 'user-check'
  | 'briefcase' | 'school' | 'trending-up' | 'heart-handshake' | 'steering-wheel' | 'truck' | 'tools' | 'license' | 'award' | 'camera';

/** Inline icon: `<svg class="tpl-icon" data-tpl-icon="phone"></svg>`, expanded in DS exports at build time or by SiteDS.hydrateIcons() in app pages. */
export interface IconProps { name: IconName; /** Only for meaningful icons; decorative icons get aria-hidden. */ label?: string; size?: 'md' | 'lg' | 'xl' }

/** `<a|button class="tpl-btn tpl-btn--primary">` */
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'on-photo';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  /** Verb first, one line, one label per intent: "Request a quote", "View open roles", "Start an inquiry". */
  label: string;
  href?: string;
  /** Trailing icon uses class tpl-icon--trail and nudges on hover. */
  trailingIcon?: IconName;
  /** tpl-btn--orb: the trailing icon sits in its own disc, flush with the right padding (Kinetic pills). */
  orb?: boolean;
  /** data-tpl-magnetic: leans toward the pointer on hover devices when GSAP is loaded (SiteDS.motion). */
  magnetic?: boolean;
  /** aria-busy="true" with a loader-2 icon (class tpl-icon--spin). */
  busy?: boolean;
  /** aria-disabled="true" on links, disabled on buttons. */
  disabled?: boolean;
}

/** `<a class="tpl-call" href="tel:+15550100100">` */
export interface CallLinkProps { label?: string; number: string; tel: string }

/** `<span class="tpl-tag">`; `tpl-tag--accent` for the one highlighted tag. */
export interface TagProps { label: string; accent?: boolean; icon?: IconName }

export interface NavItem { label: 'Services' | 'Safety' | 'About' | 'Careers' | 'Subcontractors' | 'Contact'; href: string; current?: boolean }

/** `<header class="tpl-header" data-tpl-header>` + sibling `<div class="tpl-drawer" data-tpl-drawer>` (DS preview source: src/partials/header.html; app HTML is edited manually). */
export interface SiteHeaderProps {
  /** tpl-header--overlay: transparent over a full-bleed hero until the page scrolls (data-tpl-header-offset="80"). */
  overlay?: boolean;
  /** tpl-header--island: a fixed, centered glass pill (Kinetic); pair with drawer class tpl-drawer--veil, the full-screen menu. */
  island?: boolean;
  items: NavItem[];
  phone: CallLinkProps;
  cta: ButtonProps;
}

/** `<footer class="tpl-footer">` (DS preview source: src/partials/footer.html; app HTML is edited manually). */
export interface SiteFooterProps {
  offices: { region: string; lines: string[] }[];
  phone: string;
  email: string;
  social: { network: 'LinkedIn' | 'Instagram' | 'Facebook'; href: string }[];
}

/** `<header class="tpl-page-header">` with `nav.tpl-breadcrumb`. */
export interface PageHeaderProps { title: string; lead?: string; breadcrumb: { label: string; href?: string }[] }

/** `<section class="tpl-hero tpl-hero--cinematic|split|editorial">` */
export interface HeroProps {
  /** scene (Kinetic): full viewport, `div.tpl-hero__scene[data-tpl-scene]` behind the copy, headline with data-tpl-words. */
  variant: 'cinematic' | 'split' | 'editorial' | 'scene';
  /** Two lines max on desktop. */
  title: string;
  /** 20 words max. */
  lead: string;
  primary: ButtonProps;
  secondary?: ButtonProps | CallLinkProps;
  /** cinematic: one full-bleed photo; split: one framed photo + SpecPlate; editorial: two photos. */
  media: { src: string; alt: string; focus?: string }[];
  facts?: SpecPlateProps;
}

export interface Service {
  /** Anchor slug from the client spec, e.g. 'service-one'. */
  id: string;
  name: string;
  icon: IconName;
  description: string;
  scope: string[];
  href: string;
  media?: { src: string; alt: string };
}
/** `<ol class="tpl-services tpl-services--index|plates|cards|bento">`: one markup, four layouts. Bento sits in a `[data-tpl-glow]` host. */
export interface ServiceIndexProps { variant: 'index' | 'plates' | 'cards' | 'bento'; services: Service[] }

/** `<div class="tpl-split">` with `.tpl-split__media` and `.tpl-split__content`; `tpl-split--reverse` flips on desktop. */
export interface FeatureSplitProps { title: string; body: string; media: { src: string; alt: string } | PhotoSlotProps; reverse?: boolean; link?: ButtonProps }

/** `<dl class="tpl-plate">` of `.tpl-plate__cell` (dt.tpl-plate__label + dd.tpl-plate__value). */
export interface SpecPlateProps {
  /** --plate-cols, default 2. */
  columns?: 1 | 2 | 3 | 4;
  cells: { label: string; value?: string; href?: string; /** Renders .tpl-pending "Client to provide". */ pending?: boolean; wide?: boolean }[];
}

/** Values band. `tpl-values--marquee` (Cinematic), `--grid` (Engineered), `--field` inside `.tpl-on-accent` (Editorial), `--rail` with data-tpl-rail (Kinetic). */
export interface ValuesBandProps {
  variant: 'marquee' | 'grid' | 'field' | 'rail';
  values: ['Generous', 'Accountable', 'Coachable', 'Safe', 'Caring', 'Better'];
  mantra: "Doing what's right when nobody is looking.";
}

/** `<figure class="tpl-quote">`: three lines of quote max, name and source. */
export interface TestimonialProps { quote: string; name: string; source: string }

/** `<div class="tpl-faq">` of native `<details class="tpl-faq__item" name="faq">`. */
export interface FAQProps { items: { question: string; answer: string }[] }

/** `<section class="tpl-cta-band">`. */
export interface CTABandProps { title: string; body?: string; primary: ButtonProps; call?: CallLinkProps }

/** `<ul class="tpl-paths">`: the first path is `.tpl-path--feature` with a photo. */
export interface AudiencePathsProps { paths: { title: string; body: string; link: ButtonProps; media?: { src: string; alt: string } }[] }

/** `<ol class="tpl-timeline">` */
export interface TimelineProps { items: { year?: string; title: string; body?: string; pending?: boolean }[] }

/** `<li class="tpl-leader">` in `<ul class="tpl-leaders">`. */
export interface LeaderCardProps { name?: string; role?: string; photo?: { src: string; alt: string }; pending?: boolean }

/** `<div class="tpl-safety">`: a SpecPlate of metrics plus a checklist of programs. */
export interface SafetyRecordProps { metrics: SpecPlateProps; programs: string[] }

/** `<figure class="tpl-media">` for photos, `<div class="tpl-slot">` for shots still needed. */
export interface PhotoSlotProps { ratio?: '4 / 3' | '4 / 5' | '3 / 4' | '16 / 9' | '1 / 1'; label: 'Photo needed'; brief: string }

/** `<div class="tpl-field">`: label above, hint, control, error below (added by SiteDS.forms). */
export interface FieldProps {
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'file' | 'checkbox-group' | 'radio-group';
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  /** Overrides the generated message. */
  error?: string;
  options?: string[];
}

/** `.tpl-notice--danger[data-tpl-error-summary]` inside the form; `.tpl-notice--success[data-tpl-success]` beside it. */
export interface FormFeedbackProps { variant: 'error-summary' | 'success'; title: string; body?: string }

/** `<form class="tpl-form" data-tpl-form>`; data-tpl-demo shows the success panel without sending. */
export interface QuoteFormProps { action: string; demo?: boolean; services: Service['name'][] }
export interface SubcontractorFormProps { action: string; demo?: boolean; trades: string[] }

/** One job posting. Field names follow the Paylocity Recruiting feed; map other applicant-tracking feeds to this shape. */
export interface JobPosting {
  JobId: string;
  Title: string;
  ApplyUrl: string;
  DisplayUrl?: string;
  PublishedDate?: string;
  HiringDepartment?: string;
  JobLocation?: { Name?: string; City?: string; State?: string };
}
/** `<div class="tpl-jobs" data-tpl-jobs data-src="feed.json">` with loading, empty and error slots. */
export interface JobListProps { src?: string; jobs?: JobPosting[]; fallbackUrl: string; embed?: { src: string; title: string } }

/** `<ul class="tpl-benefits">` of `.tpl-benefit` (icon + title + text). */
export interface BenefitListProps { items: { icon: IconName; title: string; body?: string; pending?: boolean }[] }

/** `<div class="tpl-notice tpl-notice--info|danger|success">`. */
export interface NoticeProps { tone: 'info' | 'danger' | 'success'; title: string; body?: string }

/** `<ul class="tpl-reasons tpl-reasons--stack" data-tpl-stack>` of `li.tpl-reason.tpl-shell`: sticky cards that pile up; GSAP scales each one down as the next arrives. */
export interface CardStackProps { cards: { icon: IconName; title: string; body: string }[] }

/** `<dialog class="tpl-sheet">` with `.tpl-sheet__panel` and `data-tpl-sheet-*` slots (title, desc, scope, media, index, link).
 *  A host `[data-tpl-sheet-host="<dialog id>"]` around a ServiceIndex opens it from any tile; the tile morphs into the panel
 *  through a same-document view transition named `tpl-sheet`. */
export interface ServiceSheetProps { id: string; quoteHref: string }

/** `<div class="tpl-hero__scene" data-tpl-scene>`: the three.js strand scene mounted by SiteDS.scene.mountAll(THREE). */
export interface StrandSceneOptions { /** Default 16, 10 under 768px. */ strands?: number; /** Default strands x 3. */ pulses?: number }
export interface StrandSceneHandle { start(): void; stop(): void; dispose(): void }

/** Kinetic choreography hooks read by SiteDS.motion (GSAP 3 + ScrollTrigger, optional). */
export interface MotionHooks {
  /** data-tpl-words on a plain-text headline: words rise out of masks on load. */
  words: 'data-tpl-words';
  /** data-tpl-magnetic on a button: leans toward the pointer (hover devices only). */
  magnetic: 'data-tpl-magnetic';
  /** data-tpl-stack on a list of .tpl-shell cards: scale and dim as the next card arrives. */
  stack: 'data-tpl-stack';
  /** data-tpl-rail on a section with a [data-tpl-rail-track]: pinned horizontal scroll at 1024px and up. */
  rail: 'data-tpl-rail';
  /** data-tpl-glow on a host of .tpl-shell cards: a pointer-following glow (no GSAP needed). */
  glow: 'data-tpl-glow';
}

export interface SiteDSApi {
  version: string;
  icons: Record<IconName, string>;
  /** SVG markup for an icon; pass label for meaningful icons. */
  icon(name: IconName, opts?: { label?: string; className?: string }): string;
  /** Runs everything below on a root (default document). Safe to call twice. */
  init(root?: ParentNode): void;
  hydrateIcons(root?: ParentNode): void;
  header(root?: ParentNode): void;
  nav(root?: ParentNode): void;
  marquee(root?: ParentNode): void;
  forms(root?: ParentNode): void;
  /** Pointer glow on [data-tpl-glow] hosts. */
  glow(root?: ParentNode): void;
  /** Tile-to-sheet dialogs on [data-tpl-sheet-host] hosts. */
  sheet(root?: ParentNode): void;
  /** GSAP choreography; a no-op without window.gsap or under reduced motion. */
  motion(root?: ParentNode): void;
  scene: {
    /** Mounts the strand scene into one host; THREE is the page's ES module import. */
    mount(el: HTMLElement, THREE: unknown, opts?: StrandSceneOptions): StrandSceneHandle | null;
    /** Mounts every [data-tpl-scene]. */
    mountAll(THREE: unknown, root?: ParentNode): (StrandSceneHandle | null)[];
  };
  jobs: {
    load(root?: ParentNode): void;
    render(el: HTMLElement, data: JobPosting[] | { jobs: JobPosting[] }): void;
    renderError(el: HTMLElement): void;
  };
}

declare global { interface Window { SiteDS: SiteDSApi } }
