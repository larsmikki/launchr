# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Launchr** is a self-hosted web launcher — a browser homepage for organizing URLs into a drag-and-drop grid with auto-fetched favicons. Monorepo with a React/Vite frontend and Express/TypeScript backend.

## Commands

### Setup
```bash
npm run setup       # Install deps for both server and client
npm install         # Install root dev deps (concurrently)
```

### Development
```bash
npm run dev         # Run both server + client concurrently (recommended)
npm run dev:server  # Server only (port 3020, tsx watch)
npm run dev:client  # Client only (port 5173, Vite)
```

### Build & Start
```bash
npm run build       # Build both (client: Vite, server: tsc)
npm start           # Serve production build on port 3020
```

### Docker
```bash
docker-compose up   # Full containerized deployment
```

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript, Vite, no state management library (plain hooks)
- **Backend**: Express + TypeScript, sql.js (SQLite in-memory, persisted to disk), Sharp (image resizing), Multer (file uploads)

### Key Data Flow
1. Frontend (`client/src/hooks/useApi.ts`) calls REST endpoints on the Express server
2. Server (`server/src/routes.ts`) updates the SQLite DB via `server/src/db.ts`
3. DB is held in memory (sql.js) and flushed to `server/data/data.db` after each write
4. Frontend refreshes state from server responses or triggers a full reload

### Database Schema (3 tables)
- **settings** — key/value pairs (bg_color, layout_mode, show_title, link_target, etc.)
- **groups** — collapsible containers with grid position/size, title, color
- **shortcuts** — URLs with title, icon filename, grid position, group FK

### Icon System
- Icons live in `server/data/icons/` as files; DB stores only the filename
- Two icon types: `favicon` (auto-fetched) and `manual` (user-uploaded)
- Favicon fetch logic (`server/src/favicon.ts`) tries HTML link tags → common paths (`/favicon.ico`, etc.) → Apple touch icon → Google fallback; resizes to 64×64 via Sharp

### Frontend Component Map
- `App.tsx` — root state (groups, shortcuts, settings, arrange mode, context menus)
- `GroupBox.tsx` — renders a group and its `ShortcutTile` children, handles drag-and-drop
- `ShortcutTile.tsx` — individual shortcut card with context menu trigger
- `Layout.tsx` — static header (logo + Settings nav), wraps all routes
- `pages/DesktopPage.tsx` — main page; owns arrange mode, inline action bar (New Link, Edit Layout, Add Group)
- `pages/SettingsPage.tsx` — settings page
- `pages/DonatePage.tsx` — donate page
- `useApi.ts` — all fetch calls centralized here; returns typed responses

### Production Serving
The Express server in production mode serves the Vite-built frontend (`client/dist/`) as static files and falls back to `index.html` for SPA routing. Port is configurable via `PORT` env var (default 3020).

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
