import type { IconName } from '../../src/types/index.js';

/** Token JSON fields consumed by the shared compiler; extra metadata is allowed. */
export interface JsonToken {
	name: string;
	value: string | Record<string, string>;
	[key: string]: unknown;
}

export interface JsonTokenFamily {
	tokens: JsonToken[];
	[key: string]: unknown;
}

export interface JsonTypeStyle {
	name: string;
	family?: string;
	fontSize: string;
	lineHeight: string | number;
	fontWeight: string | number;
	letterSpacing?: string;
	fontStyle?: string;
	[key: string]: unknown;
}

export interface JsonTokens {
	color: JsonTokenFamily & { themes: { id: string; name?: string }[] };
	type: {
		fonts: { family: string; file: string; weight: string | number; style?: string }[];
		families: Record<string, string>;
		groups: { family: string; styles: JsonTypeStyle[]; [key: string]: unknown }[];
		[key: string]: unknown;
	};
	shadow?: JsonTokenFamily;
	[key: string]: unknown;
}

/** Node-only helpers shared by Vite and the standalone design-system exporter. */
export const ROOT: string;
export const TOKEN_FILE: string;
export const ICON_NAMES: IconName[];
export function loadIcons(): Record<IconName, string>;
export function compileTokens(tokens: JsonTokens, fontPrefix?: string): string;
/** Writes shared token CSS and icon data only when their contents change. */
export function prepareData(): void;
