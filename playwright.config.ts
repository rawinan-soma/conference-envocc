import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'bun run dev', port: 5173, reuseExistingServer: !process.env.CI },
	testMatch: '**/tests/e2e/**/*.spec.{ts,js}',
	use: {
		baseURL: 'http://localhost:5173'
	}
});
