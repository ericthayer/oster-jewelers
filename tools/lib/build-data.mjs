import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const TOKEN_FILE = join(ROOT, 'design-system/project/tokens.json');
export const ICON_NAMES = [
  'arrow-right', 'arrow-up-right', 'arrow-down', 'chevron-down', 'chevron-right', 'menu-2', 'x', 'plus', 'minus', 'check',
  'circle-check', 'alert-circle', 'alert-triangle', 'info-circle', 'upload', 'file-upload', 'file-text', 'external-link',
  'loader-2', 'search', 'phone', 'phone-call', 'mail', 'map-pin', 'map-2', 'clock', 'calendar',
  'brand-linkedin', 'brand-instagram', 'brand-facebook',
  'plug-connected', 'backhoe', 'crane', 'building-broadcast-tower', 'road', 'route', 'home-signal', 'network',
  'shield-check', 'first-aid-kit', 'certificate', 'cone', 'clipboard-check', 'eye-check', 'users-group', 'user-check',
  'briefcase', 'school', 'trending-up', 'heart-handshake', 'steering-wheel', 'truck', 'tools', 'license', 'award', 'camera',
];

export function loadIcons() {
  return Object.fromEntries(ICON_NAMES.map(name => {
    const svg = readFileSync(join(ROOT, 'node_modules/@tabler/icons/icons/outline', `${name}.svg`), 'utf8');
    const inner = /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(svg)?.[1];
    if (!inner) throw new Error(`Invalid Tabler SVG: ${name}`);
    return [name, inner.replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '').replace(/\s+/g, ' ').trim()];
  }));
}

export function compileTokens(tokens, fontPrefix = '../fonts/') {
  const themes = tokens.color.themes.map(theme => theme.id);
  const first = themes[0];
  const cssValue = value => { const alias = /^\{(.+)\}$/.exec(value); return alias ? `var(--${alias[1]})` : value; };
  const valueFor = (token, theme) => typeof token.value === 'string' ? token.value : (token.value[theme] ?? token.value[first]);
  const themed = [...tokens.color.tokens, ...(tokens.shadow?.tokens || [])];
  let css = '/* Generated from design-system/project/tokens.json. Edit the JSON, not this file. */\n';
  for (const font of tokens.type.fonts) {
    css += `@font-face { font-family: "${font.family}"; src: url("${fontPrefix}${basename(font.file)}") format("woff2"); font-weight: ${font.weight}; font-style: ${font.style || 'normal'}; font-display: swap; }\n`;
  }
  css += `:root, [data-theme="${first}"] {\n${themed.map(token => `  --${token.name}: ${cssValue(valueFor(token, first))};`).join('\n')}\n}\n`;
  for (const theme of themes.slice(1)) {
    const declarations = themed.filter(token => typeof token.value !== 'string' || /^\{.+\}$/.test(token.value))
      .map(token => `  --${token.name}: ${cssValue(valueFor(token, theme))};`);
    css += `[data-theme="${theme}"] {\n${declarations.join('\n')}\n}\n`;
  }
  const plain = Object.entries(tokens).filter(([key, family]) => !['color', 'type', 'shadow'].includes(key) && family && Array.isArray(family.tokens));
  css += ':root {\n' + plain.flatMap(([, family]) => family.tokens.map(token => `  --${token.name}: ${token.value};`)).join('\n') + '\n'
    + Object.entries(tokens.type.families).map(([key, value]) => `  --font-${key}: ${value};`).join('\n') + '\n}\n';
  for (const group of tokens.type.groups) {
    for (const style of group.styles) {
      css += `.${style.name} { font-family: var(--font-${style.family || group.family}); font-size: ${style.fontSize}; line-height: ${style.lineHeight}; font-weight: ${style.fontWeight};${style.letterSpacing ? ` letter-spacing: ${style.letterSpacing};` : ''}${style.fontStyle ? ` font-style: ${style.fontStyle};` : ''} }\n`;
    }
  }
  return css;
}

function writeIfChanged(path, content) {
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export function prepareData() {
  const tokens = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  writeIfChanged(join(ROOT, 'src/generated/tokens.css'), compileTokens(tokens));
  writeIfChanged(join(ROOT, 'src/generated/icons.ts'), '// Generated from the installed Tabler icons.\nimport type { IconName } from "../types/index";\n'
    + `export const ICONS: Record<IconName, string> = ${JSON.stringify(loadIcons())};\n`);
}