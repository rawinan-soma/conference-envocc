import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from 'svelte-adapter-bun';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	server: {
		// Use port 3000 so the Playwright webServer config (CI=true → port 3000) can find the dev server.
		port: 3000
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Using svelte-adapter-bun for Bun-native deployment
			adapter: adapter(),

			typescript: {
				config: (config) => ({
					...config,
					include: [...config.include, '../drizzle.config.ts']
				})
			}
		}),
		paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.integration.test.ts'],
					// Quality-gate tests run bun run lint/check/build as subprocesses — allow up to 3 min per test.
					testTimeout: 180_000
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'integration',
					environment: 'node',
					include: ['src/**/*.integration.test.ts', 'tests/integration/**/*.{test,spec}.{js,ts}'],
					globalSetup: './tests/support/integration-setup.ts',
					testTimeout: 30_000,
					hookTimeout: 60_000
				}
			}
		]
	}
});
