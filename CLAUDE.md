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
- **上下文敏感（重要）**: Neo-Brutalism 是**视觉身份**而非全局滤镜。门面/品牌区/关键 CTA 使用满级特征；数据密集区/长会话表面使用"安静变体"。本项目是每日数小时使用的生产力工具，必须区分响度层级，避免视觉疲劳（详见 §4 响度层级）。

### 何时使用满级 Neo-Brutalism
- ✅ 侧边栏品牌区、Logo
- ✅ 主操作 CTA（保存、确认、新建）
- ✅ 模态框、确认弹窗、Toast
- ✅ 空状态插画、首屏 Hero

### 何时使用"安静变体"
- ✅ 书签/历史/标签等密集列表卡（数据卡）
- ✅ 表格行、设置项
- ✅ 二级按钮、ghost 按钮
- ✅ 表单内嵌的辅助说明

---

## 2. 设计令牌 (Design Tokens)

### 颜色系统

#### 主题矩阵（完整 token）

> `CLAUDE.md` 是设计决策真理源，`src/assets/styles/tailwind.css` 是执行源。任何主题 token 调整必须先更新本矩阵，再同步 CSS、速查文档和对比度核查记录。

| 变量 | Light | Dark | Eye-care | 用途 / 约束 |
|------|-------|------|----------|-------------|
| `--nb-bg` | `#f6f3f1` | `#1a1a1a` | `#faf5e8` | 页面主背景；禁止用滤镜模拟主题 |
| `--nb-card` | `#ffffff` | `#2a2a2a` | `#fffbf0` | 卡片 / Modal / 面板背景 |
| `--nb-panel-muted` | `#f0eeeb` | `#202020` | `#f4ead8` | 表头、设置项、Quiet hover 底色 |
| `--nb-border` | `#242425` | `#5c5c5c` | `#5d4037` | 主描边；不用于硬阴影 |
| `--nb-text` | `#242425` | `#e5e5e5` | `#3e2723` | 主文字，必须在 bg/card/panel 上 ≥4.5:1 |
| `--nb-text-secondary` | `#626976` | `#9CA3AF` | `#6D4C41` | 次要文字；小字号正文必须单独验 ≥4.5:1 |
| `--nb-text-on-accent` | `#242425` | `#242425` | `#242425` | 强调色背景上的文字 / 图标 |
| `--nb-shadow-color` | `#242425` | `#000000` | `#5d4037` | 硬阴影；独立于 `--nb-border` |
| `--nb-bg-base` | alias `--nb-bg` | alias `--nb-bg` | alias `--nb-bg` | 兼容旧工具模块的背景别名；新代码优先用 `--nb-bg` |
| `--nb-bg-card` | alias `--nb-card` | alias `--nb-card` | alias `--nb-card` | 兼容旧工具模块的卡片背景别名；新代码优先用 `--nb-card` |
| `--nb-bg-hover` | alias `--nb-panel-muted` | alias `--nb-panel-muted` | alias `--nb-panel-muted` | 兼容旧工具模块的 hover 背景别名；新代码优先用 `--nb-panel-muted` |
| `--color-skeleton` | `#E5E7EB` | `rgba(255,255,255,0.18)` | `#FFE0B2` | Skeleton 主块色，不承载文字 |
| `--color-skeleton-sub` | `#D1D5DB` | `rgba(255,255,255,0.12)` | `#FFCC80` | Skeleton 次级块色 |
| `.modal-overlay` | `rgba(0,0,0,0.4)` | `rgba(0,0,0,0.6)` | `rgba(0,0,0,0.3)` | 遮罩隔离强度；见 Modal 规则 |

#### 强调色 (Accent Colors) — 语义锁定

| 名称 | Light | Dark | Eye-care | **唯一语义** | 禁止用途 |
|------|-------|------|----------|------------|---------|
| **Yellow** | `#f8d773` | `#e6c25a` | `#e6c566` | 主操作 / 选中态 / 高亮 / focus 外圈 | ❌ 不可用于普通装饰 chip |
| **Pink** | `#f771a7` | `#e85a93` | `#dc7090` | 危险 / 错误 / 删除 | ❌ 不可用于"重要"以外的强调 |
| **Green** | `#5fe0a8` | `#4cc098` | `#4cc98f` | 成功 / 启用状态 / 确认 | ❌ 不可用于"信息"提示 |
| **Blue** | `#71b4ea` | `#5a9bd4` | `#5a9bd4` | 信息 / 链接 / 计数徽章 | ❌ 不可用于"主操作"按钮 |

#### WCAG AA 对比度核查表（强调色背景）

> 强调色背景上的文字对比度核查。AA 标准要求 ≥ **4.5:1**（正常文本），≥ **3:1**（大文本 ≥18pt 或 ≥14pt bold）。

| Theme | Yellow | Green | Blue | Pink |
|-------|--------|-------|------|------|
| Light | `#f8d773` **11.05** AAA ✅ | `#5fe0a8` **9.39** AAA ✅ | `#71b4ea` **6.96** AA ✅ | `#f771a7` **5.82** AA ✅ |
| Dark | `#e6c25a` **9.03** AAA ✅ | `#4cc098` **6.87** AA ✅ | `#5a9bd4` **5.22** AA ✅ | `#e85a93` **4.66** AA ✅ |
| Eye-care | `#e6c566` **9.26** AAA ✅ | `#4cc98f` **7.43** AAA ✅ | `#5a9bd4` **5.22** AA ✅ | `#dc7090` **4.99** AA ✅ |

**修复记录**:
- 2026-05-28: eye-care pink 从 `#d4648a` (4.42:1 ⚠️ AA-large) 调整为 `#dc7090` (4.99:1 ✅ AA)，满足正常字号 a11y 要求。视觉影响：略微提亮，仍属暖低饱和度风格
- 2026-05-28: light `--nb-text-secondary` 从 `#6B7280` 调整为 `#626976`，在 `--nb-bg` / `--nb-panel-muted` 上对比度分别提升到 5.00 / 4.77，满足小字号辅助文本 AA 要求

#### 对比度核查范围（每次改主题必须覆盖）

- **主文字**: `--nb-text` 在 `--nb-bg` / `--nb-card` / `--nb-panel-muted` 上必须 ≥4.5:1。
- **次要文字**: `--nb-text-secondary` 作为正文、小字说明、表格辅助信息时必须 ≥4.5:1；仅用于非关键、大字号或禁用态提示时可降到 ≥3:1。
- **强调色背景**: `--nb-accent-*` 背景上的文字 / 图标必须用 `--nb-text-on-accent`，正常字号 ≥4.5:1。
- **装饰色板**: `--nb-deco-*` 背景上的标签文字必须用 `--nb-text` 并达到 ≥4.5:1；装饰色不能承载成功/错误/信息等语义。
- **控件边界与焦点**: 可操作控件的边框、焦点圈、选中条与相邻表面建议 ≥3:1；如果主题色本身不足，必须使用双层 focus ring（见 §3 焦点态规则）。
- **Modal 遮罩**: 按主题矩阵验证前景隔离，不只看透明度数字；复杂背景上可提高不透明度，但不可低于矩阵值。

**强制规则**:
- ✅ 4 个强调色必须固定语义，**不可跨用**（例如不能因为"想换个颜色"就把 success toast 改成蓝色）
- ✅ 同一界面中，同一强调色出现的位置语义必须一致
- ✅ 调整任何主题的色值前，必须重跑上述核查范围；accent 色至少确保 ≥4.5:1 vs `#242425`
- ❌ 装饰性 chip / 标签色卡 **不可**直接使用 4 个语义强调色 — 必须使用低饱和度的装饰色板（详见下方）

#### 装饰色板（用于标签、分类、用户自定义色卡）

装饰色不承载语义，仅用于视觉区分。要求饱和度 < 60%，避免和语义色混淆：

| 变量 | Light | Dark | Eye-care |
|------|-------|------|----------|
| `--nb-deco-rose` | `#fbcbd9` | `#7a3a4d` | `#f5d4dd` |
| `--nb-deco-peach` | `#fcd9b6` | `#7a523a` | `#f5e1c8` |
| `--nb-deco-mint` | `#c4ebd3` | `#36664f` | `#d4ebd9` |
| `--nb-deco-sky` | `#c5dff5` | `#3a567a` | `#d2e1ef` |
| `--nb-deco-lavender` | `#d9d0ee` | `#4d4566` | `#e0d7ed` |
| `--nb-deco-sand` | `#ebe4cc` | `#5e5743` | `#ede4cd` |

### 边框规范

```css
/* 边框宽度 */
--nb-border-width: 2px;           /* 标准边框（绝大多数组件） */
--nb-border-width-thick: 3px;     /* 粗边框（仅外层容器/Modal/品牌区） */
--nb-border-width-hairline: 1px;  /* 细分隔线（表格行、列表分隔、安静变体） */

/* 圆角 */
--nb-border-radius-lg: 12px;      /* 外层容器 */
--nb-border-radius-md: 8px;       /* 内层元素 */
--nb-border-radius-sm: 4px;       /* 紧凑元素（chip、小徽章） */
--nb-border-radius-full: 9999px;  /* 胶囊形状 */
```

**强制规则**（按响度分级）:
| 元素类型 | 边框宽度 |
|---------|---------|
| Modal / 顶层卡片 / 品牌区 / 抽屉 | **3px** |
| 标准卡片 / 按钮 / 输入框 / 导航项 / 徽章 | **2px** |
| 数据卡（书签/历史/标签列表项） | **1–2px** |
| 表格行分隔 / 设置项分隔 | **1px** |

- ✅ 圆角必须来自令牌，禁止硬编码
- ✅ 主内容卡和侧边栏必须使用 `--nb-border-radius-lg`，**不可用 `rounded-none` 覆盖**
- ❌ 不要给每个元素都套 3px 框，会让小元素显得笨重，并削弱"外层容器"的层级感

### 阴影规范 (硬阴影 - 无模糊)

```css
/* 阴影颜色（按主题独立定义，不复用 --nb-border） */
/* light:    --nb-shadow-color: #242425; */
/* dark:     --nb-shadow-color: #000000; */
/* eye-care: --nb-shadow-color: #5d4037; */

/* 阴影阶梯（size 令牌） */
--nb-shadow-xs:    1px 1px 0px 0px var(--nb-shadow-color);  /* hover-收缩-小元素 */
--nb-shadow-sm:    2px 2px 0px 0px var(--nb-shadow-color);  /* hover 收缩 */
--nb-shadow:       4px 4px 0px 0px var(--nb-shadow-color);  /* = md，标准 */
--nb-shadow-lg:    6px 6px 0px 0px var(--nb-shadow-color);  /* Toast、强调容器 */
--nb-shadow-xl:    8px 8px 0px 0px var(--nb-shadow-color);  /* Modal / Dialog */

/* 语义别名（向后兼容 + 表达意图） */
--nb-shadow-hover: var(--nb-shadow-sm);                     /* hover 收缩态 */
--nb-shadow-none:  0px 0px 0px 0px var(--nb-shadow-color);  /* 按下态 */
--nb-shadow-modal: var(--nb-shadow-xl);                     /* Modal / Dialog 顶级 */
```

#### 阴影尺寸选用指南（按响度对齐）

| size | 用途 | 对应响度 |
|------|------|---------|
| `xs` (1px) | 小图标按钮 hover-after、tag-chip hover-after | Quiet 内部交互 |
| `sm` (2px) | 标准 hover 收缩态、Badge、小型可点击元素 | Medium hover |
| `md` (4px) | 标准卡片 / 按钮 / 输入框默认态 | Medium default |
| `lg` (6px) | Toast、theme-switcher active、tag-input focused | Loud 强调 |
| `xl` (8px) | Modal、ConfirmDialog、SelectionActionBar | Loud 顶级 |

**强制规则**:
- ✅ 阴影颜色必须使用 `--nb-shadow-color` 令牌，**禁止**直接 `box-shadow: ... var(--nb-border)`（深色模式会得到弱阴影 `#5c5c5c`，丢失视觉签名）
- ✅ 新增组件必须从阶梯令牌中选用（`var(--nb-shadow-xs)` 至 `var(--nb-shadow-xl)`），**禁止硬编码 `NpxNpx 0px 0px`**
- ✅ Modal、Drawer 等顶层覆盖物用 `var(--nb-shadow-modal)`（语义别名），表达意图优于直接用 `--nb-shadow-xl`
- ✅ "安静变体"组件（数据卡、表格行）不应使用硬阴影，仅靠边框/底色区分
- ⚠️ 现有 CSS 中残留的硬编码尺寸（如 `box-shadow: 6px 6px 0px 0px var(--nb-shadow-color)`）属于历史遗留，**修改这些样式时必须顺手替换为对应阶梯令牌**

### 按压交互规则

```css
.nb-btn:hover { transform: translate(2px, 2px); box-shadow: var(--nb-shadow-hover); }
.nb-btn:active { transform: translate(4px, 4px); box-shadow: var(--nb-shadow-none); }
```

**适用范围（重要）**:
- ✅ button、可点击的 nav-item、主操作卡（如 HomePage 的工具入口）
- ✅ 真正语义化为"按钮"的元素
- ❌ 数据卡（书签卡、历史卡、标签卡）— 仅做 `box-shadow` 渐变 + 背景轻微变化，**不位移**
- ❌ Modal / 卡片容器 / 表格行 — **永远不位移**
- ❌ 触控设备上的 hover 必须用 `@media (hover: hover)` 隔离，避免点击后 sticky hover 残留

> **理由**: 每次点击都"按下去"的位移效果，在生产力工具中使用 100+ 次/天会让用户产生"UI 不稳"的感觉。位移是签名特征，应保留在真正的按钮上，而非每个表面。

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

#### 卡片类型与响度分级

| 类名 | 响度 | 边框 | 阴影 | hover 位移 | 用途 |
|------|------|------|------|----------|------|
| `.nb-card` | Loud | 3px | 6×6 硬阴影 | ✅ 位移+缩阴影 | 主要内容卡（首页板块、设置区块） |
| `.nb-card-static` | Loud | 3px | 6×6 硬阴影 | ❌ 无 | 模态/侧边栏/不可点击容器 |
| `.nb-card-interactive` | Medium | 2px | 4×4 硬阴影 | ✅ 位移+缩阴影 | 可点击的展示卡 |
| `.nb-card-data` ⭐**新增** | Quiet | 1–2px | ❌ 无 | ❌ 无（仅背景变化） | 数据密集列表卡（书签、历史、标签）|
| `.nb-card-subtle` | Quiet | 1px | ❌ 无 | ❌ 无 | 设置项行、表单内分组 |

**选用规则**:
- ⚠️ 列表网格中重复出现的卡片（>10 张同屏）**必须**使用 `.nb-card-data` 或更安静的变体
- ✅ 容器卡（包裹很多子内容）才用 `.nb-card-static`
- ✅ 按钮形态的卡（点击进入详情）才用 `.nb-card` 或 `.nb-card-interactive`

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

### 表格 (Data Brutalism)

表格属于**安静变体（Quiet）**层级，brutalism 体现在外层容器与表头，**表体保持冷静**。

```css
/* 表头 - Loud */
.nb-table-header {
    background-color: var(--nb-panel-muted);
    border-bottom: 2px solid var(--nb-border);
    font-weight: 800;
    text-transform: uppercase;  /* 仅对 latin 生效，中文需用 :lang 重置 */
    letter-spacing: 0.05em;
}

/* 表格行 - Quiet */
.nb-table-row {
    background-color: var(--nb-card);
    border-bottom: 1px solid var(--nb-border);
    border-bottom-width: var(--nb-border-width-hairline);
    /* 禁止: box-shadow、transform、border:2px+ */
}

.nb-table-row:hover {
    background-color: var(--nb-panel-muted);
    /* hover 仅改背景色，不位移、不加阴影 */
    /* 可选: 左侧 4px 黄色强调 bar */
    box-shadow: inset 4px 0 0 0 var(--nb-accent-yellow);
}

.nb-table-row[aria-selected="true"] {
    background-color: var(--nb-panel-muted);
    box-shadow: inset 4px 0 0 0 var(--nb-accent-yellow);
}

/* 数字使用等宽字体，防止跳动 */
.nb-table-number {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
}
```

**强制规则**:
- ✅ 表格行**禁止**硬阴影、禁止 hover 位移
- ✅ 数字列必须 `tabular-nums`，价格/时间等同
- ✅ 表头保留 brutalism 特征（粗体、uppercase、底部 2px 边线）
- ❌ 不要给表格行加 `.nb-card` 类

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
    box-shadow: var(--nb-shadow-modal);  /* 8×8 */
}

/* 遮罩不透明度按主题分别定义，必须与主题矩阵一致 */
/* light:    rgba(0, 0, 0, 0.4); */
/* dark:     rgba(0, 0, 0, 0.6); */
/* eye-care: rgba(0, 0, 0, 0.3); */
```

**a11y 强制规则**（基于 `src/components/Modal.tsx` 已实现的基础组件）:
- ✅ 容器必须 `role="dialog"` + `aria-modal="true"`
- ✅ 标题元素加 `id`，容器加 `aria-labelledby="<title-id>"` 让屏幕阅读器朗读标题
- ✅ 监听 `Escape` 键关闭（不可取消的进度类 Modal 如 `OrganizeProgressModal` 可豁免）
- ✅ **新 Modal 必须复用** `<Modal>` 基础组件（`src/components/Modal.tsx`），自动获得 a11y 属性，禁止各自实现 dialog 容器
- ✅ 装饰图标加 `aria-hidden="true"` 避免冗余朗读
- ✅ 关闭按钮必须有 `aria-label`（i18n 翻译）

**视觉强制规则**:
- ✅ 遮罩必须满足 "可隔离前景" 的视觉隔离：light 0.4 / dark 0.6 / eye-care 0.3
- ✅ 背景为图片、密集列表或高对比内容时，可在当前主题基础上提高 0.1–0.2；禁止低于主题矩阵值
- ✅ Modal 关闭按钮触控目标 ≥44×44px
- ✅ Modal 内主操作和取消操作视觉权重必须有区分（颜色/位置）

### 全局通知 (Toast)

Toast 是 Loud 层级：3px 边框 + 6×6 硬阴影 + 强调色背景。样式定义见 `src/assets/styles/tailwind.css` 的 `.toast` 系列。

**a11y 强制规则**（基于 `src/components/Toast.tsx` 已实现的标杆）:
- ✅ 错误类型: `role="alert"` + `aria-live="assertive"`（立即打断屏幕阅读器朗读）
- ✅ 其他类型（success / info / warning）: `role="status"` + `aria-live="polite"`（不打断）
- ✅ 关闭按钮必须有 `aria-label`（i18n 翻译）
- ✅ 装饰图标加 `aria-hidden="true"`

**视觉规则**:
- ✅ 4 种 toast 严格对应 4 个强调色：success=green / error=pink / warning=yellow / info=blue
- ✅ 自动消失时长 3–5s；带 `action` 按钮的延长到 6–8s
- ✅ 不可同屏堆叠超过 3 个 toast，超出的入队等待
- ❌ 禁止用 toast 承载需用户操作才能完成的关键信息（应改用 Modal 或行内错误）

### 焦点态规则 (Focus State) ⭐

> 焦点圈与 brutalism 硬阴影会相互打架，必须分情况实现。本小节是横切关注点，所有可聚焦组件都要遵守。Focus ring 统一采用"分隔层 + 黄色识别层"的双层结构：分隔层保证浅色 / 护眼主题下可见，黄色层保留"主操作 / 选中"语义。

#### 四种焦点态模式

**模式 A — 普通元素（无 brutalism 阴影）**

走 `tailwind.css` 的全局规则即可，组件无需额外代码。普通元素用分隔层填满 `outline-offset` 的空隙：

```css
*:focus-visible {
    outline: 3px solid var(--nb-accent-yellow);
    outline-offset: 2px;
    box-shadow: 0 0 0 2px var(--nb-shadow-color);
}
```

**模式 B — 带 brutalism 硬阴影的容器（Loud / Medium 卡片、可点击按钮卡）**

全局 outline 会被 box-shadow 视觉覆盖，必须在元素自身用复合 box-shadow（硬阴影 + 分隔层 + 黄色描边）：

```css
.nb-card-static:focus-visible,
.nb-card-interactive:focus-visible {
    outline: none;
    box-shadow:
        var(--nb-shadow),
        0 0 0 2px var(--nb-shadow-color),
        0 0 0 5px var(--nb-accent-yellow);
}
```

**模式 C — Quiet 层级（数据卡 / 表格行 / 设置项）**

无外部硬阴影，焦点圈走 inset 双层，不增加视觉尺寸，避免列表中焦点切换时布局跳动：

```css
.nb-card-data:focus-visible,
.nb-card-subtle:focus-visible {
    outline: none;
    box-shadow:
        inset 0 0 0 2px var(--nb-shadow-color),
        inset 0 0 0 5px var(--nb-accent-yellow);
}
```

**模式 D — 自定义热区组件（toggle、扩大命中区的图标按钮）**

button 的 outline 包到 44×44 透明热区会显得"虚浮"，必须把焦点圈渲染到内部可见元素：

```css
.nb-toggle:focus-visible { outline: none; }
.nb-toggle:focus-visible .nb-toggle-track {
    /* 双圈：内圈默认用 shadow 色隔开，外圈黄色高亮 */
    box-shadow: 0 0 0 2px var(--nb-shadow-color), 0 0 0 5px var(--nb-accent-yellow);
}
```

#### 决策树

```
该元素是否有 brutalism box-shadow？
├─ 是 → 是 Quiet 层级（无外阴影）？
│       ├─ 是 → 模式 C（inset 焦点圈）
│       └─ 否 → 模式 B（复合 box-shadow）
└─ 否 → 是热区扩大型组件（hitbox > visual box）？
        ├─ 是 → 模式 D（焦点渲染到可见子元素）
        └─ 否 → 模式 A（全局 outline 默认行为）
```

#### 强制规则

- ❌ 禁止 `outline: none` 后不补焦点态 — 键盘用户会完全失明
- ❌ 焦点识别层禁止用其他强调色 — 必须 `var(--nb-accent-yellow)`，与"主操作 / 选中"语义对齐
- ✅ 分隔层默认用 `var(--nb-shadow-color)`；若组件外侧已经是深色硬阴影，可用 `var(--nb-bg)` 作为分隔层，前提是三主题截图可见
- ✅ 焦点圈不应改变元素的 box 尺寸 — 用 `outline-offset` 或 `box-shadow` (inset / 复合)，不要改 `border-width`
- ✅ 输入框（`input` / `textarea` / `select`）走自身 `:focus` 的硬阴影（已在 `tailwind.css` 实现），不叠加黄圈避免视觉打架

### 图标 (Icon)

> 项目当前使用 `material-symbols-outlined`（Google Material Symbols icon font）。这是 brutalism 风格下接受的妥协选择 — 详见 §11 历史决策。

**强制规则**:
- ✅ 所有结构性图标必须来自统一图标系统（当前为 `material-symbols-outlined`），**禁止 emoji 作为结构图标**（导航、按钮、设置等）
- ✅ 装饰性图标必须 `aria-hidden="true"`，避免屏幕阅读器朗读冗余内容
- ✅ icon-only 按钮必须配 `aria-label`（i18n 翻译）
- ✅ 图标尺寸用 Tailwind text-* 工具类统一：`text-base` (16px) / `text-lg` (18px) / `text-xl` (20px) / `text-2xl` (24px) / `text-3xl` (30px) — **禁止任意像素值**
- ✅ 图标颜色用 `currentColor`（继承父级文本色）或 `var(--nb-text)` / `var(--nb-text-secondary)`，禁止硬编码 hex
- ✅ 图标对齐文本基线，与文字间距用 `gap-1.5` 或 `gap-2`（6-8px）

**brutalism 中的图标规则**:
- ✅ 强调色背景上的图标（如 `.nb-btn-primary` 内）使用 `var(--nb-text-on-accent)` 保证对比度
- ✅ favicon / 用户上传图标需加 2px 边框 + 硬阴影 + 圆角，构造统一的 brutalism 容器（参考 `.item-card-favicon`）

### 空状态 (Empty State)

空状态是 **Loud 层级** — 用满级 brutalism 特征让"无内容"的页面也保持品牌身份。

**模板**:
```tsx
<div className="flex flex-col items-center justify-center min-h-72 px-6 py-12 text-center">
    {/* 1. 图标容器 — Loud 卡片包裹 */}
    <div className="nb-card-static p-6 mb-6">
        <span className="material-symbols-outlined text-6xl nb-text" aria-hidden="true">
            inbox
        </span>
    </div>
    {/* 2. 主标题 — 800 字重 */}
    <h3 className="text-lg font-extrabold nb-text mb-2">{t('empty.title')}</h3>
    {/* 3. 描述 — Silent 层级 */}
    <p className="max-w-md text-sm nb-text-secondary leading-relaxed mb-6">
        {t('empty.description')}
    </p>
    {/* 4. CTA — 主操作按钮 */}
    <button className="nb-btn nb-btn-primary">{t('empty.action')}</button>
</div>
```

**强制规则**:
- ✅ 必须包含 4 个要素：图标 + 主标题 + 描述 + CTA（可选无 CTA 时给"了解更多"链接）
- ✅ 图标容器用 `.nb-card-static`（不位移）+ Loud 阴影，让"无内容"页面仍有视觉重量
- ✅ 文案分层：标题简短（≤8 字 / ≤30 chars），描述用一句话说明"为什么是空的 + 下一步"
- ✅ 装饰性 sticker 旋转（`.nb-sticker-1` 等）可用于增加趣味，但**仅限 empty state**，不用于错误状态
- ❌ 禁止用大段灰色文字铺满区域（违反 brutalism"高对比"原则）
- ❌ 禁止纯文字空状态（必须有图标或视觉锚点）

### 骨架屏 (Skeleton)

骨架屏用于异步加载占位，参考 `src/components/SkeletonLoader.tsx` 现有实现。

**使用时机**:
| 加载时长 | 应该显示 |
|---------|---------|
| < 200ms | 不显示任何 loading（避免闪烁） |
| 200ms – 1s | Spinner（旋转加载，适合按钮内 / 局部小区域） |
| > 1s | Skeleton（结构化占位，适合卡片网格 / 列表 / 详情页） |

**强制规则**:
- ✅ 容器必须 `role="status"` + `aria-live="polite"` + `aria-label`（如"加载中"），让屏幕阅读器播报
- ✅ Skeleton 块色用 `var(--color-skeleton)`，次级用 `var(--color-skeleton-sub)` — **不要**硬编码灰色
- ✅ Skeleton 块尺寸必须接近真实内容尺寸，避免内容加载后布局跳动（CLS）
- ✅ Skeleton 不使用 brutalism 硬阴影（属于 Quiet 层级），仅靠背景色和边框区分
- ✅ 动画（pulse / shimmer）必须尊重 `prefers-reduced-motion`（已在全局 `tailwind.css` 处理）
- ❌ 禁止在 skeleton 上叠加 brutalism 黄圈 / 强调色 — 它是中性占位，不承载品牌信息
- ❌ 不要永久显示 skeleton — 必须有超时兜底（≥10s 转为错误态 + 重试按钮）

---

## 4. 响度层级 (Loudness Levels) ⭐

> Neo-Brutalism 在生产力工具中必须分级使用。响度层级决定一个元素能用多少"signature 特征"。

### 层级定义

| 层级 | 边框 | 阴影 | hover 位移 | 强调色 | 适用场景 |
|------|------|------|----------|--------|---------|
| **Loud** 🔊 | 3px | 6×6 / 8×8 | ✅ | 大面积使用 | Modal、品牌区、空状态、首屏 Hero、关键 CTA |
| **Medium** 🔉 | 2px | 4×4 | ✅（仅按钮） | 强调描边/图标 | 标准按钮、导航项、表单容器、Toast |
| **Quiet** 🔈 | 1–2px | ❌ | ❌ | 仅在选中/聚焦时 | 数据卡、表格行、设置项、密集列表 |
| **Silent** 🔇 | 仅底边或无 | ❌ | ❌ | 文字色变化 | 段落正文、面包屑、辅助说明、空状态文字 |

### 选用决策树

```
该元素是否承载主要内容？
├─ 是 → 是品牌/CTA/首屏？ → Loud
│       否 → Medium
└─ 否（重复出现的数据 / 辅助信息）
        ├─ 可点击列表项 → Quiet
        └─ 纯文本 → Silent
```

### 一屏内的响度配比建议

- 一屏内 **Loud 元素 ≤ 3 个**（典型：1 个主 CTA + 1 个品牌区 + 1 个 active 导航）
- Medium 占 20-30%
- Quiet/Silent 占 70-80%

### 当前组件的响度归类

| 组件 | 当前层级 |
|------|---------|
| 侧边栏 LOGO、Modal、主操作按钮 | Loud |
| nav-item、settings-nav-item、btn-secondary、Toast、ConfirmDialog | Medium |
| 书签卡、历史卡、TagCard、SubscriptionList 行、表格行 | **Quiet** |
| 设置项的描述、empty state 副标题、面包屑 | Silent |

---

## 5. 深色模式方言 (Dark Mode Dialect) ⭐

> 深色模式**不是浅色的反相**，而是有独立设计语言的方言。

### 核心调整

| 特征 | 浅色做法 | 深色做法 |
|------|---------|---------|
| 硬阴影 | `4px 4px 0px 0px #242425`（黑色，对比强烈）| `4px 4px 0px 0px #000000`（纯黑，比 bg `#1a1a1a` 更深）|
| 边框 | `2px solid #242425` | `2px solid rgba(255,255,255,0.18)` 或 `#5c5c5c`，但搭配**1px 内描边**增强 |
| 强调色 | 直接使用 `--nb-accent-*` | **饱和度降低 15-25%**，避免暗背景上炸眼 |
| 卡片表面 | 纯白 `#ffffff` | 略带蓝调的深灰 `#2a2a2a` —— 不要纯黑 |
| 选中态 | Yellow 高亮 + 边框 | Yellow 高亮，但配合 `box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4)` 内描边收边 |

### 深色专属补强：内描边

由于深色模式的硬阴影对比下降，给关键容器加 1px 内描边以增强"凸起感"：

```css
.dark .nb-card,
.dark .nb-card-static {
    box-shadow:
        var(--nb-shadow),
        inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}
```

### 深色强调色调整建议（写入令牌）

```css
.dark {
    --nb-accent-pink:   #e85a93;  /* 原 #f771a7 降饱和 */
    --nb-accent-yellow: #e6c25a;  /* 原 #f8d773 降饱和 */
    --nb-accent-blue:   #5a9bd4;  /* 原 #71b4ea 降饱和 */
    --nb-accent-green:  #4cc098;  /* 原 #5fe0a8 降饱和 */
}
```

### 强制规则
- ✅ 深色模式的 `--nb-shadow-color` 必须比 `--nb-bg` 更深（pure black `#000` 或近似）
- ✅ 深色模式禁止直接复用浅色强调色，需要降饱和度版本
- ❌ 深色模式禁止使用浅色边框直接反相（避免 `#E5E7EB → #1a1c1f` 这种纯反相做法）

---

## 6. 国际化与中文适配 ⭐

> 项目支持 zh-CN 与 en，Neo-Brutalism 的拉丁字母特征（uppercase + tracking + black weight）在中文场景必须调整。

### 强制规则

```css
/* 中文环境下，关闭 letter-spacing 和 uppercase 特征 */
:lang(zh) :is(.nb-btn, .nb-nav-item, .nb-badge, .nb-table-header, .toast-action) {
    letter-spacing: 0;
    text-transform: none;
}

/* 中文环境下，标题字重降一级（汉字 900 字重容易糊成一团） */
:lang(zh) h1, :lang(zh) h2, :lang(zh) h3,
:lang(zh) .nb-title-stroke {
    font-weight: 700;  /* 而非 900 / black */
}

/* tabular 数字保留（与语言无关） */
.nb-table-number, .price, .timestamp {
    font-variant-numeric: tabular-nums;
}
```

### 字体选择
- Latin: `Space Grotesk` (项目当前)
- 中文 fallback: 系统默认（`-apple-system`、`PingFang SC`、`Microsoft YaHei`）
- ❌ 禁止给中文强加 `font-family: 'Space Grotesk'` —— 会回退到不可控的字形

### 文案要求
- ✅ 短标签（按钮文字、徽章）中文限制在 2-4 字
- ✅ 长描述使用句号结尾，行高 1.5-1.6
- ❌ 不要直接复制 latin 文案的 uppercase 风格到中文界面（"设置" ≠ "SETTINGS"）

### uppercase 与 letter-spacing 决策

> 项目当前实现：`.nb-btn` / `.nb-badge` / `.toast-action` 等组件**默认开启** `text-transform: uppercase` + `letter-spacing: 0.05em`（latin 字符的 brutalism 签名特征），然后用 `:lang(zh)` 反向重置。

**为什么这样做**:
- 项目主用户群跨中英文，brutalism 签名特征（uppercase + tracking）在 latin 字符上视觉效果最强，必须保留
- 反向重置代价低：CSS 中只需要一段 `:lang(zh) :is(...) { letter-spacing: 0; text-transform: none; }` 即可覆盖全部组件（见 `tailwind.css` 中文适配段）

**已知风险**:
- 第三方组件 / shadow DOM / 动态注入的 latin 文本节点可能漏网（需手动加 `:lang(zh)` 或显式 `.normal-case`）
- 未来如增加 ja / ko 等 CJK 语言，需扩展 `:lang(zh)` 选择器为 `:where(:lang(zh), :lang(ja), :lang(ko))`

**新组件强制规则**:
- ✅ latin 风格的 brutalism 签名（uppercase / tracking-wide）写到 `.nb-*` 组件类的默认样式
- ✅ 显式列出该组件类，加入 `tailwind.css` 末尾的中文重置 selector 列表
- ❌ 禁止在 JSX 内对 latin 文本硬编码 `style={{ textTransform: 'uppercase' }}` — 绕过 `:lang(zh)` 兜底，中文会"歪歪扭扭"

---

## 7. 布局原则

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

## 8. 实现指南

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

#### 视觉 / 样式
| ❌ 禁止 | ✅ 替代方案 |
|---------|-------------|
| `box-shadow: blur` 模糊阴影 | 使用硬阴影 `4px 4px 0px 0px` |
| 装饰性 `linear-gradient()` / 柔和渐变 | 使用纯色；硬边点阵 / 网格纹理可用单色 CSS gradient |
| 圆形按钮 | 使用圆角矩形（`--nb-border-radius-md`） |
| 白色 Toggle 滑块 | 使用黑色滑块（`var(--nb-border)`） |
| 给所有元素套 3px 厚框 | 按响度分级：Modal 3px / 普通 2px / 数据卡 1-2px |
| 直接 `box-shadow: ... var(--nb-border)` | 使用 `var(--nb-shadow-color)` 令牌 |
| 在 JSX 用 `rounded-none` 覆盖卡片圆角 | 调整令牌或选择无圆角变体 |
| 数据列表卡用 `.nb-card` + hover 位移 | 用 `.nb-card-data` 或 `.nb-card-subtle` |
| 表格行加硬阴影或 hover 位移 | 仅改背景色 + 左侧 4px 强调 bar |
| `filter: sepia(...)` 等全局色彩滤镜 | 通过令牌控制色调 |

#### 颜色 / 语义
| ❌ 禁止 | ✅ 替代方案 |
|---------|-------------|
| 跨语义使用 4 个强调色（如蓝色当主操作） | 严格按 §2 强调色语义锁定使用 |
| 装饰 chip 直接用 `--nb-accent-*` | 使用低饱和度装饰色板 `--nb-deco-*` |
| 深色模式直接复用浅色强调色 | 使用降饱和度版本（详见 §5） |
| 深色模式用 `--nb-border` 当阴影色 | 使用独立的 `--nb-shadow-color` 令牌 |

#### 国际化
| ❌ 禁止 | ✅ 替代方案 |
|---------|-------------|
| 中文文本上加 `letter-spacing: 0.05em` | 用 `:lang(zh)` 重置为 0 |
| 中文标题强制 `font-weight: 900` | 中文环境降为 700 |
| 给中文强加 `font-family: 'Space Grotesk'` | 依赖系统默认中文字体 fallback |

#### 交互
| ❌ 禁止 | ✅ 替代方案 |
|---------|-------------|
| Modal / Card 容器 hover 位移 | 仅按钮和真正语义化为"按钮"的元素位移 |
| 没有 `@media (hover: hover)` 隔离的 hover | 用 `@media (hover: hover) { ... }` 包裹 |
| Toggle 视觉热区 < 44×44px | 用 padding 或 ::before 扩大点击热区到 44×44 |
| modal-overlay 不按主题矩阵或透明度 <0.3 | light 0.4 / dark 0.6 / eye-care 0.3，复杂背景只增不减 |
| focus ring 只用单层黄色或其他强调色 | 使用分隔层 + `var(--nb-accent-yellow)` 双层结构 |

### 主题适配检查清单
创建新组件时，确保：
- [ ] 使用 CSS 变量而非硬编码颜色
- [ ] 阴影使用 `var(--nb-shadow-color)`，不复用 `var(--nb-border)`
- [ ] 阴影尺寸从阶梯令牌 (`var(--nb-shadow-xs)` 至 `var(--nb-shadow-xl)`) 选用，禁止硬编码 `NpxNpx`
- [ ] 在浅色 / 深色 / 护眼三种主题下分别测试
- [ ] 验证边框和阴影在所有主题下均清晰可见
- [ ] 对比度覆盖 `--nb-text` / `--nb-text-secondary` / `--nb-text-on-accent` / `--nb-deco-*` / focus ring / modal overlay
- [ ] Modal overlay 使用主题矩阵值：light 0.4 / dark 0.6 / eye-care 0.3
- [ ] Focus ring 使用分隔层 + Yellow 双层结构，浅色和护眼主题下不丢失
- [ ] 确认响度层级（Loud / Medium / Quiet / Silent）与场景匹配
- [ ] 中文文案下检查 letter-spacing 与字重表现
- [ ] hover 效果用 `@media (hover: hover)` 隔离
- [ ] 触控目标 ≥44×44px（含 toggle、关闭按钮、icon button）
- [ ] 焦点圈视觉与设计语言一致
- [ ] 自定义动画在 `prefers-reduced-motion` 下完全停止（不是减慢），全局重置在 `tailwind.css` 已实现，但内嵌 `style` / `keyframes` 必须独立验证
- [ ] 装饰性动画（`.nb-bounce` / `.nb-pulse` / `.nb-wiggle` / `.nb-float`）**仅用于空状态插画 / 一次性引导提示**，不用于按钮反馈、不长时间 `infinite` 持续运行（违反 §7 `motion-meaning`：每个动画必须表达因果关系）

### 装饰动画使用约束

项目预置了 4 个 brutalism 装饰动画类，使用前必读：

| 类名 | 适用场景 | 禁止场景 |
|------|---------|---------|
| `.animate-nb-bounce` | 空状态图标的吸引注意（一次性，加 `animation-iteration-count: 3`） | 按钮交互反馈、长时间持续 |
| `.animate-nb-pulse` | 等待用户操作的高亮提示（如教程引导箭头） | 装饰、长时间持续 |
| `.animate-nb-wiggle` | 错误抖动反馈（一次性，0.5s 内） | 持续运行 |
| `.nb-float` | 空状态背景装饰元素 | 主操作区域 |

**强制规则**:
- ❌ 4 个动画默认 `infinite` — **使用时必须显式覆盖为有限次**（如 `animation-iteration-count: 3`）或在交互完成后通过 React state 移除 class
- ❌ 同屏不可超过 **1 个**装饰动画在运行（违反 §7 `excessive-motion`）
- ✅ 必须在 `prefers-reduced-motion: reduce` 下停止（已在全局处理）


---

## 9. 代码示例

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

### 数据卡（Quiet 层级）— 密集列表场景
```tsx
{/* 适用：书签卡、历史卡、TagCard 等高密度网格 */}
<div className="nb-card-data p-3 group" role="button" tabIndex={0}>
    <div className="flex items-center gap-2">
        <img src={favicon} className="w-4 h-4 flex-shrink-0" alt="" />
        <span className="text-sm nb-text truncate flex-1">{title}</span>
        <span className="text-xs nb-text-secondary tabular-nums">{count}</span>
    </div>
    {/* 注意：
        - 不使用 .nb-card（会带按压位移）
        - hover 仅靠 group-hover:bg-[...] 改背景色
        - 选中态使用 box-shadow inset 加左侧 yellow bar */}
</div>
```

### 表格行（Data Brutalism）
```tsx
<table>
  <thead className="nb-table-header">
    <tr>
      <th className="px-4 py-3 text-left">标题</th>
      <th className="px-4 py-3 text-right nb-table-number">数量</th>
    </tr>
  </thead>
  <tbody>
    {items.map((item) => (
      <tr key={item.id} className="nb-table-row">
        <td className="px-4 py-2">{item.title}</td>
        <td className="px-4 py-2 text-right nb-table-number">{item.count}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 10. 开发工作流

1. **新建组件前**:
   - 阅读本规范第 1-6 节
   - 确定组件的响度层级（Loud / Medium / Quiet / Silent，见 §4）
   - 在 §3 的卡片类型表中选择正确变体
2. **开发中**:
   - 使用项目已定义的 CSS 类和变量，不要硬编码颜色/阴影
   - 阴影一律走 `--nb-shadow-color`，不写死颜色
   - hover 用 `@media (hover: hover)` 包裹
   - 中文文案优先用 `:lang(zh)` 处理 letter-spacing 与字重
3. **提交前**:
   - 在三种主题（light / dark / eye-care）下分别截图对比
   - 中英文切换验证排版（特别是按钮、徽章、导航项）
   - 触摸热区 ≥44×44px 自检
   - 阅读 §8 禁止事项核对
4. **代码审查**:
   - 检查响度层级是否合适（数据卡用了 Loud 变体？）
   - 检查是否引入了 `var(--nb-border)` 当阴影色
   - 检查是否有 `rounded-none` 覆盖卡片圆角

---

## 11. 历史决策与设计取舍

> 记录关键的设计决定及其原因，避免后续 review 时重复讨论。

### 为什么引入"响度层级"？
原始 brutalism 把强烈视觉特征施加到每个元素，但 My Hub 是日均数小时使用的生产力工具。书签网格中 50+ 张满级 brutalism 卡片会带来视觉疲劳，且密度低于其他风格。响度层级保留品牌身份的同时给数据区让出"安静空间"。

### 为什么深色模式需要独立设计而非反相？
硬阴影 (`4px 4px 0px 0px`) 在浅色背景上对比强烈，但反相到深色背景时，原本的"黑色阴影"如果直接替换为"白色阴影"会让 UI 像剪贴画。深色模式的方言是：阴影更深（纯黑）+ 1px 内描边模拟"凸起"+ 强调色降饱和。

### 为什么强调色必须锁定语义？
4 个强调色（pink / yellow / blue / green）当装饰用会让用户失去对"红色 = 危险"的直觉。当 success toast 是绿色、删除按钮是粉色这一对应关系被破坏时，错误率上升。锁定语义后，装饰需求通过独立的 `--nb-deco-*` 色板满足。

### 为什么放宽"必须有边框"的规则？
原规则要求所有元素必须有 2px 边框，但段落正文、面包屑、empty state 副标题如果都框起来会让信息层级混乱。新规则允许 Silent 层级（仅文字、无容器）存在。

---

> **提示**: 所有 Neo-Brutalism 相关的 CSS 类和变量定义在 `src/assets/styles/tailwind.css` 中。本规范优先级高于代码现状 — 若实现与规范冲突，应将代码向规范靠拢。
