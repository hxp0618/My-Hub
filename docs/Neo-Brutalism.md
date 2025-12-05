# Role: Expert UI Designer & Frontend Developer
# Style: Neo-Brutalism (Soft Brutalism)
# Context: Building a modern Task Management / Dashboard UI.

---

## 🎨 1. Design Tokens (Strict Compliance)

### Colors (Palette)
- **Bg Base**: `#f6f3f1` (Light Cream - Main Background)
- **Bg Card**: `#ffffff` (White - Cards/Inputs)
- **Text/Border**: `#242425` (Dark Charcoal/Black - almost #000)
- **Accent Pink**: `#f771a7` (Hot Pink - Action/Delete)
- **Accent Yellow**: `#f8d773` (Marigold - Primary/Highlight)
- **Accent Blue**: `#71b4ea` (Sky Blue - Info/Status)
- **Accent Green**: `#5fe0a8` (Mint - Success)

### Borders (The Core Identity)
- **Thick Borders**: All containers, cards, and main buttons MUST have `border: 2px solid #242425` (or 3px for outer containers).
- **Dividers**: `border-bottom: 1px solid #e0e0e0` (Only for inner table rows).
- **No Borderless**: No elements should be floating without a border unless it's pure text.

### Shadows (Hard Shadows - NO BLUR)
- **Rule**: Shadows must be SOLID (100% opacity), sharp, and offset. NO blurring.
- **CSS**: `box-shadow: 4px 4px 0px 0px #242425;`
- **Hover**: Translate element `2px 2px` and reduce shadow to `2px 2px 0px 0px` to simulate a "press" effect.

### Radius
- **Outer Containers**: `rounded-xl` (approx 12px-16px).
- **Inner Elements**: `rounded-lg` (approx 8px-10px).
- **Buttons**: `rounded-md` or `rounded-lg`.

---

## 🧩 2. Component Rules

### Buttons
- **Structure**: High contrast background (Yellow/Pink/White) + Black Text + Thick Black Border + Hard Shadow.
- **Interaction**: On hover, the button physically moves down-right (translate), and the shadow shrinks.

### Status Badges (Pills)
- **Shape**: Pill-shaped (`rounded-full` or high radius).
- **Style**: Solid pastel background color (Blue/Green) + Black Text + **1px or 2px Black Border**.

### Input Fields & Selects
- **Style**: White background + 2px Black Border + Deep Radius (10px).
- **Focus**: No default glow. Focus state should be a thicker border or a sharp shadow offset.

### Data Table
- **Header**: Light grey background (`#f0f0ee`) + Bottom Border (2px Black).
- **Rows**: White background.
- **Font**: Monospace or Geometric Sans-serif for numbers.

### Toggle Switch
- **Track**: Grey (inactive) or Green (active) with a **Thick Black Border**.
- **Thumb**: **Solid Black Circle** (Not white).

---

## 📝 3. Layout Principles
- **Spacing**: Generous padding (approx `p-6` for cards).
- **Typography**: Bold Headings (Font Weight 700/800). High readability.
- **Contrast**: Always maintain Black Text on Light Backgrounds.

## 🚀 Implementation Instruction
Generate the code using [React/Vue/HTML] with [Tailwind CSS].
Ensure strictly NO gradients and NO blur radii on shadows.
