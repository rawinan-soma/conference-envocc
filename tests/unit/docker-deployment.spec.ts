/**
 * Story 1.7: Docker & Deployment Skeleton
 * Integration/Ops tests for Docker build, Compose stack, nginx proxy, and env validation.
 *
 * TDD GREEN PHASE: Static/config tests are active and passing.
 * Docker daemon tests (1.7-INT-001–003) remain test.skip() — designated nightly CI.
 *
 * IMPORTANT: These tests require Docker to be running locally.
 * P0 docker compose tests (1.7-INT-001–003) are long-running (~2–3 min)
 * and are designated for nightly CI runs per the Epic 1 test design.
 * P1 nginx header tests (1.7-INT-004) run inside a running compose stack.
 *
 * Execution:
 *   # Single test file
 *   bun run test -- tests/unit/docker-deployment.spec.ts
 *
 *   # Full unit suite
 *   bun run test
 */

import { test, expect, describe, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
	PROJECT_ROOT,
	REQUIRED_DOCKER_FILES,
	PROD_COMPOSE_FILE,
	WEB_IMAGE_NAME,
	WORKER_IMAGE_NAME,
	NGINX_PORT,
	NGINX_HEALTH_PATH,
	runCmd,
	waitForUrl
} from '../support/fixtures/docker-context';

// ---------------------------------------------------------------------------
// P0 — Task 1/3: Dockerfile (web) — AC-3
// ---------------------------------------------------------------------------

describe('Story 1.7 — Docker Files Exist (ATDD Red Phase)', () => {
	// -----------------------------------------------------------------------
	// 1.7-UNIT-PREFLIGHT-001 (P1): required Docker files present in repo
	// -----------------------------------------------------------------------
	test('[P1] 1.7-UNIT-PREFLIGHT-001 — all required Docker/infra files are present', () => {
		// THIS TEST WILL FAIL — Dockerfile, Dockerfile.worker, etc. do not exist yet.
		// Activate after all file-creation tasks (Tasks 1–5) are complete.
		for (const file of REQUIRED_DOCKER_FILES) {
			const absPath = path.join(PROJECT_ROOT, file);
			expect(existsSync(absPath), `Missing required file: ${file}`).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// P0 — Task 1: web Dockerfile build — AC-3
// ---------------------------------------------------------------------------

describe('Story 1.7 — Docker Web Image Build (ATDD Red Phase)', () => {
	// -----------------------------------------------------------------------
	// 1.7-UNIT-BUILD-001 (P0): `docker build -f Dockerfile .` exits 0
	// AC-3: multi-stage build produces minimal web image
	// -----------------------------------------------------------------------
	test.skip('[P0] 1.7-UNIT-BUILD-001 — docker build -f Dockerfile . exits 0', () => {
		// THIS TEST WILL FAIL — Dockerfile does not exist yet.
		// Activate after Task 1 (create Dockerfile for web service).
		// Note: this test can take 2–5 min on first run (downloads oven/bun base image).
		const result = runCmd(`docker build -f Dockerfile -t ${WEB_IMAGE_NAME} .`, PROJECT_ROOT);
		expect(result.exitCode, `docker build failed:\n${result.stderr}`).toBe(0);
	}, 300_000); // 5-minute timeout for Docker build

	// -----------------------------------------------------------------------
	// 1.7-UNIT-BUILD-002 (P1): web image uses oven/bun base (not node)
	// AC-3 + Dev Notes: "oven/bun:1 base image used (NOT node/alpine)"
	// -----------------------------------------------------------------------
	test('[P1] 1.7-UNIT-BUILD-002 — web Docker image is based on oven/bun (not node)', () => {
		// THIS TEST WILL FAIL — Dockerfile does not exist yet.
		// Activate after Task 1.
		const dockerfile = path.join(PROJECT_ROOT, 'Dockerfile');
		expect(existsSync(dockerfile), 'Dockerfile missing').toBe(true);

		const content = readFileSync(dockerfile, 'utf-8');
		// Must reference oven/bun as the base image, never node:*
		expect(content).toMatch(/FROM\s+oven\/bun/);
		expect(content).not.toMatch(/FROM\s+node:/);
	});

	// -----------------------------------------------------------------------
	// 1.7-UNIT-BUILD-003 (P1): web image uses multi-stage build
	// AC-3: "multi-stage build produces a minimal web image ... no dev dependencies"
	// -----------------------------------------------------------------------
	test('[P1] 1.7-UNIT-BUILD-003 — web Dockerfile uses multi-stage build (AS builder + AS runtime)', () => {
		// THIS TEST WILL FAIL — Dockerfile does not exist yet.
		// Activate after Task 1.
		const dockerfile = path.join(PROJECT_ROOT, 'Dockerfile');
		expect(existsSync(dockerfile), 'Dockerfile missing').toBe(true);

		const content = readFileSync(dockerfile, 'utf-8');
		expect(content).toMatch(/AS\s+builder/i);
		expect(content).toMatch(/AS\s+runtime/i);
	});
});

// ---------------------------------------------------------------------------
// P0 — Task 2: worker Dockerfile build — AC-4
// ---------------------------------------------------------------------------

describe('Story 1.7 — Docker Worker Image Build (ATDD Red Phase)', () => {
	// -----------------------------------------------------------------------
	// 1.7-UNIT-BUILD-004 (P0): `docker build -f Dockerfile.worker .` exits 0
	// AC-4: minimal worker image produced
	// -----------------------------------------------------------------------
	test.skip('[P0] 1.7-UNIT-BUILD-004 — docker build -f Dockerfile.worker . exits 0', () => {
		// THIS TEST WILL FAIL — Dockerfile.worker does not exist yet.
		// Activate after Task 2 (create Dockerfile.worker).
		const result = runCmd(
			`docker build -f Dockerfile.worker -t ${WORKER_IMAGE_NAME} .`,
			PROJECT_ROOT
		);
		expect(result.exitCode, `docker build worker failed:\n${result.stderr}`).toBe(0);
	}, 300_000); // 5-minute timeout for Docker build

	// -----------------------------------------------------------------------
	// 1.7-UNIT-BUILD-005 (P1): worker Dockerfile uses oven/bun base
	// -----------------------------------------------------------------------
	test('[P1] 1.7-UNIT-BUILD-005 — worker Dockerfile is based on oven/bun (not node)', () => {
		// THIS TEST WILL FAIL — Dockerfile.worker does not exist yet.
		// Activate after Task 2.
		const dockerfile = path.join(PROJECT_ROOT, 'Dockerfile.worker');
		expect(existsSync(dockerfile), 'Dockerfile.worker missing').toBe(true);

		const content = readFileSync(dockerfile, 'utf-8');
		expect(content).toMatch(/FROM\s+oven\/bun/);
		expect(content).not.toMatch(/FROM\s+node:/);
	});
});

// ---------------------------------------------------------------------------
// P0 — Task 4: docker compose up (production stack) — AC-1
// NOTE: These tests are nightly — they require `docker compose up` with a
//       valid .env file and can take 2–3 minutes.
// ---------------------------------------------------------------------------

describe('Story 1.7 — Production Compose Stack (ATDD Red Phase — Nightly)', () => {
	// Safety net: ensure compose stack is torn down even if a test fails mid-run.
	// When these tests are activated, this afterAll prevents orphaned containers.
	afterAll(() => {
		runCmd(`docker compose -f ${PROD_COMPOSE_FILE} down --volumes --remove-orphans`, PROJECT_ROOT);
	});

	// -----------------------------------------------------------------------
	// 1.7-INT-001 (P0): `docker compose up` cold start — all services healthy
	// AC-1: web, worker, PostgreSQL start successfully; drizzle-kit migrate runs
	// -----------------------------------------------------------------------
	test.skip('[P0] 1.7-INT-001 — docker compose up cold start: all services healthy, migrations applied', async () => {
		// THIS TEST WILL FAIL — docker-compose.prod.yml does not exist yet.
		// Activate after Tasks 1–5 are complete and .env is configured.
		// WARNING: This test modifies running Docker services. Run in isolation.
		// Requires: valid .env file at PROJECT_ROOT with DATABASE_URL, POSTGRES_*.

		// Tear down any existing stack first
		runCmd(`docker compose -f ${PROD_COMPOSE_FILE} down --volumes --remove-orphans`, PROJECT_ROOT);

		// Cold start
		const upResult = runCmd(`docker compose -f ${PROD_COMPOSE_FILE} up -d --build`, PROJECT_ROOT);
		expect(upResult.exitCode, `docker compose up failed:\n${upResult.stderr}`).toBe(0);

		// Wait for web service to be healthy
		const healthResult = await waitForUrl(`http://localhost:${NGINX_PORT}${NGINX_HEALTH_PATH}`, {
			timeoutMs: 60_000,
			intervalMs: 2_000
		});
		expect(healthResult.statusCode, 'Web service did not become healthy within 60s').toBe(200);

		// Verify migrations ran: check that the pg_migrations table (or any schema table) exists
		// (exact table name depends on story 1.3 schema — use information_schema as a safe check)
		const migrateCheckResult = runCmd(
			`docker compose -f ${PROD_COMPOSE_FILE} exec -T db psql -U postgres -d conference_envocc -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`,
			PROJECT_ROOT
		);
		expect(
			migrateCheckResult.exitCode,
			`Migration check failed:\n${migrateCheckResult.stderr}`
		).toBe(0);

		// Tear down after test
		runCmd(`docker compose -f ${PROD_COMPOSE_FILE} down --volumes`, PROJECT_ROOT);
	}, 180_000); // 3-minute timeout

	// -----------------------------------------------------------------------
	// 1.7-INT-002 (P0): App reachable through nginx — HTTP 200 on health endpoint
	// AC-1: "app is reachable through nginx"
	// AC-5: "Bun server listens ... and nginx proxies to it"
	// -----------------------------------------------------------------------
	test.skip('[P0] 1.7-INT-002 — app reachable through nginx on port 80 (HTTP 200)', async () => {
		// THIS TEST WILL FAIL — docker-compose.prod.yml and nginx config not created yet.
		// Activate after Tasks 3–5 are complete and compose stack is running.
		// Requires the compose stack to be up (1.7-INT-001 must pass first).
		const healthResult = await waitForUrl(`http://localhost:${NGINX_PORT}${NGINX_HEALTH_PATH}`, {
			timeoutMs: 5_000,
			intervalMs: 1_000
		});
		expect(healthResult.statusCode, 'nginx did not return HTTP 200').toBe(200);
	}, 30_000);

	// -----------------------------------------------------------------------
	// 1.7-INT-003 (P0): Missing DATABASE_URL → web container exits non-zero (fail-fast)
	// AC-2: "when DATABASE_URL is missing, web/worker process exits immediately"
	// -----------------------------------------------------------------------
	test.skip('[P0] 1.7-INT-003 — missing DATABASE_URL causes web container to exit non-zero (fail-fast)', () => {
		// THIS TEST WILL FAIL — Dockerfile and docker-compose.prod.yml do not exist yet.
		// Also requires validateEnv to be implemented (Task 6).
		// Activate after Tasks 1 and 6 are complete.

		// Run web container with DATABASE_URL explicitly removed from env
		// Uses `docker run` directly to test the image in isolation
		const result = spawnSync(
			'docker',
			[
				'run',
				'--rm',
				'-e',
				'PORT=3000',
				'-e',
				'HOST=0.0.0.0',
				// DATABASE_URL intentionally NOT passed
				WEB_IMAGE_NAME
			],
			{ cwd: PROJECT_ROOT, encoding: 'utf-8', timeout: 30_000 }
		);

		// Container must exit non-zero immediately (fail-fast)
		expect(
			result.status,
			'Web container should exit non-zero when DATABASE_URL is missing'
		).not.toBe(0);

		// Stderr or stdout must contain a meaningful error message
		const output = (result.stdout ?? '') + (result.stderr ?? '');
		expect(output).toMatch(/DATABASE_URL|startup|missing/i);
	}, 60_000);
});

// ---------------------------------------------------------------------------
// P1 — Task 3: nginx proxy headers — AC-5
// ---------------------------------------------------------------------------

describe('Story 1.7 — Nginx Proxy Headers (ATDD Red Phase)', () => {
	// -----------------------------------------------------------------------
	// 1.7-INT-004 (P1): nginx propagates X-Forwarded-* headers
	// AC-5: nginx proxies with X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host
	// -----------------------------------------------------------------------
	test.skip('[P1] 1.7-INT-004 — nginx propagates X-Forwarded-For and X-Forwarded-Proto headers', async () => {
		// THIS TEST WILL FAIL — nginx/conf.d/app.conf and docker-compose.prod.yml not created yet.
		// Activate after Tasks 3–5 and when compose stack is running.
		// Requires: compose stack up (see 1.7-INT-001).

		// Use curl to make a request through nginx and check response headers
		// The web server must echo back the forwarded headers (requires a /headers or /health endpoint)
		const curlResult = runCmd(
			`curl -si -H "X-Forwarded-For: 192.0.2.1" -H "X-Forwarded-Proto: https" http://localhost:${NGINX_PORT}${NGINX_HEALTH_PATH}`,
			PROJECT_ROOT
		);
		expect(curlResult.exitCode, `curl request failed:\n${curlResult.stderr}`).toBe(0);
		expect(curlResult.stdout).toMatch(/200/);

		// Also assert nginx config file contains required proxy_set_header directives
		const nginxConf = path.join(PROJECT_ROOT, 'nginx', 'conf.d', 'app.conf');
		expect(existsSync(nginxConf), 'nginx/conf.d/app.conf missing').toBe(true);

		const confContent = readFileSync(nginxConf, 'utf-8');
		expect(confContent).toMatch(/proxy_set_header\s+X-Forwarded-For/);
		expect(confContent).toMatch(/proxy_set_header\s+X-Forwarded-Proto/);
		expect(confContent).toMatch(/proxy_set_header\s+X-Forwarded-Host/);
		expect(confContent).toMatch(/proxy_set_header\s+Host/);
	}, 30_000);

	// -----------------------------------------------------------------------
	// 1.7-INT-005 (P1): nginx config exists and listens on port 80
	// -----------------------------------------------------------------------
	test('[P1] 1.7-INT-005 — nginx conf listens on port 80 and proxies to web:3000', () => {
		// THIS TEST WILL FAIL — nginx/conf.d/app.conf does not exist yet.
		// Activate after Task 3 (create nginx/conf.d/app.conf).
		const nginxConf = path.join(PROJECT_ROOT, 'nginx', 'conf.d', 'app.conf');
		expect(existsSync(nginxConf), 'nginx/conf.d/app.conf missing').toBe(true);

		const content = readFileSync(nginxConf, 'utf-8');
		expect(content).toMatch(/listen\s+80/);
		expect(content).toMatch(/proxy_pass\s+http:\/\/web/);
	});
});

// ---------------------------------------------------------------------------
// P1 — Task 5: dev compose.yaml — AC-6
// ---------------------------------------------------------------------------

describe('Story 1.7 — Dev Compose (compose.yaml) (ATDD Red Phase)', () => {
	// -----------------------------------------------------------------------
	// 1.7-UNIT-COMPOSE-001 (P1): dev compose.yaml does NOT contain web or worker services
	// AC-6: "web and worker containers are NOT in the dev compose file"
	// -----------------------------------------------------------------------
	test('[P1] 1.7-UNIT-COMPOSE-001 — dev compose.yaml does not include web or worker services', () => {
		// THIS TEST WILL FAIL — compose.yaml has not been updated yet to add mailpit / remove web/worker.
		// Activate after Task 5 (update compose.yaml).
		const devCompose = path.join(PROJECT_ROOT, 'compose.yaml');
		expect(existsSync(devCompose), 'compose.yaml missing').toBe(true);

		const content = readFileSync(devCompose, 'utf-8');
		// Must NOT define web or worker services (developers run those locally)
		expect(content).not.toMatch(/^\s+web:\s*$/m);
		expect(content).not.toMatch(/^\s+worker:\s*$/m);
		// Must still include db service
		expect(content).toMatch(/^\s+db:\s*$/m);
	});

	// -----------------------------------------------------------------------
	// 1.7-UNIT-COMPOSE-002 (P1): dev compose.yaml includes mailpit service
	// Story dev note: "Add Mailpit for dev email testing (story 1.5 uses it)"
	// -----------------------------------------------------------------------
	test('[P1] 1.7-UNIT-COMPOSE-002 — dev compose.yaml includes mailpit service', () => {
		// THIS TEST WILL FAIL — compose.yaml has not been updated yet.
		// Activate after Task 5.
		const devCompose = path.join(PROJECT_ROOT, 'compose.yaml');
		expect(existsSync(devCompose), 'compose.yaml missing').toBe(true);

		const content = readFileSync(devCompose, 'utf-8');
		expect(content).toMatch(/mailpit/);
		expect(content).toMatch(/axllent\/mailpit/);
	});
});

// ---------------------------------------------------------------------------
// P1 — Task 4: prod compose has DB healthcheck + migration pre-start
// ---------------------------------------------------------------------------

describe('Story 1.7 — Production Compose Config (ATDD Red Phase)', () => {
	// -----------------------------------------------------------------------
	// 1.7-UNIT-COMPOSE-003 (P1): prod compose has DB healthcheck and service_healthy condition
	// AC-1: "drizzle-kit migrate runs as a pre-start step"
	// -----------------------------------------------------------------------
	test('[P1] 1.7-UNIT-COMPOSE-003 — docker-compose.prod.yml has db healthcheck and web depends on service_healthy', () => {
		// THIS TEST WILL FAIL — docker-compose.prod.yml does not exist yet.
		// Activate after Task 4 (create docker-compose.prod.yml).
		const prodCompose = path.join(PROJECT_ROOT, PROD_COMPOSE_FILE);
		expect(existsSync(prodCompose), 'docker-compose.prod.yml missing').toBe(true);

		const content = readFileSync(prodCompose, 'utf-8');
		expect(content).toMatch(/healthcheck/);
		expect(content).toMatch(/service_healthy/);
		expect(content).toMatch(/drizzle-kit migrate/);
	});

	// -----------------------------------------------------------------------
	// 1.7-UNIT-COMPOSE-004 (P1): prod compose uses env_file and no hardcoded secrets
	// AC-1 + Dev Notes: "All secrets loaded from .env file (not hardcoded)"
	// -----------------------------------------------------------------------
	test('[P1] 1.7-UNIT-COMPOSE-004 — docker-compose.prod.yml uses env_file and no hardcoded passwords', () => {
		// THIS TEST WILL FAIL — docker-compose.prod.yml does not exist yet.
		// Activate after Task 4.
		const prodCompose = path.join(PROJECT_ROOT, PROD_COMPOSE_FILE);
		expect(existsSync(prodCompose), 'docker-compose.prod.yml missing').toBe(true);

		const content = readFileSync(prodCompose, 'utf-8');
		expect(content).toMatch(/env_file/);
		// Ensure no hardcoded passwords (basic check — no common patterns)
		expect(content).not.toMatch(/password:\s*["']?[a-zA-Z0-9]{8,}/);
	});
});

// ---------------------------------------------------------------------------
// P2 — Worker container restart — 1.7-INT-006
// ---------------------------------------------------------------------------

describe('Story 1.7 — Worker Restart (ATDD Red Phase — Nightly)', () => {
	// -----------------------------------------------------------------------
	// 1.7-INT-006 (P2): Worker container restarts cleanly after crash
	// "docker compose restart worker; assert job processing resumes"
	// -----------------------------------------------------------------------
	test.skip('[P2] 1.7-INT-006 — worker container restarts cleanly after crash (pg-boss reconnects)', () => {
		// THIS TEST WILL FAIL — docker-compose.prod.yml and worker not yet implemented.
		// Activate after all Tasks 1–6 are complete and compose stack is running.
		// Requires: compose stack up.

		// Stop the worker container to simulate a crash
		const stopResult = runCmd(`docker compose -f ${PROD_COMPOSE_FILE} stop worker`, PROJECT_ROOT);
		expect(stopResult.exitCode, 'Failed to stop worker').toBe(0);

		// Restart the worker
		const restartResult = runCmd(
			`docker compose -f ${PROD_COMPOSE_FILE} start worker`,
			PROJECT_ROOT
		);
		expect(restartResult.exitCode, 'Failed to restart worker').toBe(0);

		// Allow a few seconds for pg-boss reconnection
		// Then verify worker container is running (exit 0)
		const psResult = runCmd(
			`docker compose -f ${PROD_COMPOSE_FILE} ps --status running worker`,
			PROJECT_ROOT
		);
		expect(psResult.exitCode, 'Worker container not running after restart').toBe(0);
		expect(psResult.stdout).toMatch(/worker/);
	}, 60_000);
});

// ---------------------------------------------------------------------------
// P3 — Docker image size — 1.7-INT-007
// ---------------------------------------------------------------------------

describe('Story 1.7 — Docker Image Size (ATDD Red Phase — On-Demand)', () => {
	// -----------------------------------------------------------------------
	// 1.7-INT-007 (P3): Docker image size within reasonable bound (<500MB)
	// Dev Notes: informational
	// -----------------------------------------------------------------------
	test.skip('[P3] 1.7-INT-007 — web Docker image size is under 500MB', () => {
		// THIS TEST WILL FAIL — web Docker image does not exist yet.
		// Activate after Task 1 and docker build completes (1.7-UNIT-BUILD-001 passes).
		// This is informational — not a hard gate.

		const inspectResult = runCmd(
			`docker image inspect ${WEB_IMAGE_NAME} --format "{{.Size}}"`,
			PROJECT_ROOT
		);
		expect(inspectResult.exitCode, `docker image inspect failed:\n${inspectResult.stderr}`).toBe(0);

		const sizeBytes = parseInt(inspectResult.stdout.trim(), 10);
		const sizeMB = sizeBytes / (1024 * 1024);

		// 500MB upper bound — informational assertion
		expect(sizeMB, `Web image is ${sizeMB.toFixed(0)}MB — exceeds 500MB bound`).toBeLessThan(500);
	});
});
