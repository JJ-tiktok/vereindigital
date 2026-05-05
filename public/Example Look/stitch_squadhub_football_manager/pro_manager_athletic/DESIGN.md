---
name: Pro Manager Athletic
colors:
  surface: '#f9f9ff'
  surface-dim: '#d8d9e3'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3fd'
  surface-container: '#ecedf7'
  surface-container-high: '#e6e7f2'
  surface-container-highest: '#e1e2ec'
  on-surface: '#191b23'
  on-surface-variant: '#424754'
  inverse-surface: '#2e3038'
  inverse-on-surface: '#eff0fa'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#924700'
  on-tertiary: '#ffffff'
  tertiary-container: '#b75b00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#f9f9ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ec'
typography:
  h1:
    fontFamily: Lexend
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Lexend
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-base:
    fontFamily: Lexend
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  body-sm:
    fontFamily: Lexend
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  label-caps:
    fontFamily: Lexend
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  stats-lg:
    fontFamily: Lexend
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

The visual identity of this design system centers on "Athletic Intelligence." It bridges the gap between high-stakes sports performance and rigorous data analytics. The style is **Corporate Modern** with a **Minimalist** edge, ensuring that the complexity of football management is tempered by a clean, organized interface. 

The UI should feel like a high-end scouting tool: fast, precise, and authoritative. By prioritizing purposeful whitespace and a restricted color palette, the design system directs the user's focus toward critical performance metrics and tactical decisions without unnecessary visual noise.

## Colors

This design system utilizes a high-clarity light mode palette. The **Primary Blue (#3B82F6)** acts as the "action" color, used for buttons, active states, and critical data highlights. 

The neutral palette is built on the Slate scale, providing a cool, professional foundation. 
- **Background:** Use `#FFFFFF` for main content areas and `#F8FAFC` for page backgrounds to create subtle contrast.
- **Typography:** Primary text uses `#0F172A` for maximum legibility, while secondary metadata uses `#64748B`.
- **Status:** Standardized semantic colors (Green for win/fitness, Red for loss/injury) are used sparingly to maintain the clean aesthetic.

## Typography

Lexend is the exclusive typeface for this design system. Its expanded character widths and geometric clarity make it exceptionally readable for data-heavy layouts. 

- **Headlines:** Use Bold and SemiBold weights to establish clear hierarchy. Large stat displays should use the `stats-lg` style to emphasize key performance indicators.
- **Body:** Standard body text should maintain a 1.5 line-height to ensure player stats and scouting reports are digestible.
- **Labels:** Small, all-caps labels are used for table headers and secondary category tags to differentiate them from interactive body text.

## Layout & Spacing

This design system employs a **Fixed Grid** model for desktop (12 columns) and a fluid model for mobile. A strict 8px base unit (the "Sport Eight" rule) governs all spatial relationships.

- **Purposeful Whitespace:** Layouts should feel breathable. Content blocks (cards) are separated by `lg` (24px) spacing.
- **Information Density:** For data tables and player rosters, spacing can be compressed to `sm` (8px) padding within rows to allow for high information density without sacrificing clarity.
- **Alignment:** All elements must align to the 8px grid to maintain a disciplined, "organized" feel.

## Elevation & Depth

To maintain the **shadcn/ui** aesthetic, this design system avoids heavy shadows and multiple layered gradients. Depth is achieved through:

1.  **Low-Contrast Outlines:** Most containers use a 1px border (`#E2E8F0`) instead of a shadow.
2.  **Subtle Ambient Shadows:** Only the most prominent elements (Modals, Popovers) use a soft, highly diffused shadow: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`.
3.  **Tonal Layers:** Secondary content areas (like a sidebar or a statistics pane) should use the `#F8FAFC` background to sit "behind" the primary white cards.

## Shapes

The shape language is defined by **Medium Roundness (8px)**. This choice balances the aggressive, sharp nature of competitive sports with the approachable, modern feel of a high-end SaaS application.

- **Components:** Buttons, Input Fields, and Cards all share the `0.5rem` (8px) radius.
- **Tags/Chips:** Use the `rounded-xl` (1.5rem) setting to create a "pill" effect, helping them stand out against the more architectural rectangular cards.
- **Selection States:** Hover states and active selections should mirror the roundedness of their parent containers.

## Components

### Buttons
- **Primary:** Solid `#3B82F6` with white text. No gradient. 8px radius.
- **Secondary:** Transparent background with a 1px `#E2E8F0` border.
- **Action:** Small, high-contrast buttons for tactical changes (e.g., "Substitute").

### Cards
- White background, 1px `#E2E8F0` border, 8px radius.
- Header sections within cards should have a subtle bottom border to separate titles from data.

### Data Tables
- Clean, borderless rows with `#F8FAFC` hover states. 
- Lexend Medium for column headers in `label-caps` style.
- Use horizontal progress bars (Primary Blue) within cells to visualize player attributes (e.g., Pace, Shooting).

### Chips & Badges
- Used for player positions (e.g., "ST", "CM") and status (e.g., "Injured"). 
- Small text, SemiBold, with light tinted backgrounds corresponding to the status color.

### Input Fields
- Minimalist design: 1px border that shifts to 2px Primary Blue on focus. 
- Clear, legible placeholder text in `#94A3B8`.

### Tactical Pitch Component
- A stylized, top-down green or dark-gray pitch view with circular player icons. 
- Player icons should use the Primary Blue for the "Active" selected player.