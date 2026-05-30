# Contributing to open-doc

Thanks for your interest in improving open-doc! This guide covers how to get a
dev environment running and what we expect in a pull request.

## Prerequisites

- **Node 20+** and npm
- For add-in work: Microsoft Word (desktop) and the dev certificate
  (`npx office-addin-dev-certs install`)

## Getting started

```sh
npm ci
npm run dev:server   # API on :3000
npm run dev:web      # web UI on :3002
```

The repo is an [Nx](https://nx.dev) workspace with four projects:

- `apps/server` — NestJS API and the `.docx` engine (`src/docx`)
- `apps/web` — React + Vite + Fluent UI web app
- `apps/addin` — Office.js Word add-in (Vite, served over HTTPS)
- `libs/shared` — shared types and schema helpers

`apps/web` and `apps/addin` are built with Vite directly (not Nx targets);
`apps/server` and `libs/shared` use Nx.

## Before opening a PR

Run the same checks CI runs:

```sh
npm run typecheck    # tsc on server + web
npm test             # vitest unit tests (apps/server/src)
npm run build:server
npm run build:web
```

All four must pass. CI runs them on every pull request (see
`.github/workflows/ci.yml`). It does **not** require Nx Cloud.

### Code style

- TypeScript throughout; prefer the existing patterns in nearby files.
- Formatting follows the repo `.prettierrc`. The CI format check is currently
  informational (the tree isn't fully formatted yet) — please at least format
  the files you touch: `npx prettier --write <files>`.
- Match the surrounding code's naming and comment density.

## Working on the docx engine

The engine is the trickiest part. Key invariants, all covered by tests in
`apps/server/src/docx/renderer.spec.ts`:

- **Document order is preserved** — the XML is parsed with `preserveOrder: true`.
  Never reintroduce a parse/build that groups siblings by tag name.
- **Whitespace is preserved** — `trimValues: false`; Word splits text into many
  runs, including whitespace-only ones.
- **Run formatting is preserved** — fills replace text in existing runs rather
  than fabricating new ones.
- **Tagged controls are unwrapped** in generated output; untagged structural
  controls are left intact.

If you change the engine, add or update a spec that pins the behavior. You can
sanity-check against the shipped examples:

```sh
npm run examples     # (re)generate examples/templates
npm test
```

## Reporting bugs

Open an issue with a minimal reproduction. For rendering bugs, attaching the
problematic `.docx` (with any sensitive content removed) is the fastest path to
a fix.
