# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My Hub is a browser extension (Chrome MV3 & Firefox) that enhances bookmark and history management with AI capabilities. Built with Vite, React 19, TypeScript, and Tailwind CSS 4.

## Development Commands

```bash
# Development (Chrome) - auto-reload via nodemon
npm run dev           # or npm run dev:chrome

# Development (Firefox)
npm run dev:firefox

# Production builds
npm run build         # Chrome (default)
npm run build:chrome
npm run build:firefox
```

Development outputs to `dist_chrome/` or `dist_firefox/`. Load unpacked extensions from these directories in browser extension management pages.

## Architecture Overview

### Multi-Browser Build System

- **Base config**: `vite.config.base.ts` - Shared Vite setup (React, Tailwind, path aliases)
- **Chrome**: `vite.config.chrome.ts` - MV3 service worker → `dist_chrome/`
- **Firefox**: `vite.config.firefox.ts` - Script background → `dist_firefox/`
- **crxjs**: Uses `@crxjs/vite-plugin` for extension-specific bundling

### Page Structure (src/pages/)

All pages are separate entry points bundled by Vite:

- **newtab/**: Main application - overrides browser new tab with 4 sections (Home, History, Bookmarks, Settings)
- **background/**: Service worker handling bookmark sync and IndexedDB maintenance
- **popup/**: Quick bookmark add popup (extension icon)
- **options/**: Extension settings page
- **content/**: Content scripts for page interaction

### Core Services & Data Layer

#### LLM Service (src/services/llmService.ts)

Unified AI interface supporting:
- **Gemini Nano** (Prompt API): Local on-device inference (priority mode)
- **Cloud LLMs**: SiliconFlow, OpenRouter, or custom endpoints
- **Streaming & non-streaming** modes (non-streaming for JSON responses in auto-organize)
- Settings stored in localStorage

Key function: `sendMessage(messages, callbacks, abortSignal, options)`

#### IndexedDB (src/db/indexedDB.ts)

- **DB**: `ChromeHistoryDB`
- **Store**: `bookmark_tags` (keyPath: `url`)
- Stores bookmark tags independently from Chrome's bookmark API
- Background script maintains `id → url` mapping for sync
- Handles URL changes and folder deletion cascades

#### Background Sync (src/pages/background/index.ts)

Listens to `chrome.bookmarks` events:
- `onCreated`: Updates id→url mapping
- `onRemoved`: Cascades tag deletion for folders
- `onChanged`: Migrates tag data when URL changes

#### Global Search (src/hooks/useGlobalSearch.ts)

Parallel search across:
1. `chrome.history.search` (history records)
2. Local bookmarks with tags (IndexedDB)

Results merged and displayed in Home page.

### Component Patterns

- **Contexts**: `ToastContext`, `ThemeContext` provide global state
- **ErrorBoundary**: Top-level error catching for robustness
- **Modals**: `OrganizeBookmarksModal`, `OrganizeProgressModal` for AI organization flows
- **Trees**: `BookmarkTree` for hierarchical bookmark display

### Path Aliases (tsconfig.json)

```
@src/*      → src/*
@assets/*   → src/assets/*
@locales/*  → src/locales/*
@pages/*    → src/pages/*
```

## Key Implementation Details

### AI Features

1. **Auto-organize**: LLM generates new folder structure via non-streaming mode (needs complete JSON)
2. **Tag generation**: Bulk tagging via streaming mode
3. **Suggestions**: Context-aware prompts in `src/lib/*Prompts.ts`

### Storage Strategy

- **IndexedDB**: Bookmark tags (persistent, URL-keyed)
- **localStorage**: LLM settings (API keys, provider config)
- **chrome.storage**: User preferences (sort order, filters)

### Type Definitions

Core types in `src/types/`:
- `bookmarks.ts`: BookmarkTag, folder structures
- `search.ts`: SearchResultItem (history | bookmark)
- `llm.ts`: ChatMessage, provider interfaces

### CSP & Security

`manifest.json` enforces strict CSP:
```
script-src 'self'; object-src 'self'; worker-src 'self'
```

No inline scripts, no eval. TypeScript strict mode enabled.

## Common Patterns

### Early Returns

Prefer shallow nesting with early returns:
```typescript
if (!condition) return;
// main logic here
```

### Error Handling

Use `createLogger` from `src/utils/logger.ts`:
```typescript
const logger = createLogger('[Component]');
logger.info('...');
logger.error('Error:', error);
```

### Async Operations

Always handle promises with try-catch or .catch():
```typescript
await chrome.bookmarks.get(id).catch(err => logger.error(err));
```

## Localization (Optional)

Set `localize: true` in `vite.config.base.ts` to enable i18n from `src/locales`. Currently disabled by default.

## Testing & Debugging

1. Run dev script (nodemon watches for changes)
2. Load extension from dist directory
3. Check browser console for logs (prefixed with [Logger Tags])
4. Use Chrome DevTools → Extensions to debug background service worker
5. Firefox: `about:debugging` → This Firefox

## Important Notes

- **No `any` types**: Strict TypeScript throughout
- **URL as IndexedDB key**: Bookmark tags keyed by URL, not chrome.bookmarks ID
- **Gemini Nano fallback**: Always design cloud LLM fallback when Prompt API unavailable
- **Batch operations**: Use `batchUpdateTags` and `deleteMultipleBookmarkTags` for performance
- **SSE parsing**: Cloud LLM streams use `data: [JSON]\n` format (OpenAI-compatible)
