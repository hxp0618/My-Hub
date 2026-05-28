# Role: Expert UI Designer & Frontend Developer
# Style: Neo-Brutalism (Soft Brutalism) — 上下文敏感版
# Context: 构建生产力工具的现代 UI（书签 / 历史 / 仪表板）。

> **配套文档**: 完整规范见项目根 `CLAUDE.md` / `AGENTS.md` 的 "Neo-Brutalism 设计规范" 章节。本文为精炼版速查，用于 AI / 设计协作 prompt。

---

## 🎯 0. 核心心法

- **Neo-Brutalism 是视觉身份，不是全局滤镜**。门面 / 品牌 / 关键 CTA 用满级特征，数据密集区 / 长会话表面用"安静变体"。
- 一屏内 **Loud 元素 ≤ 3 个**，Quiet/Silent 占 70-80%。
- 这是日均数小时使用的生产力工具 — 优先考虑长时间舒适度，而非单次冲击力。

---

## 🎨 1. 设计令牌 (严格遵守)

### 颜色 (浅色模式)
- **Bg Base**: `#f6f3f1` (米色主背景)
- **Bg Card**: `#ffffff` (卡片)
- **Bg Panel-muted**: `#f0eeeb` (表头 / 设置项底色)
- **Text/Border**: `#242425` (近黑色)
- **Shadow-Color**: `#242425` (独立令牌，**不复用** Border)

### 强调色 — 语义锁定，禁止跨用
| 色 | 值 | 唯一语义 |
|----|-----|---------|
| Yellow | `#f8d773` | 主操作 / 选中 / 高亮 |
| Pink | `#f771a7` | 危险 / 错误 / 删除 |
| Green | `#5fe0a8` | 成功 / 启用 |
| Blue | `#71b4ea` | 信息 / 链接 / 计数 |

### 装饰色板（用于标签、分类，**不承载语义**）
低饱和度（<60%）独立色板：rose / peach / mint / sky / lavender / sand。**禁止**用强调色当装饰。

### 边框（按响度分级）
- **3px**: Modal / 顶层卡片 / 品牌区
- **2px**: 标准卡 / 按钮 / 输入框 / 导航项 / 徽章
- **1-2px**: 数据卡（书签 / 历史列表项）
- **1px**: 表格行 / 设置项分隔

### 阴影（硬阴影 — NO BLUR）
- 标准: `box-shadow: 4px 4px 0px 0px var(--nb-shadow-color)`
- 悬停: `2px 2px 0px 0px var(--nb-shadow-color)`
- Modal: `8px 8px 0px 0px var(--nb-shadow-color)`
- **必须**使用 `var(--nb-shadow-color)` 令牌，**禁止**直接 `var(--nb-border)`（深色模式会丢失视觉签名）

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
- 遮罩不透明度: light 0.4 / dark 0.6 / eye-care 0.3（**不可** <0.3）
- 关闭按钮触控目标 ≥44×44px

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

---

## 📝 6. 布局与排版

- **间距**: 卡片 `p-6`（24px），按钮 `px-4 py-2`，徽章 `px-2.5 py-0.5`
- **标题**: `font-weight: 700-800`（中文 700，latin 可至 800）
- **行高**: 正文 1.5-1.6
- **触控目标**: 任何可点击元素 ≥44×44px

---

## 🚫 强制禁止

| ❌ | ✅ |
|---|---|
| `box-shadow: blur` | 硬阴影 `0px` blur radius |
| `linear-gradient()` | 纯色 |
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
| modal 遮罩 <0.3 不透明度 | 至少 0.3-0.4 |
| 中文 + `letter-spacing: 0.05em` | `:lang(zh)` 重置 |

---

## 🚀 实现指令

使用 [React/Vue/HTML] + [Tailwind CSS] 生成代码。

**必查清单**:
- [ ] 确定响度层级（Loud / Medium / Quiet / Silent）
- [ ] 使用 CSS 变量而非硬编码
- [ ] 阴影走 `--nb-shadow-color`
- [ ] 浅色 / 深色 / 护眼三种主题下测试
- [ ] 中英文切换验证排版
- [ ] 触控目标 ≥44×44px
- [ ] hover 用 `@media (hover: hover)` 包裹
- [ ] 焦点圈与设计语言一致

严格遵守: NO gradients, NO blur shadows, NO emoji icons (使用 SVG / material-symbols)。
