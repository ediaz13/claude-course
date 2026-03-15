# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

Use comments sparingly. Only comment complex code.

## Commands

```bash
npm run setup        # First-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Start dev server at http://localhost:3000 (uses Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all tests with Vitest
npx vitest run src/path/to/file.test.ts  # Run a single test file
npm run db:reset     # Reset and re-run all migrations (destructive)
```

The dev/build/start scripts require `NODE_OPTIONS='--require ./node-compat.cjs'` (already included in npm scripts) for Node.js compatibility.

## Environment

Copy `.env` and set `ANTHROPIC_API_KEY`. Without it, the app uses `MockLanguageModel` in `src/lib/provider.ts` which returns static hardcoded component examples. The real model used is `claude-haiku-4-5`.

## Architecture

### Core Concept: Virtual File System
All generated code lives in an **in-memory** `VirtualFileSystem` (never written to disk). `src/lib/file-system.ts` implements this class with standard file operations. It serializes to/from plain `Record<string, FileNode>` for JSON transport and DB storage.

### State Management: Two React Contexts
- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`): Owns the `VirtualFileSystem` instance, exposes file CRUD, and handles AI tool calls (`str_replace_editor`, `file_manager`) that mutate the FS. A `refreshTrigger` counter causes dependent components to re-render.
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`): Wraps Vercel AI SDK's `useChat`, sends the serialized FS on every request, and pipes incoming `onToolCall` events to `FileSystemContext.handleToolCall`.

### Live Preview Pipeline
`PreviewFrame` → `createImportMap` → `createPreviewHTML` → `<iframe srcdoc>`

1. All JS/JSX/TS/TSX files are transformed in-browser using `@babel/standalone`
2. Each file becomes a `blob:` URL
3. An ES module import map is constructed mapping file paths (and `@/` aliases) to their blob URLs
4. Third-party imports are auto-routed to `https://esm.sh/<pkg>`
5. Missing local imports get auto-generated placeholder modules
6. The resulting HTML is injected into a sandboxed iframe with Tailwind CDN

Entry point lookup order: `/App.jsx`, `/App.tsx`, `/index.jsx`, `/index.tsx`, `/src/App.jsx`, `/src/App.tsx`.

### API Route: `/api/chat`
`src/app/api/chat/route.ts` — receives `{ messages, files, projectId }`, reconstructs the VFS, calls `streamText` with two tools:
- `str_replace_editor`: create/str_replace/insert/view file operations
- `file_manager`: rename/delete operations

On finish, saves messages + serialized FS to the DB if `projectId` is provided and the user is authenticated.

### Auth
Custom JWT-based auth in `src/lib/auth.ts` using `jose`. Sessions stored in `auth-token` httpOnly cookie (7-day expiry). No OAuth — only email/password via bcrypt. Anonymous users can generate components; their work is tracked in `sessionStorage` via `src/lib/anon-work-tracker.ts` and can be saved after sign-up.

### Database
Prisma with SQLite (`prisma/dev.db`). Two models: `User` and `Project`. Projects store `messages` and `data` (serialized VFS) as JSON strings. Prisma client is generated to `src/generated/prisma`.

### Routing
- `/` — anonymous or authenticated home with new project creation
- `/[projectId]` — loads an existing project (requires auth; redirects to `/` if not found or unauthorized)

### Tests
Vitest + jsdom + React Testing Library. Tests live in `__tests__` folders co-located with source. Run with `npm test` or target a specific file with `npx vitest run`.
