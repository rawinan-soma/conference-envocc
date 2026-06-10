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
							return {
								SvelteText(node) {
									// Only flag non-whitespace text nodes
									const text = node.value;
									if (/\S/.test(text)) {
										context.report({
											node,
											messageId: 'hardcoded',
											data: { text: text.trim() }
										});
									}
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
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {}
	}
);
