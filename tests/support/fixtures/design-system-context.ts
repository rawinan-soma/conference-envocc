/**
 * Shared fixture context for Story 1.2 — Design System & Thai Typography tests.
 *
 * TDD RED PHASE: This file provides design token constants and CSS property
 * helpers for the red-phase test scaffolds.
 *
 * No `test.extend()` patterns yet — Story 1.2 tests are CSS/structural tests
 * that do not require database or auth fixtures.
 *
 * Full fixture infrastructure (Playwright `test.extend()`, DB factories, auth
 * helpers) is created in Story 1.8 (Test Harness & CI).
 *
 * No Thai text — per project rule: Rawinan handles all Thai translations.
 */

import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// DESIGN.md Forest & Copper Token Constants
// Source of truth for test assertions — matches story 1-2-design-system-thai-typography.md
// ---------------------------------------------------------------------------

export const DESIGN_TOKENS = {
	colors: {
		green900: '#1B4332',
		green700: '#2D6A4F', // --primary
		green500: '#40916C', // --ring
		green200: '#95D5B2',
		green100: '#D8F3DC',
		copper: '#B5651D', // --accent-foreground
		copperLight: '#E8A96A',
		copperBg: '#FDF3E7', // --accent
		cream: '#FAFAF7', // --background
		cream100: '#F0EDE6', // --muted, --secondary
		cream200: '#E8E3DA',
		border: '#E0DBD3', // --border, --input
		ink: '#1C1C1C', // --foreground
		ink2: '#5A5A5A', // --muted-foreground
		ink3: '#9A9A9A',
		card: '#FFFFFF', // --card
		destructive: '#B3261E'
	},
	radius: {
		sm: '0.375rem', // 6px
		md: '0.625rem', // 10px
		lg: '1rem', // 16px
		xl: '1.25rem' // 20px
	},
	fonts: {
		sans: 'Noto Sans Thai', // --font-sans lead
		serif: 'Noto Serif Thai' // --font-serif lead
	},
	typography: {
		thaiBodyLineHeight: 1.65, // DESIGN.md Thai body minimum
		minFontSizePx: 14 // UXD-008: never below 14px
	}
} as const;

// ---------------------------------------------------------------------------
// RGB equivalents for browser computed style assertions
// Browser getComputedStyle() returns rgb(...) not hex
// ---------------------------------------------------------------------------

export const DESIGN_TOKEN_RGB = {
	green700: 'rgb(45, 106, 79)', // #2D6A4F
	cream: 'rgb(250, 250, 247)', // #FAFAF7
	card: 'rgb(255, 255, 255)', // #FFFFFF
	border: 'rgb(224, 219, 211)' // #E0DBD3
} as const;

// ---------------------------------------------------------------------------
// CSS property reader helpers
// ---------------------------------------------------------------------------

/**
 * Read a CSS custom property value from the document root.
 * Useful for asserting that design tokens are wired correctly.
 *
 * @param page - Playwright page
 * @param property - CSS custom property name (e.g. '--primary')
 * @returns The trimmed computed value
 */
export async function getCssCustomProperty(page: Page, property: string): Promise<string> {
	return page.evaluate((prop: string) => {
		return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
	}, property);
}

/**
 * Read the computed background-color of an element.
 * Returns the browser's rgb(...) format for comparison with DESIGN_TOKEN_RGB.
 *
 * @param page - Playwright page
 * @param selector - CSS selector string
 * @returns Computed background-color as rgb(...) string
 */
export async function getElementBackgroundColor(page: Page, selector: string): Promise<string> {
	return page.evaluate((sel: string) => {
		const el = document.querySelector(sel);
		if (!el) throw new Error(`Element not found: ${sel}`);
		return window.getComputedStyle(el).backgroundColor;
	}, selector);
}

/**
 * Calculate the unitless line-height ratio for an element.
 * Returns lineHeight / fontSize (both in px) for threshold comparison.
 *
 * DESIGN.md requires Thai body line-height >= 1.65.
 *
 * @param page - Playwright page
 * @param selector - CSS selector string
 * @returns Unitless line-height ratio
 */
export async function getLineHeightRatio(page: Page, selector: string): Promise<number> {
	return page.evaluate((sel: string) => {
		const el = document.querySelector(sel);
		if (!el) throw new Error(`Element not found: ${sel}`);
		const styles = window.getComputedStyle(el);
		const lh = parseFloat(styles.lineHeight);
		const fs = parseFloat(styles.fontSize);
		return fs > 0 ? lh / fs : 0;
	}, selector);
}

/**
 * Get the font-size in pixels for an element.
 * UXD-008: font-size must never be below 14px.
 *
 * @param page - Playwright page
 * @param selector - CSS selector string
 * @returns Font size in pixels
 */
export async function getFontSizePx(page: Page, selector: string): Promise<number> {
	return page.evaluate((sel: string) => {
		const el = document.querySelector(sel);
		if (!el) throw new Error(`Element not found: ${sel}`);
		return parseFloat(window.getComputedStyle(el).fontSize);
	}, selector);
}

// ---------------------------------------------------------------------------
// Required CSS custom property names in src/app.css
// Used by unit tests to verify token presence without hardcoding in each test
// ---------------------------------------------------------------------------

export const REQUIRED_RAW_TOKENS: ReadonlyArray<[string, string]> = [
	['--green-900', '#1B4332'],
	['--green-700', '#2D6A4F'],
	['--green-500', '#40916C'],
	['--green-200', '#95D5B2'],
	['--green-100', '#D8F3DC'],
	['--copper', '#B5651D'],
	['--copper-light', '#E8A96A'],
	['--copper-bg', '#FDF3E7'],
	['--cream', '#FAFAF7'],
	['--cream-100', '#F0EDE6'],
	['--cream-200', '#E8E3DA'],
	['--border-color', '#E0DBD3'],
	['--ink', '#1C1C1C'],
	['--ink-2', '#5A5A5A'],
	['--ink-3', '#9A9A9A']
];

/**
 * Known required Google Fonts CDN links for Thai typography.
 * Source: Story 1.2 AC-3 and Dev Notes §"Font Loading Pattern".
 */
export const REQUIRED_FONT_LINKS = {
	preconnectGoogleapis: 'https://fonts.googleapis.com',
	preconnectGstatic: 'https://fonts.gstatic.com',
	fontFamilies: ['Noto+Sans+Thai', 'Noto+Serif+Thai'],
	displayStrategy: 'display=swap'
} as const;
