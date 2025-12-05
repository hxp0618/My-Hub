# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-enhanced browser extension for managing bookmarks and browsing history. Built with Vite + React 19 + TypeScript 5 + Tailwind CSS 4. Supports both Chrome (MV3 with service worker) and Firefox (script background) with separate build outputs.

## Development Commands

```bash
# Development (hot reload)
npm run dev              # Chrome (default)
npm run dev:firefox      # Firefox

# Production builds
npm run build            # Chrome (default)
npm run build:chrome     # Chrome → dist_chrome/
npm run build:firefox    # Firefox → dist_firefox/

# Linting
npx eslint src/         # Run ESLint on source files
```

**Loading in browser:**
- Chrome: `chrome://extensions` → "Load unpacked" → select `dist_chrome/`
- Firefox: `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on" → select `dist_firefox/manifest.json`

## Architecture Overview

### Multi-Page Extension Structure

Extension pages are organized under `src/pages/`:
- **newtab/**: New tab override page with tabs for Home/History/Bookmarks/Settings
- **popup/**: Quick bookmark addition popup
- **options/**: Extension settings page
- **background/**: Background service worker (handles bookmark event listeners and data sync)
- **content/**: Content scripts injected into web pages
- **devtools/**: Browser DevTools integration
- **panel/**: Side panel (if used)

### Data Flow and Storage Architecture

**Dual storage system:**
1. **Chrome APIs**: Native bookmarks (`chrome.bookmarks`) and history (`chrome.history`)
2. **IndexedDB**: Custom bookmark tags system
   - Database: `ChromeHistoryDB`
   - Store: `bookmark_tags` (keyPath: `url`)
   - Managed by: `src/db/indexedDB.ts`

**Background sync (src/pages/background/index.ts):**
- Maintains in-memory `id → url` mapping for all bookmarks
- Listens to `chrome.bookmarks` events (onCreated, onRemoved, onChanged)
- Handles URL changes by migrating tag data from old URL to new URL
- Recursively deletes tags when folders are removed

### LLM Integration

**Unified service layer (src/services/llmService.ts):**
- **Local-first approach**: Attempts Gemini Nano (Prompt API) when `prioritizeGeminiNano` is enabled
- **Fallback to cloud**: Uses configured provider (SiliconFlow, OpenRouter, or custom)
- **Dual modes**: Streaming (for UI updates) and non-streaming (for JSON parsing in auto-organize)
- Provider configuration in `src/data/models.ts` (`PROVIDERS` constant)
- Settings stored in localStorage via `src/lib/llmUtils.ts`

**LLM use cases:**
- Bookmark organization: `src/lib/bookmarkOrganizePrompts.ts` + `src/lib/bookmarkOrganizationPrompts.ts`
- Tag generation: `src/lib/tagGenerationPrompts.ts`
- Bookmark suggestions: `src/lib/bookmarkSuggestionPrompts.ts`

### Global Search (src/hooks/useGlobalSearch.ts)

Parallel search across:
1. Chrome history API (`chrome.history.search`)
2. In-memory bookmarks (title/URL/tags)

Results merged and debounced (300ms). Search supports tags stored in IndexedDB.

### Build Configuration

Three-tier setup:
1. **vite.config.base.ts**: Shared config (React, Tailwind, path aliases via `tsconfig.json`)
2. **vite.config.chrome.ts**: Chrome MV3 config → `dist_chrome/`
3. **vite.config.firefox.ts**: Firefox config → `dist_firefox/`

**Path aliases** (from tsconfig.json):
```
@src/*      → src/*
@assets/*   → src/assets/*
@locales/*  → src/locales/*
@pages/*    → src/pages/*
```

**Localization**: Set `localize = true` in `vite.config.base.ts` and add translations to `src/locales/`

## Code Style Guidelines

**TypeScript requirements:**
- Strict mode enabled (`strict: true`)
- Avoid `any` types
- Use early returns to reduce nesting depth
- Maintain consistent file structure with existing code

**React patterns:**
- React 19 features available (no need for `React` import in JSX)
- Custom hooks in `src/hooks/`
- Shared components in `src/components/`

**ESLint configuration:**
- Based on `eslint:recommended` + React + TypeScript rules
- `chrome` global is readonly
- JSX does not require React import (`react/react-in-jsx-scope: off`)

## Key Implementation Notes

**Background script caveats:**
- Chrome uses service worker (no persistent state)
- In-memory mapping rebuilt on extension restart
- Firefox uses script background (different lifecycle)

**IndexedDB tag management:**
- Tags keyed by URL (not bookmark ID)
- Batch operations available: `batchUpdateTags`, `deleteMultipleBookmarkTags`
- Clear all with `clearAllBookmarkTags`

**LLM error handling:**
- Gemini Nano fallback is automatic when unavailable
- Non-streaming mode is used when JSON parsing is required (e.g., bookmark auto-organize)
- AbortSignal support for request cancellation
