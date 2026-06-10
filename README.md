# conference-envocc

SvelteKit + Bun application. This project uses **Bun exclusively** as the runtime and package manager — do not use npm, yarn, or pnpm.

## Setup

Install dependencies:

```sh
bun install
```

Start the local Postgres database (Docker):

```sh
bun run db:start
```

Copy `.env.example` to `.env` and adjust values as needed.

## Developing

Start the development server (serves on port 5173):

```sh
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Building

To create a production version of your app:

```sh
bun run build
```

You can preview the production build with `bun run preview`. The production build is a standalone Bun server bundle produced via [`svelte-adapter-bun`](https://github.com/gornostay25/svelte-adapter-bun).

## Quality gates

```sh
bun run lint        # ESLint
bun run format      # Prettier (check)
bun run check       # svelte-check (TypeScript + Svelte types)
bun run test        # Vitest
bun run test:e2e    # Playwright
```
