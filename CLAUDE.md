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

#### 基础色
| 变量 | 浅色模式 | 深色模式 | 用途 |
|------|----------|----------|------|
| `--nb-bg` | `#f6f3f1` | `#1a1a1a` | 主背景色 |
| `--nb-card` | `#ffffff` | `#2a2a2a` | 卡片/面板背景 |
| `--nb-border` | `#242425` | `#4a4a4a` | 边框颜色 |
| `--nb-text` | `#242425` | `#e5e5e5` | 主文字颜色 |
| `--nb-text-secondary` | `#6B7280` | `#9CA3AF` | 次要文字颜色 |

#### 强调色 (Accent Colors) — 语义锁定

| 名称 | 色值 | **唯一语义** | 禁止用途 |
|------|------|------------|---------|
| **Yellow** `#f8d773` | 主操作 / 选中态 / 高亮 | ❌ 不可用于普通装饰 chip |
| **Pink** `#f771a7` | 危险 / 错误 / 删除 | ❌ 不可用于"重要"以外的强调 |
| **Green** `#5fe0a8` | 成功 / 启用状态 / 确认 | ❌ 不可用于"信息"提示 |
| **Blue** `#71b4ea` | 信息 / 链接 / 计数徽章 | ❌ 不可用于"主操作"按钮 |

**强制规则**:
- ✅ 4 个强调色必须固定语义，**不可跨用**（例如不能因为"想换个颜色"就把 success toast 改成蓝色）
- ✅ 同一界面中，同一强调色出现的位置语义必须一致
- ❌ 装饰性 chip / 标签色卡 **不可**直接使用 4 个语义强调色 — 必须使用低饱和度的装饰色板（详见下方）

#### 装饰色板（用于标签、分类、用户自定义色卡）

装饰色不承载语义，仅用于视觉区分。要求饱和度 < 60%，明度高于强调色，避免和语义色混淆：

```css
/* 装饰色板 - 浅色模式建议值 */
--nb-deco-rose:    #fbcbd9;  /* 玫瑰 */
--nb-deco-peach:   #fcd9b6;  /* 桃 */
--nb-deco-mint:    #c4ebd3;  /* 薄荷 */
--nb-deco-sky:     #c5dff5;  /* 天蓝 */
--nb-deco-lavender:#d9d0ee;  /* 薰衣草 */
--nb-deco-sand:    #ebe4cc;  /* 沙 */
```

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
/* light:  --nb-shadow-color: #242425; */
/* dark:   --nb-shadow-color: #000000; */
/* eye-care: --nb-shadow-color: #5d4037; */

/* 阴影尺寸 */
--nb-shadow:       4px 4px 0px 0px var(--nb-shadow-color);  /* 标准 */
--nb-shadow-hover: 2px 2px 0px 0px var(--nb-shadow-color);  /* 悬停 */
--nb-shadow-none:  0px 0px 0px 0px var(--nb-shadow-color);  /* 按下 */
--nb-shadow-modal: 8px 8px 0px 0px var(--nb-shadow-color);  /* Modal/抽屉 */
```

**强制规则**:
- ✅ 阴影颜色必须使用 `--nb-shadow-color` 令牌，**禁止**直接 `box-shadow: ... var(--nb-border)`（深色模式会得到弱阴影 `#4a4a4a`，丢失视觉签名）
- ✅ Modal、Drawer 等顶层覆盖物使用 `--nb-shadow-modal`
- ✅ "安静变体"组件（数据卡、表格行）不应使用硬阴影，仅靠边框/底色区分

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

/* 遮罩不透明度按主题分别定义 */
/* light:    rgba(0, 0, 0, 0.4); */
/* dark:     rgba(0, 0, 0, 0.6); */
/* eye-care: rgba(0, 0, 0, 0.3); */
```

**强制规则**:
- ✅ 遮罩必须满足 "可隔离前景" 的对比度（≥40% 黑），避免前后景视觉混叠
- ✅ Modal 关闭按钮触控目标 ≥44×44px
- ✅ Modal 内主操作和取消操作视觉权重必须有区分（颜色/位置）

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
| 边框 | `2px solid #242425` | `2px solid rgba(255,255,255,0.18)` 或 `#4a4a4a`，但搭配**1px 内描边**增强 |
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
| `background: linear-gradient()` | 使用纯色 |
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
| modal-overlay 透明度 < 0.3 | light 0.4 / dark 0.6 / eye-care 0.3 |
| focus ring 使用与品牌不一致的颜色 | 使用 `var(--nb-accent-yellow)` 或 `var(--nb-border)` |

### 主题适配检查清单
创建新组件时，确保：
- [ ] 使用 CSS 变量而非硬编码颜色
- [ ] 阴影使用 `var(--nb-shadow-color)`，不复用 `var(--nb-border)`
- [ ] 在浅色 / 深色 / 护眼三种主题下分别测试
- [ ] 验证边框和阴影在所有主题下均清晰可见
- [ ] 确认响度层级（Loud / Medium / Quiet / Silent）与场景匹配
- [ ] 中文文案下检查 letter-spacing 与字重表现
- [ ] hover 效果用 `@media (hover: hover)` 隔离
- [ ] 触控目标 ≥44×44px（含 toggle、关闭按钮、icon button）
- [ ] 焦点圈视觉与设计语言一致

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
