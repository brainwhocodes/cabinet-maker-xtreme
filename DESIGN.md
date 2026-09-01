---
name: Cabinet Planner
description: A precise, friendly workshop interface for planning stock cabinets and following assembly instructions.
colors:
  drafting-blue: "#2D5F9A"
  drafting-blue-deep: "#244C7C"
  safety-orange: "#E56A2F"
  cool-field: "#F7F8FA"
  surface: "#FFFFFF"
  surface-muted: "#E8ECF1"
  graphite: "#1D2733"
  graphite-muted: "#5B6673"
  line: "#D6DCE4"
  line-strong: "#8794A3"
  canvas: "#17212B"
  success: "#26735B"
  danger: "#B8493F"
typography:
  display:
    fontFamily: "Geologica, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geologica, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 620
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geologica, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.drafting-blue}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.drafting-blue-deep}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
    height: "44px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

<!-- SEED -->

# Design System: Cabinet Planner

## 1. Overview

**Creative North Star: "The Calm Workshop Drawing"**

A homeowner is using a laptop on a garage workbench under cool daylight. A blue shop drawing, an orange measuring pencil, and carefully sorted cabinet hardware sit nearby. The interface should feel as dependable as those physical tools: light enough for daytime planning, dark only where the 3D viewport benefits from contrast, and explicit about dimensions and consequences.

This is a restrained product interface, not a marketing page or a professional-CAD imitation. Familiar controls, semantic HTML, and visible numeric values carry the workflow. The 3D scene supplies spatial understanding without becoming the sole source of truth.

**Key Characteristics:**
- Light, cool task surfaces around a deep graphite 3D viewport.
- Drafting blue reserved for primary actions, selection, and active guidance.
- Safety orange reserved for measurement emphasis and warning-related attention, never decorative glow.
- Flat tonal hierarchy, crisp focus treatment, fixed product-UI type sizes, and compact but comfortable spacing.
- Assembly diagrams rendered from the exact parametric cabinet data, with an original image-generated human helper used only as a secondary character layer.

## 2. Colors

The palette combines cool workshop neutrals with one primary drafting blue; safety orange, success green, and danger red are semantic exceptions.

### Primary
- **Drafting Blue** (#2D5F9A): Primary actions, current selection, active step, focused geometry, and informative links. White text on this color passes WCAG AA for normal text.
- **Deep Drafting Blue** (#244C7C): Hover and pressed states for primary controls.

### Secondary
- **Safety Orange** (#E56A2F): Measurement callouts and warning emphasis. Pair it with Graphite text, not white body text.

### Neutral
- **Cool Field** (#F7F8FA): Application background.
- **Surface** (#FFFFFF): Forms, assembly sheets, and foreground panels.
- **Muted Surface** (#E8ECF1): Tool rails, inactive controls, and grouped secondary regions.
- **Graphite** (#1D2733): Primary text.
- **Muted Graphite** (#5B6673): Secondary text; it maintains at least 4.5:1 contrast on Cool Field and Surface.
- **Quiet Line** (#D6DCE4): Nonessential separation only.
- **Strong Line** (#8794A3): Input boundaries and essential control outlines.
- **Canvas Graphite** (#17212B): Three.js viewport and blueprint preview background.

### Named Rules

**The Ten Percent Rule.** Drafting Blue occupies no more than roughly ten percent of a typical product screen. Its scarcity makes selection and actions clear.

**The Orange Means Attention Rule.** Safety Orange never decorates a resting surface. It marks measurements, a warning relationship, or a physical point the user must inspect.

## 3. Typography

**Display Font:** Geologica (with system-ui fallback)
**Body Font:** Atkinson Hyperlegible Next (with system-ui fallback)

**Character:** Geologica gives page headings a broad, constructed drafting character without using an overfamiliar AI-product font. Atkinson Hyperlegible Next keeps controls, instructions, dimensions, and long assembly copy highly legible. Use `font-variant-numeric: tabular-nums` for all dimensions, quantities, costs, and step counters.

### Hierarchy
- **Display** (650, 32px/38px): Page titles and assembly-guide title only.
- **Headline** (620, 24px/30px): Major panel and document sections.
- **Title** (600, 18px/24px): Cabinet names, validation groups, and step titles.
- **Body** (400, 16px/24px): Instructions and explanatory copy, capped at 70ch.
- **Label** (600, 14px/20px): Controls, metadata, table headings, and compact navigation.

### Named Rules

**The Fixed Instrument Rule.** Product typography uses fixed rem values rather than fluid display scaling. A dimension, label, or button must not change visual importance merely because its container narrows.

## 4. Elevation

The system is flat by default. Depth comes from tonal layers, a dark viewport, and explicit active states. Use a single compact shadow (`0 4px 8px rgba(23, 33, 43, 0.12)`) only for content that physically floats over another interaction layer, such as a context menu or popover. Do not combine this shadow with a decorative light-gray border.

### Shadow Vocabulary
- **Floating Control** (`0 4px 8px rgba(23, 33, 43, 0.12)`): Popovers, context menus, and drag previews only.

### Named Rules

**The Flat-Until-Floating Rule.** Panels resting in the app shell use tonal separation. A shadow appears only when a component overlaps actionable content.

## 5. Components

### Buttons
- **Shape:** Compact rounded rectangle (8px), never an oversized pill except for binary segmented controls.
- **Primary:** Drafting Blue with white text, 44px minimum height, 10px vertical and 16px horizontal padding.
- **Hover / Focus:** Deep Drafting Blue on hover; a 2px Drafting Blue focus outline with a 2px Surface offset; 160ms state transition.
- **Secondary / Ghost:** Surface or transparent background with Graphite text and a Strong Line boundary when a persistent boundary is necessary.

### Chips
- **Style:** Use only for true filter values, dimensions, or status. Muted Surface background, Graphite text, 6px radius.
- **State:** Selected chips use Drafting Blue text and a visible selected marker, not color alone.

### Cards / Containers
- **Corner Style:** 8px for compact regions, 12px for major panels.
- **Background:** Surface or Muted Surface.
- **Shadow Strategy:** Flat at rest; refer to the Floating Control exception.
- **Border:** Quiet Line for nonessential grouping, Strong Line when the boundary is an interaction affordance.
- **Internal Padding:** 12px for dense inspectors, 16px for standard panels, 24px for assembly prose.

### Inputs / Fields
- **Style:** Surface background, 8px radius, Strong Line boundary, labels above fields, units shown inside a separate suffix region.
- **Focus:** 2px Drafting Blue outline with 2px offset. Keep the original boundary so focus does not shift layout.
- **Error / Disabled:** Error text appears below the field with an icon and explicit correction. Disabled fields remain readable and explain why they cannot be changed.

### Navigation
- Use a stable application header and task-specific side rail. Active destinations combine Drafting Blue, text weight, and an explicit current-page marker. The assembly page collapses navigation into a semantic step list and previous/next controls on narrow screens.

### 3D Viewport HUD
- Place only high-frequency view and selection controls over the canvas. Every icon has a tooltip and accessible name. Geometry details, validation, and editing belong in adjacent semantic panels, not floating glass cards over the scene.

### Assembly Step
- Each step is an HTML `article` with one action title, a concise instruction, an exact cabinet diagram rendered from the selected cabinet definition and step transforms, exact part references, and separate Tools, Materials, Safety, and Check your work regions. A reusable image-generated helper character may reinforce the action but never supplies geometry or measurements. Progress controls remain visible without hiding the document structure.

## 6. Do's and Don'ts

### Do:
- **Do** preserve a synchronized semantic cabinet list and numeric controls beside the Three.js canvas.
- **Do** use real Solar icons from Iconify, primarily the Linear family at 20px or 24px, with a visible text label or accessible name.
- **Do** render cabinet parts, exploded views, highlights, and dimensions from the same JavaScript geometry used by the planner. Use image generation only for original helper-character art that JavaScript cannot create well; HTML supplies every label, quantity, warning, and instruction.
- **Do** make hover, focus, active, disabled, loading, empty, error, success, and context-loss states explicit.
- **Do** keep motion between 150ms and 250ms, use it only for state, and provide reduced-motion behavior.
- **Do** use Drafting Blue for action and selection, Safety Orange for attention, and Graphite for readable copy.

### Don't:
- **Don't** create a generic AI SaaS dashboard with purple gradients, glass cards, glowing borders, decorative pills, or fake system jargon.
- **Don't** imitate a dense professional CAD interface with unlabeled controls or drafting knowledge as a prerequisite.
- **Don't** copy Home Depot or IKEA colors, logos, trade dress, characters, or instruction-sheet layouts.
- **Don't** ship a toy-like 3D room planner that prioritizes appearance over dimensions, clearances, error recovery, or accessible equivalents.
- **Don't** use placeholder illustrations, image-generated cabinet geometry, invented SVG icons, rasterized UI text, or generated imagery where JavaScript or semantic HTML can produce an exact result.
- **Don't** use nested cards, giant rounded containers, side-stripe callouts, gradient text, decorative blur, custom cursors, or more than one elevation shadow.
