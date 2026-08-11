---
name: Amber & Air
colors:
  surface: '#fff8f4'
  surface-dim: '#e7d7c9'
  surface-bright: '#fff8f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1e5'
  surface-container: '#fbebdd'
  surface-container-high: '#f5e6d7'
  surface-container-highest: '#f0e0d1'
  on-surface: '#221a12'
  on-surface-variant: '#534434'
  inverse-surface: '#382f25'
  inverse-on-surface: '#feeedf'
  outline: '#867461'
  outline-variant: '#d8c3ad'
  surface-tint: '#855300'
  primary: '#855300'
  on-primary: '#ffffff'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#ffb95f'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#00658b'
  on-tertiary: '#ffffff'
  tertiary-container: '#1abdff'
  on-tertiary-container: '#004966'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#c5e7ff'
  tertiary-fixed-dim: '#7fd0ff'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#004c6a'
  background: '#fff8f4'
  on-background: '#221a12'
  surface-variant: '#f0e0d1'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1120px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is built for a contemporary social blogging experience that prioritizes clarity, intellectual calm, and high-quality content. The brand personality is **Modern, Minimalist, and Elegant**, aiming to reduce the "noise" typically associated with social platforms to foster a focused, community-driven reading environment.

The visual style is a blend of **Minimalism** and **Soft Modernism**. It leverages expansive whitespace to provide breathing room for long-form thought, while using vibrant accents and soft elevation to guide user interaction. The emotional response should be one of "warm clarity"—professional enough to be taken seriously, yet inviting enough to encourage personal expression.

## Colors

The palette is anchored by a warm, energetic **Amber** that serves as the primary driver for actions and brand recognition. This is balanced against a sophisticated **Deep Slate** for text to ensure maximum legibility and a grounded feel.

- **Primary (Amber-500):** Used for primary buttons, active states, and critical highlights.
- **Surface & Background:** A subtle distinction between off-white backgrounds and pure white surfaces creates a soft layering effect without relying on heavy borders.
- **Success/Error:** Use standard semantic tones (Emerald for success, Rose for error) but desaturate them slightly to fit the elegant aesthetic.

## Typography

This design system utilizes **Inter** exclusively to achieve a systematic, highly legible, and neutral foundation. The focus is on vertical rhythm and generous line heights to accommodate long-form reading.

- **Headlines:** Feature tighter letter-spacing and heavier weights to create a strong visual anchor for articles.
- **Body Text:** Set with a comfortable 1.6 to 1.7 line-height ratio to prevent eye fatigue during extended reading sessions.
- **Scalability:** Display styles should downscale by roughly 25% on mobile devices to maintain composition balance.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a maximum container width to ensure readability on ultra-wide monitors. 

- **Grid:** A 12-column system is used for desktop, collapsing to 4 columns for mobile. 
- **Rhythm:** An 8px base unit (referenced as 2 units of 4px) governs all padding and margin decisions. 
- **Negative Space:** Use "generous" padding within cards (minimum 24px) to emphasize the minimalist aesthetic and separate content types effectively.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**. Surfaces do not use harsh black shadows; instead, they use low-opacity Deep Slate tints to simulate a natural, soft lift.

- **Level 0 (Background):** #fafafa.
- **Level 1 (Cards/Surface):** #ffffff with a subtle 1px border (#e2e8f0) and a soft shadow (0px 4px 20px rgba(30, 41, 59, 0.05)).
- **Level 2 (Hover/Active):** Increased shadow spread and slight Y-axis translation to simulate a "lift" toward the user.
- **Overlays:** Use a 40% blur (backdrop-filter) for modals to maintain context without visual clutter.

## Shapes

The design system employs a highly **Rounded** shape language to evoke a friendly and community-focused atmosphere. 

- **Base Radius:** 8px (0.5rem) for small components like tags or input fields.
- **Large Radius (xl):** 24px (1.5rem) for primary post cards and container surfaces. 
- **Pill:** Used exclusively for interactive buttons and "Join" actions to differentiate them from static content containers.

## Components

### Post Cards
Cards are the primary content vessel. They feature a pure white surface, a 1px slate-200 border, and `rounded-xl` corners. Images should be top-aligned with no internal padding, while text content should maintain 24px-32px of internal padding.

### Engagement Actions
- **Hearts/Comments:** Use icon-only or icon+label combinations in Slate-500. On interaction (Heart), transition to Amber-500 with a subtle scale-up animation.
- **Nested Replies:** Indent replies by 24px with a thin vertical thread line (Slate-200) to clarify the conversation hierarchy.

### Buttons
- **Primary:** Amber-500 background, White text, pill-shaped.
- **Secondary:** Transparent background, Slate-900 text, 1px Slate-200 border.
- **Tertiary:** Text-only with Amber-600 on hover.

### Inputs
Search and comment inputs use a light gray fill (#f1f5f9) that transitions to white with an Amber-500 focus ring.

### User Profiles
Focus on a "Bio-centric" layout. Since there is no 'following' feature, the profile header should emphasize the user's contribution (post count) and their curated content feed rather than social metrics.