import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'bun run dev',
		// vite.config.ts sets server.port: 3000 unconditionally — match here.
		port: 3000,
		reuseExistingServer: !process.env.CI,
		// Allow extra time for the dev server to start in CI (paraglide compile + cold start).
		timeout: 120_000
	},
	testMatch: '**/tests/e2e/**/*.spec.{ts,js}',
	reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry'
	}
});
