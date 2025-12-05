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


## design
- The generated document needs to be in Chinese.
- All development should consider theme adaptation.

### 🎨 1. Design Tokens (Strict Compliance)

#### Colors (Palette)
- **Bg Base**: `#f6f3f1` (Light Cream - Main Background)
- **Bg Card**: `#ffffff` (White - Cards/Inputs)
- **Text/Border**: `#242425` (Dark Charcoal/Black - almost #000)
- **Accent Pink**: `#f771a7` (Hot Pink - Action/Delete)
- **Accent Yellow**: `#f8d773` (Marigold - Primary/Highlight)
- **Accent Blue**: `#71b4ea` (Sky Blue - Info/Status)
- **Accent Green**: `#5fe0a8` (Mint - Success)

#### Borders (The Core Identity)
- **Thick Borders**: All containers, cards, and main buttons MUST have `border: 2px solid #242425` (or 3px for outer containers).
- **Dividers**: `border-bottom: 1px solid #e0e0e0` (Only for inner table rows).
- **No Borderless**: No elements should be floating without a border unless it's pure text.

#### Shadows (Hard Shadows - NO BLUR)
- **Rule**: Shadows must be SOLID (100% opacity), sharp, and offset. NO blurring.
- **CSS**: `box-shadow: 4px 4px 0px 0px #242425;`
- **Hover**: Translate element `2px 2px` and reduce shadow to `2px 2px 0px 0px` to simulate a "press" effect.

#### Radius
- **Outer Containers**: `rounded-xl` (approx 12px-16px).
- **Inner Elements**: `rounded-lg` (approx 8px-10px).
- **Buttons**: `rounded-md` or `rounded-lg`.

---

### 🧩 2. Component Rules

#### Buttons
- **Structure**: High contrast background (Yellow/Pink/White) + Black Text + Thick Black Border + Hard Shadow.
- **Interaction**: On hover, the button physically moves down-right (translate), and the shadow shrinks.

#### Status Badges (Pills)
- **Shape**: Pill-shaped (`rounded-full` or high radius).
- **Style**: Solid pastel background color (Blue/Green) + Black Text + **1px or 2px Black Border**.

#### Input Fields & Selects
- **Style**: White background + 2px Black Border + Deep Radius (10px).
- **Focus**: No default glow. Focus state should be a thicker border or a sharp shadow offset.

#### Data Table
- **Header**: Light grey background (`#f0f0ee`) + Bottom Border (2px Black).
- **Rows**: White background.
- **Font**: Monospace or Geometric Sans-serif for numbers.

#### Toggle Switch
- **Track**: Grey (inactive) or Green (active) with a **Thick Black Border**.
- **Thumb**: **Solid Black Circle** (Not white).

---

### 📝 3. Layout Principles
- **Spacing**: Generous padding (approx `p-6` for cards).
- **Typography**: Bold Headings (Font Weight 700/800). High readability.
- **Contrast**: Always maintain Black Text on Light Backgrounds.

### 🚀 Implementation Instruction
Generate the code using [React/Vue/HTML] with [Tailwind CSS].
Ensure strictly NO gradients and NO blur radii on shadows.