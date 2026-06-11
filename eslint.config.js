import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	// Ignore auto-generated shadcn-svelte UI components
	{ ignores: ['src/lib/components/ui/**'] },
	// Ignore transient ESLint fixture files written/deleted by unit tests.
	// Tests that need to lint these files must use `eslint --no-ignore`.
	{ ignores: ['tests/support/fixtures/**'] },
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Hardcoded UI string guard — AC-3 and AC-4 of Story 1.4
		// Uses the SvelteText AST node exposed by eslint-plugin-svelte's parser.
		// Fires when non-whitespace raw text appears directly in a Svelte template
		// (i.e., not wrapped in m.*() or an expression block).
		files: ['**/*.svelte'],
		plugins: {
			local: {
				rules: {
					'no-raw-svelte-text': {
						meta: {
							type: 'suggestion',
							docs: {
								description:
									'Disallow hardcoded user-facing text in Svelte templates. Use m.*() from $lib/paraglide/messages instead.'
							},
							schema: [],
							messages: {
								hardcoded: 'Hardcoded UI text "{{text}}" found. Use m.*() for user-facing strings.'
							}
						},
						create(context) {
							// Allowlist for non-UI text content (per Story 1.4 Task 4.3):
							// empty/whitespace-only, route paths, and punctuation/symbol-only text.
							const ROUTE_PATH = /^\/[\w/-]*$/;
							const PUNCTUATION_ONLY = /^[^\p{L}\p{N}]+$/u;
							return {
								SvelteText(node) {
									const trimmed = node.value.trim();
									// Skip empty/whitespace, route paths, and punctuation-only text.
									if (
										trimmed === '' ||
										ROUTE_PATH.test(trimmed) ||
										PUNCTUATION_ONLY.test(trimmed)
									) {
										return;
									}
									context.report({
										node,
										messageId: 'hardcoded',
										data: { text: trimmed }
									});
								}
							};
						}
					}
				}
			}
		},
		rules: {
			'local/no-raw-svelte-text': 'error'
		}
	},
	{
		// AC-5: Job handlers and server modules must NOT import SvelteKit runtime modules.
		// The worker process runs outside SvelteKit's runtime — $app/* and $env/dynamic
		// are unavailable and will throw at import time.
		files: ['src/worker.ts', 'src/lib/server/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$app/*', '$env/dynamic*'],
							message:
								'Job handlers and server modules must not import SvelteKit runtime modules. Use src/lib/server/env.ts for environment variables.'
						}
					]
				}
			]
		}
	}
);
