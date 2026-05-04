---
name: Industrial Precision
colors:
  surface: '#fdf7ff'
  surface-dim: '#ded8e0'
  surface-bright: '#fdf7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f2fa'
  surface-container: '#f2ecf4'
  surface-container-high: '#ece6ee'
  surface-container-highest: '#e6e0e9'
  on-surface: '#1d1b20'
  on-surface-variant: '#494551'
  inverse-surface: '#322f35'
  inverse-on-surface: '#f5eff7'
  outline: '#7a7582'
  outline-variant: '#cbc4d2'
  surface-tint: '#6750a4'
  primary: '#4f378a'
  on-primary: '#ffffff'
  primary-container: '#6750a4'
  on-primary-container: '#e0d2ff'
  inverse-primary: '#cfbcff'
  secondary: '#63597c'
  on-secondary: '#ffffff'
  secondary-container: '#e1d4fd'
  on-secondary-container: '#645a7d'
  tertiary: '#765b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c9a74d'
  on-tertiary-container: '#503d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#4f378a'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#cdc0e9'
  on-secondary-fixed: '#1f1635'
  on-secondary-fixed-variant: '#4b4263'
  tertiary-fixed: '#ffdf93'
  tertiary-fixed-dim: '#e7c365'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#fdf7ff'
  on-background: '#1d1b20'
  surface-variant: '#e6e0e9'
typography:
  display-xl:
    fontFamily: manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: spaceGrotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  code-mono:
    fontFamily: monospace
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system embodies a "High-Tech Industrial" aesthetic, blending the rugged reliability of heavy machinery with the sophisticated precision of modern SaaS. The brand personality is authoritative, efficient, and transparent. 

The design style follows a **Corporate Modern** approach with **Minimalist** influences. It prioritizes clarity and functional density. In light mode, the interface shifts from a dark "command center" feel to a "technical laboratory" atmosphere—clean, bright, and highly legible. The visual language utilizes structured grids, high-contrast accents, and purposeful movement to guide the user through complex industrial workflows.

## Colors

The light mode palette is anchored by a clean, off-white background (`#F8F9FA`) to reduce eye strain during long-duration technical tasks. Surface elements use pure white (`#FFFFFF`) to create clear containment and separation. 

The primary brand identifier remains the vibrant orange gradient, reserved for high-priority actions, progress indicators, and active states. Neutral tones are strictly controlled grays, moving from subtle borders (`#E9ECEF`) to deep charcoal for primary text (`#212529`). Semantic colors for status (Success, Warning, Error) are desaturated slightly to maintain the professional, premium SaaS aesthetic without becoming visually overwhelming.

## Typography

The typographic hierarchy utilizes a multi-font approach to distinguish between editorial, functional, and technical data. 

**Manrope** is used for headlines to provide a modern, balanced, and premium feel. **Inter** handles the majority of the UI and body copy, chosen for its exceptional legibility in dense data environments. **Space Grotesk** is applied to labels, metadata, and technical identifiers to inject a futuristic, high-precision character into the interface. For RTL support in Arabic, use the "Inter" equivalent for Naskh-style readability or a system font fallback that maintains the vertical rhythm and x-height established in the LTR settings.

## Layout & Spacing

This design system employs a 12-column fluid grid for desktop and an 8-column grid for tablets. The spacing logic is based on a 4px baseline unit, ensuring all components align to a rigorous mathematical rhythm. 

To support multi-language environments, the layout logic is abstracted into logical properties (e.g., `padding-inline-start` instead of `padding-left`). In RTL mode (Arabic), the entire layout mirrors horizontally: the sidebar moves to the right, chevron icons flip, and text alignment shifts to the right. The 24px gutter remains constant across all languages to ensure structural integrity.

## Elevation & Depth

In light mode, elevation is conveyed through **Tonal Layering** and **Ambient Shadows**. 

1.  **Level 0 (Base):** The off-white background (`#F8F9FA`).
2.  **Level 1 (Cards/Surfaces):** Pure white containers with a 1px border (`#E9ECEF`).
3.  **Level 2 (Floating/Interactive):** Elements that require focus (e.g., active cards, dropdowns) use a soft, diffused shadow: `0px 4px 12px rgba(0, 0, 0, 0.05)`.
4.  **Level 3 (Overlays):** Modals and popovers use a more pronounced shadow: `0px 12px 32px rgba(0, 0, 0, 0.1)`.

Shadows are never pure black; they are subtly tinted with the primary neutral tone to maintain a "premium SaaS" softness.

## Shapes

The shape language is "Soft-Technical." We use a conservative `0.25rem` (4px) base radius for buttons and input fields to maintain an industrial, structured appearance. Larger containers like cards utilize an `8px` radius to feel more modern and approachable. Pill shapes are reserved exclusively for status tags and badges to provide high visual contrast against the more angular structural elements of the UI.

## Components

-   **Buttons:** Primary buttons feature the orange gradient with white text. Secondary buttons use a white background with a `#DEE2E6` border. Hover states should include a subtle scale effect (1.02x) and a slight increase in shadow depth.
-   **Input Fields:** Use a white background, `#DEE2E6` border, and `4px` radius. The active state should replace the gray border with a 2px solid orange stroke.
-   **Cards:** Clean white surfaces with 1px gray borders. For complex industrial data, use "Header-Line" cards where a 2px orange border-top is applied to indicate an "active" or "primary" metric.
-   **Chips/Tags:** Status tags use the pill shape. Use light-tinted backgrounds (e.g., light green background with dark green text for "Running") to ensure high legibility in light mode.
-   **Data Tables:** Use alternating row stripes (Zebra striping) with `#F8F9FA` for odd rows. Borders should be horizontal only to emphasize horizontal scanning of data points.
-   **Localization Toggle:** A prominent, accessible switch to toggle between LTR (English/French) and RTL (Arabic), which instantly re-evaluates all logical spacing tokens.