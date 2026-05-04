---
name: Industrial Precision
colors:
  surface: '#1b110a'
  surface-dim: '#1b110a'
  surface-bright: '#43372e'
  surface-container-lowest: '#150c06'
  surface-container-low: '#241912'
  surface-container: '#281d15'
  surface-container-high: '#33281f'
  surface-container-highest: '#3f3229'
  on-surface: '#f3dfd1'
  on-surface-variant: '#ddc1ae'
  inverse-surface: '#f3dfd1'
  inverse-on-surface: '#3a2e25'
  outline: '#a58c7b'
  outline-variant: '#564334'
  surface-tint: '#ffb77f'
  primary: '#ffb77f'
  on-primary: '#4e2600'
  primary-container: '#ff8a00'
  on-primary-container: '#613100'
  inverse-primary: '#914c00'
  secondary: '#ffb95a'
  on-secondary: '#462a00'
  secondary-container: '#c68315'
  on-secondary-container: '#3d2400'
  tertiary: '#88ceff'
  on-tertiary: '#00344d'
  tertiary-container: '#00b3fc'
  on-tertiary-container: '#004260'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc4'
  primary-fixed-dim: '#ffb77f'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6f3900'
  secondary-fixed: '#ffddb6'
  secondary-fixed-dim: '#ffb95a'
  on-secondary-fixed: '#2a1800'
  on-secondary-fixed-variant: '#643f00'
  tertiary-fixed: '#c8e6ff'
  tertiary-fixed-dim: '#88ceff'
  on-tertiary-fixed: '#001e2e'
  on-tertiary-fixed-variant: '#004c6d'
  background: '#1b110a'
  on-background: '#f3dfd1'
  surface-variant: '#3f3229'
typography:
  display:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h2:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The visual identity of this design system centers on "Industrial Elegance." It bridges the gap between the rugged, physical world of construction and the sophisticated precision of high-end software. The brand personality is authoritative, innovative, and meticulously organized.

The aesthetic utilizes **Glassmorphism** as its primary stylistic driver. By layering translucent surfaces over a deep, obsidian background, the UI achieves a sense of immense depth and physical space—reminiscent of architectural blueprints viewed on a futuristic light table. High-fidelity glow effects and soft, atmospheric shadows are used sparingly to highlight critical data points and active states, ensuring the interface feels alive and responsive.

## Colors

The palette is anchored by a "True Dark" foundation, utilizing **#0A0A0A** to provide a high-contrast canvas for the primary orange accents. The primary orange gradient symbolizes energy, safety, and construction, but is refined here into a premium metallic finish.

Functional colors (Success, Warning, Error) should maintain high saturation to remain legible against the dark background. Use the primary gradient exclusively for high-impact actions and brand moments. All surfaces rely on transparency levels rather than solid hex codes to maintain the glass effect across different stacking contexts.

## Typography

**Manrope** is the sole typeface for this design system, chosen for its modern, geometric construction and exceptional legibility in data-heavy environments. The typographic scale prioritizes clear hierarchy; large display headings use a heavier weight and tighter tracking to command attention, while body text maintains a generous line height for readability during long-form project reporting.

Labels and metadata should utilize the uppercase style with increased letter spacing to provide a "technical" or "engineered" feel, distinguishing administrative data from primary content.

## Layout & Spacing

The layout philosophy follows a **12-column fluid grid** system designed for high-density information displays. Components are sized using a 4px baseline grid to ensure mathematical harmony.

Margins and gutters are generous (#sm and #md units) to prevent the glassmorphic elements from feeling cluttered. When containers are nested, padding should increase proportionally to the container's size to maintain the high-end SaaS feel. Use negative space aggressively to separate complex construction datasets, such as Gantt charts and resource tables.

## Elevation & Depth

Depth in this design system is achieved through **optical layering** rather than traditional dropshadows. 

1.  **Base Layer:** The solid #0A0A0A background.
2.  **Surface Layer:** Glassmorphism panels (rgba(255,255,255,0.04)) with a 20px backdrop blur. These panels appear to float above the base.
3.  **Accent Layer:** Components that require immediate focus (like active modals) use a more opaque glass effect and a subtle, wide-spread outer glow using the primary orange color at 10% opacity.
4.  **Borders:** Every floating element is defined by a thin, 1px border (rgba(255,255,255,0.08)). This "inner light" stroke simulates the edge of a glass pane catching the light.

## Shapes

The shape language is sophisticated and approachable, characterized by large corner radii. 
- **Standard Cards/Modals:** Use a **20px** radius to emphasize the premium, modern feel.
- **Buttons and Inputs:** Use a **16px** radius for a slightly tighter, more functional appearance.
- **Icon Enclosures:** Use a **12px** radius.

This consistency in soft corners balances the "coldness" of the dark mode and glass textures, making the construction management tool feel more like a consumer-grade experience.

## Components

### Buttons
Primary buttons feature the signature orange gradient with white text for maximum contrast. On hover, apply a soft orange glow effect (`0px 0px 20px rgba(255, 138, 0, 0.3)`). Secondary buttons use the subtle glass background with a white border.

### Cards
Cards are the primary container. They must always have a `backdrop-filter: blur(20px)` and the 1px subtle border. For high-priority project cards, a 2px top border featuring the primary gradient can be used as a "status strip."

### Input Fields
Inputs are dark and recessed. They use a slightly darker transparency than cards to create a "punched-out" effect. On focus, the border transitions from the subtle white to the primary orange, accompanied by a faint orange inner glow.

### Progress & Status
For construction milestones, use thick, rounded progress bars. The "filled" portion of the bar should use the primary gradient, while the "unfilled" portion remains a dark glass texture.

### Charts & Data
Graphs should use neon-tinted versions of the brand colors. Data points should have a "bloom" or glow effect to ensure they pop against the dark glass surfaces.