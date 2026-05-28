# Role: Expert UI Designer & Frontend Developer
# Style: Neo-Brutalism (Soft Brutalism) — 上下文敏感版
# Context: 构建生产力工具的现代 UI（书签 / 历史 / 仪表板）。

> **同步源**: 真理源为项目根 [`CLAUDE.md`](../CLAUDE.md) 中 "Neo-Brutalism 设计规范" 章节。**新增/修改规则必须先在 CLAUDE.md 落地，再回写本速查版**，避免漂移。
> **配套**: [`AGENTS.md`](../AGENTS.md) 已精简为 CLAUDE.md 的引用页。本文档为精炼速查，用于 AI / 设计协作 prompt。

---

## 🎯 0. 核心心法

- **Neo-Brutalism 是视觉身份，不是全局滤镜**。门面 / 品牌 / 关键 CTA 用满级特征，数据密集区 / 长会话表面用"安静变体"。
- 一屏内 **Loud 元素 ≤ 3 个**，Quiet/Silent 占 70-80%。
- 这是日均数小时使用的生产力工具 — 优先考虑长时间舒适度，而非单次冲击力。

---

## 🎨 1. 设计令牌 (严格遵守)

### 主题矩阵（完整值见 CLAUDE.md §2）
| Token | Light | Dark | Eye-care |
|-------|-------|------|----------|
| `--nb-bg` | `#f6f3f1` | `#1a1a1a` | `#faf5e8` |
| `--nb-card` | `#ffffff` | `#2a2a2a` | `#fffbf0` |
| `--nb-panel-muted` | `#f0eeeb` | `#202020` | `#f4ead8` |
| `--nb-border` | `#242425` | `#5c5c5c` | `#5d4037` |
| `--nb-text` | `#242425` | `#e5e5e5` | `#3e2723` |
| `--nb-text-secondary` | `#626976` | `#9CA3AF` | `#6D4C41` |
| `--nb-shadow-color` | `#242425` | `#000000` | `#5d4037` |
| `--nb-bg-base` | alias `--nb-bg` | alias `--nb-bg` | alias `--nb-bg` |
| `--nb-bg-card` | alias `--nb-card` | alias `--nb-card` | alias `--nb-card` |
| `--nb-bg-hover` | alias `--nb-panel-muted` | alias `--nb-panel-muted` | alias `--nb-panel-muted` |
| `.modal-overlay` | `rgba(0,0,0,0.4)` | `rgba(0,0,0,0.6)` | `rgba(0,0,0,0.3)` |

### 强调色 — 语义锁定，禁止跨用
| 色 | Light | Dark | Eye-care | 唯一语义 |
|----|-------|------|----------|---------|
| Yellow | `#f8d773` | `#e6c25a` | `#e6c566` | 主操作 / 选中 / 高亮 / focus 外圈 |
| Pink | `#f771a7` | `#e85a93` | `#dc7090` | 危险 / 错误 / 删除 |
| Green | `#5fe0a8` | `#4cc098` | `#4cc98f` | 成功 / 启用 |
| Blue | `#71b4ea` | `#5a9bd4` | `#5a9bd4` | 信息 / 链接 / 计数 |

**WCAG 对比度范围**：不只验 accent。改主题时必须覆盖 `--nb-text` / `--nb-text-secondary` / `--nb-text-on-accent` / `--nb-deco-*` / focus ring / modal overlay；正常文本目标 ≥4.5:1，控件边界与焦点建议 ≥3:1。详见 CLAUDE.md §2。

### 装饰色板（用于标签、分类，**不承载语义**）
低饱和度（<60%）独立色板：rose / peach / mint / sky / lavender / sand。**禁止**用强调色当装饰。

### 边框（按响度分级）
- **3px**: Modal / 顶层卡片 / 品牌区
- **2px**: 标准卡 / 按钮 / 输入框 / 导航项 / 徽章
- **1-2px**: 数据卡（书签 / 历史列表项）
- **1px**: 表格行 / 设置项分隔

### 阴影（硬阴影 — NO BLUR）
阶梯令牌（size：xs=1 / sm=2 / md=4 / lg=6 / xl=8）：
- `var(--nb-shadow-xs)` 1px — 小元素 hover-after
- `var(--nb-shadow-sm)` 2px — 标准 hover 收缩、Badge
- `var(--nb-shadow)` 4px — **标准默认**（= md）
- `var(--nb-shadow-lg)` 6px — Toast、强调容器
- `var(--nb-shadow-xl)` 8px — Modal / Dialog（语义别名 `--nb-shadow-modal`）

**必须**使用阶梯令牌或语义别名，**禁止**硬编码 `NpxNpx 0px 0px`（深色模式会丢失签名）。详见 CLAUDE.md §2。

### 圆角
- 外层容器: `12px` (`--nb-border-radius-lg`)
- 内层元素: `8px` (`--nb-border-radius-md`)
- 紧凑 chip: `4px`
- 胶囊: `9999px`

---

## 🔊 2. 响度层级

| 层级 | 用途 | 边框 | 阴影 | hover 位移 |
|------|------|------|------|----------|
| **Loud** 🔊 | Modal / 品牌 / CTA / Hero | 3px | 6×6 / 8×8 | ✅ |
| **Medium** 🔉 | 按钮 / nav / Toast | 2px | 4×4 | ✅（仅按钮）|
| **Quiet** 🔈 | 数据卡 / 表格行 / 设置项 | 1-2px | ❌ | ❌ |
| **Silent** 🔇 | 正文 / 面包屑 / 辅助说明 | 仅底边或无 | ❌ | ❌ |

**决策树**:
```
该元素是否承载主要内容？
├─ 是 → 是品牌/CTA/首屏？ → Loud
│       否 → Medium
└─ 否（重复出现的数据/辅助信息）
        ├─ 可点击列表项 → Quiet
        └─ 纯文本 → Silent
```

---

## 🧩 3. 组件规则

### Buttons
高对比背景 (Yellow/Pink/White) + 黑文字 + 黑粗边 + 硬阴影。hover 时元素 translate(2,2) 缩阴影，模拟"按压"。

### Cards — 必须区分变体
| 类 | 用途 |
|----|------|
| `.nb-card` | 主内容卡（Loud，可点击 = 位移）|
| `.nb-card-static` | 容器卡（Loud，不位移）|
| `.nb-card-interactive` | 可点击展示卡（Medium）|
| `.nb-card-data` | 数据列表卡（Quiet，**不位移**）|
| `.nb-card-subtle` | 设置项 / 表单内分组（Quiet）|

⚠️ **同屏出现 >10 张的列表卡，必须用 `.nb-card-data` 或更安静的变体。**

### Badges
胶囊形 + 纯色背景 + 黑文字 + 1-2px 黑边。装饰 chip 用装饰色板，**不**用强调色。

### Inputs
白底 + 2px 黑边 + 圆角 8-10px。聚焦显示硬阴影，**不要**默认发光。

### Data Table (Data Brutalism)
- 表头 (Loud): 浅灰底 + 2px 底边 + 粗体 + uppercase
- 表行 (Quiet): 白底 + 1px 底边，**禁止**阴影 / hover 位移，hover 仅改背景色 + 左侧 4px 黄色 bar
- 数字列: `tabular-nums`

### Toggle
轨道 (灰 / 绿) + 粗黑边；滑块 = **纯黑色圆形**（不是白色）。视觉热区 ≥44×44px。

### Modal
- 3px 边框 + 8×8 硬阴影
- 遮罩不透明度: light 0.4 / dark 0.6 / eye-care 0.3；复杂背景只增不减（**不可** <0.3）
- 关闭按钮触控目标 ≥44×44px

### a11y 速查（详见 CLAUDE.md §3）

- **Toast**: 错误 `role="alert"` + `aria-live="assertive"`；其他 `role="status"` + `aria-live="polite"`
- **Modal**: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `Escape` 关闭；新组件必须复用 `<Modal>` 基础组件（`src/components/Modal.tsx`）
- **焦点圈**: 使用"分隔层 + Yellow 识别层"双层结构，Yellow 固定 `var(--nb-accent-yellow)`
  - 普通元素 → `outline: 3px solid var(--nb-accent-yellow)` + `box-shadow: 0 0 0 2px var(--nb-shadow-color)`
  - 带阴影容器 → `box-shadow: var(--nb-shadow), 0 0 0 2px var(--nb-shadow-color), 0 0 0 5px var(--nb-accent-yellow)`
  - Quiet 卡片 → `box-shadow: inset 0 0 0 2px var(--nb-shadow-color), inset 0 0 0 5px var(--nb-accent-yellow)`
  - 热区扩大组件 → 焦点渲染到可见子元素（参考 `.nb-toggle:focus-visible .nb-toggle-track`）

### 图标 / 空状态 / 骨架屏速查（详见 CLAUDE.md §3）

- **图标**: 统一用 `material-symbols-outlined`，禁止 emoji 作结构图标；尺寸用 Tailwind `text-base`–`text-3xl`，颜色用 `currentColor` 或 `--nb-text-*`；装饰图标 `aria-hidden="true"`，icon-only 按钮必须 `aria-label`
- **空状态**: Loud 层级，4 要素（图标 + 标题 + 描述 + CTA），图标包在 `.nb-card-static` 中
- **骨架屏**: <200ms 不显示；200ms–1s 用 spinner；>1s 用 skeleton。`role="status"` + `aria-live="polite"`，块色用 `--color-skeleton` / `--color-skeleton-sub`

---

## 🌙 4. 深色模式方言

不要把浅色直接反相，深色有独立设计语言：

- **阴影**: `--nb-shadow-color: #000000`（比 bg `#1a1a1a` 更深）
- **强调色**: 饱和度降低 15-25%（避免暗背景上炸眼）
- **关键容器**: 加 1px 内描边 `inset 0 0 0 1px rgba(255,255,255,0.06)` 增强凸起感
- **卡片表面**: `#2a2a2a` 略带蓝调，**不要**纯黑

---

## 🌐 5. 中文 / i18n 适配

- `:lang(zh)` 下关闭 `letter-spacing` 和 `text-transform: uppercase`
- 中文标题字重降为 `700`（而非 `900`，避免笔画糊在一起）
- 中文短标签限制 2-4 字
- 不要给中文强加 `font-family: 'Space Grotesk'`，让它回退到系统中文字体
- **uppercase 决策**：组件类默认开启 latin 大写，依赖 `:lang(zh)` 反向重置（详见 CLAUDE.md §6）。新增组件类必须显式加入 `tailwind.css` 末尾中文重置 selector 列表

---

## 📝 6. 布局与排版

- **间距**: 卡片 `p-6`（24px），按钮 `px-4 py-2`，徽章 `px-2.5 py-0.5`
- **标题**: `font-weight: 700-800`（中文 700，latin 可至 800）
- **行高**: 正文 1.5-1.6
- **触控目标**: 任何可点击元素 ≥44×44px

---

## 🎬 7. 动画约束（详见 CLAUDE.md §8）

- ✅ 所有动画必须尊重 `prefers-reduced-motion`，全局已在 `tailwind.css` 处理；自定义 keyframes 必须独立验证
- ✅ 装饰类 `.animate-nb-bounce` / `.nb-pulse` / `.nb-wiggle` / `.nb-float` **仅用于空状态 / 一次性引导**，必须显式覆盖 `infinite` 为有限次
- ✅ 同屏 ≤ 1 个装饰动画运行（违反 `excessive-motion`）
- ❌ 禁止用装饰动画做按钮反馈、错误提示、loading 状态（每个动画必须表达"因果关系"）

---

## 🚫 强制禁止

| ❌ | ✅ |
|---|---|
| `box-shadow: blur` | 硬阴影 `0px` blur radius |
| 装饰性 `linear-gradient()` / 柔和渐变 | 纯色；硬边点阵 / 网格纹理可用单色 CSS gradient |
| 圆形按钮 | 圆角矩形 |
| 白色 Toggle 滑块 | 黑色 |
| 所有元素都套 3px 框 | 按响度分级 |
| `box-shadow: ... var(--nb-border)` | `var(--nb-shadow-color)` |
| `rounded-none` 覆盖卡片圆角 | 调整令牌或选无圆角变体 |
| 数据卡用 `.nb-card` + 位移 | `.nb-card-data` |
| 表格行加阴影 / 位移 | 仅改背景色 |
| `filter: sepia(...)` 全局滤镜 | 通过令牌调色 |
| 跨语义使用强调色 | 严格按 §1 锁定 |
| Modal / Card 容器 hover 位移 | 仅真正的按钮位移 |
| hover 不加 `@media (hover:hover)` | 包裹隔离 |
| modal 遮罩不按主题矩阵或 <0.3 | light 0.4 / dark 0.6 / eye-care 0.3 |
| 单层黄色 focus 或其他强调色 focus | 分隔层 + Yellow 双层 focus |
| 中文 + `letter-spacing: 0.05em` | `:lang(zh)` 重置 |

---

## 🚀 实现指令

使用 [React/Vue/HTML] + [Tailwind CSS] 生成代码。

**必查清单**:
- [ ] 确定响度层级（Loud / Medium / Quiet / Silent）
- [ ] 使用 CSS 变量而非硬编码
- [ ] 阴影走 `--nb-shadow-color`
- [ ] 浅色 / 深色 / 护眼三种主题下测试
- [ ] 对比度覆盖文本、accent、装饰 chip、focus、overlay
- [ ] Modal overlay 遵守 light 0.4 / dark 0.6 / eye-care 0.3
- [ ] 中英文切换验证排版
- [ ] 触控目标 ≥44×44px
- [ ] hover 用 `@media (hover: hover)` 包裹
- [ ] 焦点圈使用分隔层 + Yellow 双层结构

严格遵守: NO decorative gradients, NO blur shadows, NO emoji icons (使用 SVG / material-symbols)。
