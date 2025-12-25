# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My Hub is a browser extension (Chrome MV3 & Firefox) that enhances bookmark and history management with AI capabilities. Built with Vite, React 19, TypeScript, and Tailwind CSS 4.

## Project Structure & Module Organization

- `src/` holds all TypeScript sources, organized by feature: page entrypoints under `src/pages`, shared UI in `src/components`, domain logic in `src/services` and `src/utils`, and translations in `src/i18n` plus `src/locales`.
- `public/` contains static assets that Vite copies verbatim into the extension bundle; keep icons and manifest-linked files here.
- `docs/` aggregates written reference material and UX drafts.
- Build output is emitted to `dist_chrome/` (or `dist_firefox/` for Firefox). Do not edit generated files directly.
- Vite configs live at the repo root (`vite.config.*.ts`), alongside `custom-vite-plugins.ts` that tunes extension-specific behavior.

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

# Linting
npx eslint "src/**/*.{ts,tsx}"
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

## Coding Style & Naming Conventions

- TypeScript + React with JSX; prefer function components
- Keep indentation at two spaces and rely on Prettier-compatible formatting
- React components and pages use `PascalCase` (`HomePage.tsx`)
- Hooks use `camelCase` prefixed with `use`
- Utility modules lean `kebab-case` or `camelCase` to match existing folders
- Favor Tailwind utility classes for styling; colocate component-specific CSS alongside the component (`Newtab.css` pattern)
- Import via path aliases (`@pages`, `@assets`) defined in `tsconfig.json`

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

## Testing Guidelines

- Automated tests are not yet provisioned. When adding coverage, colocate files under `src/**/__tests__` and run them through Vitest (preferred) or Jest after adding the necessary tooling.
- In the interim, document manual QA steps in PR descriptions. Validate flows in both Chrome and Firefox, including translation toggles (`src/i18n`) and extension permissions.

## Testing & Debugging

1. Run dev script (nodemon watches for changes)
2. Load extension from dist directory
3. Check browser console for logs (prefixed with [Logger Tags])
4. Use Chrome DevTools → Extensions to debug background service worker
5. Firefox: `about:debugging` → This Firefox

## Commit & Pull Request Guidelines

- Follow the existing imperative style: start summaries with a present-tense verb (e.g., `add expand/collapse for bookmark folders`). Keep lines under ~72 characters.
- Reference related issues in the body and describe user-facing changes. Capture UI tweaks with before/after screenshots or Loom clips when practical.
- Before submitting a PR, ensure the relevant build command completes, lint runs clean, and any manual verification steps are noted. Tag reviewers who own the affected pages or services.

## Extension Packaging Tips

- After running a production build, compress the generated `dist_chrome/` (or Firefox output) into a versioned archive for store uploads.
- Update `manifest.json` and `manifest.dev.json` in sync; keep permissions minimal and document any additions in the PR.

## i18n

- All development requires support for internationalization.
- Set `localize: true` in `vite.config.base.ts` to enable i18n from `src/locales`. Currently disabled by default.

## Design Requirements

- The generated document needs to be in Chinese.
- All development should consider theme adaptation (light/dark/eye-care modes).

## Important Notes

- **No `any` types**: Strict TypeScript throughout
- **URL as IndexedDB key**: Bookmark tags keyed by URL, not chrome.bookmarks ID
- **Gemini Nano fallback**: Always design cloud LLM fallback when Prompt API unavailable
- **Batch operations**: Use `batchUpdateTags` and `deleteMultipleBookmarkTags` for performance
- **SSE parsing**: Cloud LLM streams use `data: [JSON]\n` format (OpenAI-compatible)

---

# Neo-Brutalism 设计规范

> **重要**: 本项目严格遵循 Neo-Brutalism (新野兽派) 设计风格。所有 UI 开发必须符合以下规范。

## 1. 核心设计原则

### 设计哲学
- **粗犷与现代的结合**: 使用粗重边框、硬阴影，但保持现代感的圆角
- **高对比度**: 文字必须清晰可读，背景与前景对比强烈
- **扁平无渐变**: 禁止使用渐变色，所有颜色必须是纯色
- **阴影无模糊**: 所有阴影必须是硬边阴影，禁止模糊效果

---

## 2. 设计令牌 (Design Tokens)

### 颜色系统

#### 基础色
| 变量 | 浅色模式 | 深色模式 | 用途 |
|------|----------|----------|------|
| `--nb-bg` | `#f6f3f1` | `#1a1a1a` | 主背景色 |
| `--nb-card` | `#ffffff` | `#2a2a2a` | 卡片/面板背景 |
| `--nb-border` | `#242425` | `#4a4a4a` | 边框颜色 |
| `--nb-text` | `#242425` | `#e5e5e5` | 主文字颜色 |
| `--nb-text-secondary` | `#6B7280` | `#9CA3AF` | 次要文字颜色 |

#### 强调色 (Accent Colors)
| 名称 | 色值 | 用途 |
|------|------|------|
| **Pink** | `#f771a7` | 危险操作、删除、强调 |
| **Yellow** | `#f8d773` | 主要操作、高亮、警告 |
| **Blue** | `#71b4ea` | 信息展示、链接、次要操作 |
| **Green** | `#5fe0a8` | 成功状态、确认操作 |

### 边框规范

```css
/* 边框宽度 */
--nb-border-width: 2px;           /* 标准边框 */
--nb-border-width-thick: 3px;     /* 粗边框 (外层容器) */

/* 圆角 */
--nb-border-radius-lg: 12px;      /* 外层容器 */
--nb-border-radius-md: 8px;       /* 内层元素 */
--nb-border-radius-full: 9999px;  /* 胶囊形状 */
```

**强制规则**:
- ✅ 所有容器、卡片、按钮必须有 `2px solid` 边框
- ✅ 外层容器使用 `3px` 边框
- ❌ 禁止无边框的漂浮元素 (纯文本除外)

### 阴影规范 (硬阴影 - 无模糊)

```css
/* 标准状态 */
--nb-shadow: 4px 4px 0px 0px #242425;

/* 悬停状态 */
--nb-shadow-hover: 2px 2px 0px 0px #242425;

/* 按下状态 */
--nb-shadow-none: 0px 0px 0px 0px #242425;
```

**交互规则**:
- 悬停时: 元素向右下方移动 `2px`，阴影缩小
- 按下时: 元素继续移动，阴影消失

---

## 3. 组件规范

### 卡片 (Card)

卡片是本项目最核心的 UI 组件，必须严格遵循以下规范：

#### 基础卡片样式
```css
.nb-card {
    background-color: var(--nb-card);
    border: var(--nb-border-width) solid var(--nb-border);
    border-radius: var(--nb-border-radius-lg);
    box-shadow: var(--nb-shadow);
}
```

#### 卡片类型

| 类名 | 用途 | 特点 |
|------|------|------|
| `.nb-card` | 标准交互卡片 | 带阴影，悬停有按压效果 |
| `.nb-card-static` | 静态卡片 | 带阴影，无交互效果 |
| `.nb-card-subtle` | 轻量卡片 | 无阴影，仅边框 |
| `.nb-card-interactive` | 可点击卡片 | 悬停时整体抬起 |

#### 卡片悬停效果
```css
.nb-card:hover {
    transform: translate(2px, 2px);
    box-shadow: var(--nb-shadow-hover);
}

.nb-card:active {
    transform: translate(4px, 4px);
    box-shadow: var(--nb-shadow-none);
}
```

#### 卡片内部结构
```html
<div class="nb-card">
    <!-- 卡片头部 - 可选 -->
    <div class="nb-card-header nb-border-b px-6 py-4">
        <h3 class="text-lg font-bold nb-text">标题</h3>
    </div>

    <!-- 卡片内容 -->
    <div class="nb-card-body p-6">
        <!-- 内容区域 -->
    </div>

    <!-- 卡片底部 - 可选 -->
    <div class="nb-card-footer nb-border-t px-6 py-4">
        <!-- 操作按钮 -->
    </div>
</div>
```

### 按钮 (Button)

#### 按钮变体

| 类名 | 背景色 | 用途 |
|------|--------|------|
| `.nb-btn-primary` | Yellow `#f8d773` | 主要操作 |
| `.nb-btn-success` | Green `#5fe0a8` | 确认/成功 |
| `.nb-btn-danger` | Pink `#f771a7` | 删除/危险 |
| `.nb-btn-info` | Blue `#71b4ea` | 信息/次要 |
| `.nb-btn-ghost` | Transparent | 辅助操作 |

#### 按钮样式规范
```css
.nb-btn {
    padding: 0.5rem 1rem;
    font-weight: 600;
    color: var(--nb-border);
    background-color: var(--nb-accent-yellow);
    border: var(--nb-border-width) solid var(--nb-border);
    border-radius: var(--nb-border-radius-md);
    box-shadow: var(--nb-shadow);
    transition: transform 0.15s, box-shadow 0.15s;
}

.nb-btn:hover {
    transform: translate(2px, 2px);
    box-shadow: var(--nb-shadow-hover);
}

.nb-btn:active {
    transform: translate(4px, 4px);
    box-shadow: var(--nb-shadow-none);
}
```

### 状态徽章 (Badge/Pill)

```css
.nb-badge {
    padding: 0.125rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: var(--nb-border-radius-full);
    border: 1px solid var(--nb-border);
    color: var(--nb-border);
}
```

| 变体 | 背景色 | 用途 |
|------|--------|------|
| `.nb-badge-blue` | `#71b4ea` | 信息状态 |
| `.nb-badge-green` | `#5fe0a8` | 成功状态 |
| `.nb-badge-yellow` | `#f8d773` | 警告状态 |
| `.nb-badge-pink` | `#f771a7` | 错误/重要 |

### 输入框 (Input)

```css
.nb-input {
    padding: 0.5rem 0.75rem;
    background-color: var(--nb-card);
    border: var(--nb-border-width) solid var(--nb-border);
    border-radius: var(--nb-border-radius-md);
    color: var(--nb-text);
}

.nb-input:focus {
    outline: none;
    box-shadow: var(--nb-shadow);
}
```

**输入框规则**:
- ✅ 白色背景 + 2px 黑边框 + 圆角
- ✅ 聚焦时显示硬阴影 (无发光效果)
- ❌ 禁止默认浏览器发光效果

### 表格 (Table)

```css
/* 表头 */
.nb-table-header {
    background-color: #f0f0ee;
    border-bottom: 2px solid var(--nb-border);
}

/* 表格行 */
.nb-table-row {
    background-color: var(--nb-card);
    border-bottom: 1px solid #e0e0e0;
}

/* 数字使用等宽字体 */
.nb-table-number {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 开关 (Toggle Switch)

```css
/* 轨道 */
.nb-toggle-track {
    border: var(--nb-border-width) solid var(--nb-border);
    border-radius: var(--nb-border-radius-full);
}

/* 滑块 - 必须是纯黑色圆形 */
.nb-toggle-thumb {
    background-color: var(--nb-border);
    border-radius: 50%;
}
```

**开关规则**:
- ✅ 轨道有粗黑边框
- ✅ 滑块是**纯黑色圆形** (不是白色!)
- 未激活: 灰色轨道
- 激活: 绿色轨道

### 模态框 (Modal)

```css
.nb-modal {
    background-color: var(--nb-card);
    border: var(--nb-border-width-thick) solid var(--nb-border);
    border-radius: var(--nb-border-radius-lg);
    box-shadow: 8px 8px 0px 0px var(--nb-border);
}

.nb-modal-overlay {
    background-color: rgba(0, 0, 0, 0.2);
}
```

---

## 4. 布局原则

### 间距规范
| 元素 | 内边距 | Tailwind |
|------|--------|----------|
| 卡片 | 24px (1.5rem) | `p-6` |
| 卡片头/底 | 16px/24px | `px-6 py-4` |
| 按钮 | 8px/16px | `px-4 py-2` |
| 徽章 | 2px/10px | `px-2.5 py-0.5` |

### 排版规范
- **标题**: `font-weight: 700` 或 `800` (font-bold)
- **正文**: 高可读性，行高 1.5
- **对比度**: 始终保持黑字白底或白字深底

---

## 5. 实现指南

### 必须使用的 CSS 类
```html
<!-- 背景色 -->
<div class="nb-bg">...</div>           <!-- 主背景 -->
<div class="nb-card">...</div>         <!-- 卡片背景 + 边框 + 阴影 -->

<!-- 文字颜色 -->
<span class="nb-text">主文字</span>
<span class="nb-text-secondary">次要文字</span>

<!-- 边框 -->
<div class="nb-border">4边边框</div>
<div class="nb-border-b">底部边框</div>
<div class="nb-border-t">顶部边框</div>

<!-- 按钮 -->
<button class="nb-btn nb-btn-primary">主要按钮</button>
<button class="nb-btn nb-btn-danger">危险按钮</button>
```

### 禁止事项
| ❌ 禁止 | ✅ 替代方案 |
|---------|-------------|
| `box-shadow: blur` | 使用硬阴影 `4px 4px 0px 0px` |
| `background: linear-gradient()` | 使用纯色 |
| 无边框元素 | 添加 2px 边框 |
| 圆形按钮 | 使用圆角矩形 |
| 白色 Toggle 滑块 | 使用黑色滑块 |

### 主题适配检查清单
创建新组件时，确保：
- [ ] 使用 CSS 变量而非硬编码颜色
- [ ] 测试浅色模式 (light)
- [ ] 测试深色模式 (dark)
- [ ] 测试护眼模式 (eye-care)
- [ ] 验证边框和阴影在所有模式下可见

---

## 6. 代码示例

### 标准卡片模板
```tsx
<div className="nb-card p-6">
    <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-2xl text-accent">icon_name</span>
        <h3 className="text-lg font-bold nb-text">卡片标题</h3>
    </div>
    <p className="nb-text-secondary text-sm">卡片描述内容</p>
    <div className="mt-4 flex gap-2">
        <button className="nb-btn nb-btn-primary">确认</button>
        <button className="nb-btn nb-btn-ghost">取消</button>
    </div>
</div>
```

### 带头部的卡片
```tsx
<div className="nb-card">
    <div className="nb-border-b px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-bold nb-text">设置</h3>
        <button className="nb-btn-ghost p-2 rounded-full">
            <span className="material-symbols-outlined">close</span>
        </button>
    </div>
    <div className="p-6">
        {/* 内容 */}
    </div>
</div>
```

### 交互式列表卡片
```tsx
<div className="nb-card-interactive p-4 cursor-pointer">
    <div className="flex items-center justify-between">
        <span className="font-medium nb-text">列表项目</span>
        <span className="material-symbols-outlined nb-text-secondary">chevron_right</span>
    </div>
</div>
```

---

## 7. 开发工作流

1. **新建组件前**: 阅读本规范，确认设计符合 Neo-Brutalism 风格
2. **开发中**: 使用项目已定义的 CSS 类和变量
3. **提交前**: 在所有三种主题模式下测试外观
4. **代码审查**: 检查是否违反禁止事项

> **提示**: 所有 Neo-Brutalism 相关的 CSS 类和变量定义在 `src/assets/styles/tailwind.css` 中。
