# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds all TypeScript sources, organized by feature: page entrypoints under `src/pages`, shared UI in `src/components`, domain logic in `src/services` and `src/utils`, and translations in `src/i18n` plus `src/locales`.
- `public/` contains static assets that Vite copies verbatim into the extension bundle; keep icons and manifest-linked files here.
- `docs/` aggregates written reference material and UX drafts.
- Build output is emitted to `dist_chrome/` (or a Firefox-specific folder at build time). Do not edit generated files directly.
- Vite configs live at the repo root (`vite.config.*.ts`), alongside `custom-vite-plugins.ts` that tunes extension-specific behavior.

## Build, Test, and Development Commands
- `npm run dev:chrome` (default for `npm run dev`) starts the live-reload pipeline and writes artifacts to `dist_chrome/`. Load that directory via `chrome://extensions`.
- `npm run dev:firefox` mirrors the Chrome workflow but targets Firefox; use `about:debugging#/runtime/this-firefox` to load the temporary add-on.
- `npm run build:chrome` and `npm run build:firefox` produce optimized bundles for store submission; run before tagging releases.
- Lint with `npx eslint "src/**/*.{ts,tsx}"` to catch style issues early.

## Coding Style & Naming Conventions
- TypeScript + React with JSX; prefer function components. Keep indentation at two spaces and rely on Prettier-compatible formatting.
- React components and pages use `PascalCase` (`HomePage.tsx`), hooks use `camelCase` prefixed with `use`, and utility modules lean `kebab-case` or `camelCase` to match existing folders.
- Favor Tailwind utility classes for styling; colocate component-specific CSS alongside the component (`Newtab.css` pattern).
- Import via path aliases (`@pages`, `@assets`) defined in `tsconfig.json`.

## Testing Guidelines
- Automated tests are not yet provisioned. When adding coverage, colocate files under `src/**/__tests__` and run them through Vitest (preferred) or Jest after adding the necessary tooling.
- In the interim, document manual QA steps in PR descriptions. Validate flows in both Chrome and Firefox, including translation toggles (`src/i18n`) and extension permissions.

## Commit & Pull Request Guidelines
- Follow the existing imperative style: start summaries with a present-tense verb (e.g., `add expand/collapse for bookmark folders`). Keep lines under ~72 characters.
- Reference related issues in the body and describe user-facing changes. Capture UI tweaks with before/after screenshots or Loom clips when practical.
- Before submitting a PR, ensure the relevant build command completes, lint runs clean, and any manual verification steps are noted. Tag reviewers who own the affected pages or services.

## Extension Packaging Tips
- After running a production build, compress the generated `dist_chrome/` (or Firefox output) into a versioned archive for store uploads.
- Update `manifest.json` and `manifest.dev.json` in sync; keep permissions minimal and document any additions in the PR.

## i18n
- All development requires support for internationalization.

## Design
- The generated document needs to be in Chinese.
- All development should consider theme adaptation (light/dark/eye-care modes).

---

# Neo-Brutalism 设计规范

> **真理源**：完整规范见项目根 [`CLAUDE.md`](./CLAUDE.md) 的 "Neo-Brutalism 设计规范" 章节，**修改必须先改 CLAUDE.md**，然后再同步速查版。
> **速查版**：日常开发查阅 [`docs/Neo-Brutalism.md`](./docs/Neo-Brutalism.md)。

本项目严格遵循 Neo-Brutalism (新野兽派) 设计风格。所有 UI 开发前必须阅读 `CLAUDE.md` 中的完整规范。

## 核心约束（速查）

- **上下文敏感**：Modal / 品牌区 / CTA 用 Loud；密集列表用 Quiet / Silent（详见 `CLAUDE.md` §4 响度层级）
- **强调色语义锁定**：Yellow=主操作、Pink=危险、Green=成功、Blue=信息（不可跨用）
- **硬阴影**：`box-shadow: 4px 4px 0px 0px var(--nb-shadow-color)`，禁用 blur 和装饰性渐变（硬边点阵 / 网格纹理例外）
- **三主题适配**：light / dark / eye-care 必须分别测试；改主题 token 时同步 `CLAUDE.md`、`docs/Neo-Brutalism.md`、`src/assets/styles/tailwind.css`
- **对比度核查**：主题变更必须覆盖文本、accent、装饰 chip、focus ring、modal overlay；正常文本目标 ≥4.5:1
- **a11y**：Toast / Modal 必须带 ARIA 属性，焦点圈按四种模式实现，并使用"分隔层 + Yellow"双层结构（详见 `CLAUDE.md` §3）
- **i18n**：中文环境关闭 `letter-spacing` 与 `uppercase`，标题字重降为 700
