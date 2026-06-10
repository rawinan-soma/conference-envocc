# Deferred Work

## Deferred from: code review of 1-4-internationalization-setup (2026-06-10)

- `no-raw-svelte-text` ESLint rule does not catch hardcoded user-facing text in element attributes (e.g. `title`, `placeholder`, `aria-label`) — only inline text nodes (`SvelteText`). AC-3 scopes the guard to inline text content and TS string literals, so this is acceptable for Story 1.4. Revisit if attribute-level i18n enforcement becomes a requirement; note the high false-positive risk for non-UI attributes (class, href, data-*).
