# Cabinet Planner Project Plan

## Improved Brief

Build a WebMCP-enabled, local-first cabinet planning application for DIY homeowners. A user measures a room, adds walls and openings, places stock or ready-to-assemble cabinet modules in an exact Three.js scene, reviews deterministic fit and clearance checks, and exports a retailer-ready bill of materials. The same cabinet definitions and selected dimensions generate a step-by-step semantic HTML assembly and installation guide.

The agent collaborates through WebMCP rather than guessing at the interface. It can inspect the current design, analyze wall-fit options, stage a reversible layout proposal, apply an approved proposal, validate the result, calculate the BOM, and guide the user through assembly steps. Every essential action also remains available through ordinary keyboard-accessible HTML.

Image generation has a narrow role. It may create original helper-character artwork and non-runtime visual-direction references. It must never generate cabinet geometry, cabinet parts, dimensions, exploded views, icons, UI text, or any other element JavaScript and semantic HTML can produce exactly. The cabinet shown in every assembly step must be rendered from the cabinet instance created in the app.

## Confirmed Product Decisions

- **Primary user:** DIY homeowner.
- **First-release BOM:** Stock and RTA cabinet units, matching trim, hardware, and installation supplies.
- **Visual lane:** Workshop blueprint.
- **Hosting:** Static Next.js export on Vercel Hobby, with no runtime image generation, scraping, database, or server function.
- **Retail strategy:** Plain, non-affiliate retailer search links and manually verified sample mappings. No automated Home Depot scraping and no claim of live price or stock.
- **Accessibility target:** WCAG 2.2 AA with a complete semantic alternative to the Three.js canvas.
- **Working title:** “Cabinet Planner” is descriptive only. The entrant chooses the final submission name.

## Product Goals

1. Convert room measurements into a reliable, inspectable cabinet layout.
2. Keep nominal stock sizes separate from manufacturer-specific product dimensions.
3. Let humans and agents co-edit through preview, apply, undo, and explicit validation.
4. Produce an honest BOM that distinguishes verified products, search links, estimates, and unavailable data.
5. Generate cabinet-specific assembly diagrams from the same parametric model used in the planner.
6. Make the assembly page usable on a phone or tablet without requiring the 3D planner.
7. Keep the deployed app inside Vercel Hobby limits by doing all geometry, BOM, export, and guide generation in the browser.

## Non-Goals for the First Release

- Raw plywood nesting, sheet optimization, CNC output, or a build-from-scratch cut-list mode.
- Structural engineering, code certification, countertop fabrication dimensions, or professional installation guarantees.
- Live Home Depot price, store inventory, cart mutation, affiliate tracking, or account integration.
- Photorealistic rendering, path tracing, post-processing, or a full interior-design catalog.
- Automatic runtime generation of assembly art or instructions with a language or image model.
- Multi-user accounts, cloud sync, payments, analytics, or an app database.

## Primary User Flow

1. **Start a project:** Choose single-wall, L-shaped, galley, or U-shaped room geometry; enter wall lengths, ceiling height, and display units.
2. **Add constraints:** Add doors, windows, plumbing centers, appliances, soffits, and reserved spans.
3. **Choose a catalog:** Select a versioned stock/RTA product family and finish.
4. **Plan the wall:** Drag cabinets from the catalog, use exact numeric controls, or ask an agent to analyze wall-fit options.
5. **Review proposals:** Compare ranked deterministic layouts; preview one without mutating the saved design; apply it explicitly.
6. **Validate:** Review overlap, wall bounds, opening conflicts, filler, door-swing, appliance, and walkway warnings.
7. **Generate BOM:** Group cabinet units, fillers, panels, moldings, hardware, and conditional installation supplies. Open plain retailer search links or export CSV/print HTML.
8. **Assemble and install:** Open a guide generated from the selected cabinet instances and layout order. Follow semantic steps with an exact code-rendered cabinet diagram, tool/material lists, safety notes, and progress.
9. **Use WebMCP throughout:** Ask the agent to inspect, propose, explain, navigate, highlight a part, or mark a step complete.

## Application Surfaces

### `/`

A focused project launcher, not a marketing landing page. It includes recent local projects, a “Start room plan” action, a sample kitchen that judges can open instantly, browser/WebMCP support status, and a short privacy statement explaining that designs remain on the device.

### `/planner`

The main app shell:

- project and undo/redo toolbar;
- cabinet catalog rail;
- Three.js room viewport;
- synchronized semantic cabinet list;
- selected-cabinet inspector;
- validation and proposal panel;
- link to BOM and assembly surfaces;
- compact WebMCP activity drawer showing tool name, status, and user-visible result without exposing hidden chain-of-thought.

### `/bom`

A semantic BOM table with category groups, exact quantities, derivation notes, data status, retailer search links, timestamps, user-entered price overrides, CSV export, and print stylesheet.

### `/assemble`

A single static route that reads the selected local project and step from query parameters or local state. It renders the full ordered guide in HTML, supports guided one-step mode, provides previous/next controls, and generates exact cabinet diagrams in the browser. Avoid dynamic route segments because arbitrary dynamic routes are unsupported by a pure Next.js static export.

### `/about`

Implementation notes for judges, WebMCP tool inventory, privacy and commerce disclosures, data freshness rules, open-source license notice, and Solar Icons attribution.

## Technical Architecture

### Platform

- Next.js App Router with TypeScript strict mode.
- `output: "export"` so Vercel serves static HTML, JavaScript, SCSS output, fonts, and image assets only.
- React Server Components for static shells and copy.
- Isolated Client Components for local persistence, WebMCP registration, planner state, and Three.js.
- `@react-three/fiber`, `three`, and `@react-three/drei` for rendering and controls.
- Zustand for normalized project state and undoable commands.
- Zod for catalog, import, persisted-project, and WebMCP argument validation.
- Bulma modular Sass as the base CSS layer; project styling in SCSS modules and global SCSS tokens.
- Solar Icons through Iconify packages, imported as local icon data rather than fetched at runtime.
- Vitest for domain behavior, Playwright for browser scenarios and screenshots, `@axe-core/playwright` for automated accessibility checks, and `odiff-bin` for image comparison.

### Static Deployment Boundary

The deployed application must not depend on:

- Next.js route handlers;
- Server Actions;
- request-time cookies or headers;
- default `next/image` optimization;
- dynamic routes without generated parameters;
- Vercel Functions, Blob, KV, or cron;
- remote image-generation calls;
- retailer scraping or proxy APIs.

Generated helper assets are committed after local creation. Fonts are self-hosted through `next/font/google`; if build-time downloading proves unreliable, commit the official Google Fonts WOFF2 files and OFL licenses and switch to `next/font/local`.

### Source Layout

```text
app/
  page.tsx
  planner/page.tsx
  bom/page.tsx
  assemble/page.tsx
  about/page.tsx
src/
  components/
    assembly/
    bom/
    catalog/
    planner/
    shared/
    webmcp/
  domain/
    assembly/
    bom/
    catalog/
    geometry/
    layout/
    project/
    validation/
  rendering/
    cabinet-model/
    planner-scene/
    assembly-scene/
    screenshots/
  state/
  styles/
    _tokens.scss
    _bulma.scss
    _base.scss
    _utilities.scss
    _print.scss
    main.scss
  webmcp/
    register-tools.ts
    tool-contracts.ts
    tool-results.ts
    model-context-adapter.ts
public/
  assembly/helpers/
  cabinet-previews/
  fonts/
design/reference/
scripts/visual/
tests/
  domain/
  webmcp/
  browser/
  visual/
```

## Domain Model and Invariants

### Units

Store imperial dimensions as integer sixteenths of an inch. A value of `16` represents one inch, `12` represents three quarters of an inch, and `552` represents 34.5 inches. Convert only at display and Three.js boundaries. This avoids floating-point gaps during snapping, wall packing, BOM math, and equality checks. Metric display is derived in millimeters and never becomes a second source of truth.

### Cabinet Definition

Each versioned catalog definition contains:

- stable catalog and cabinet IDs;
- manufacturer or demo-family name;
- product family version and source timestamp;
- nominal code such as `B30`, `W3036`, or `SB36`;
- type: base, wall, tall, sink, drawer, corner, filler, panel, or appliance surround;
- construction system: face-frame or frameless;
- exact width, height, depth, toe-kick, face-frame, and overlay dimensions;
- a list of panel and front parts with stable part IDs;
- exposed-side and filler rules;
- permitted hinges, fronts, and finish IDs;
- assembly-template ID or manufacturer-manual URL;
- retail mappings with source status and verification date.

A “standard size” is a catalog convention, not a universal physical truth. The UI must always show the selected catalog family and actual dimensions.

### Cabinet Instance

A placed instance contains:

- stable instance ID;
- cabinet-definition ID;
- wall ID;
- integer offset and elevation;
- quarter-turn rotation;
- finish and front-option IDs;
- hinge or drawer orientation;
- installation sequence index;
- user notes.

### Room Model

A project contains orthogonal wall segments, ceiling height, openings, appliances, plumbing anchors, reserved spans, and no-go volumes. Every mutation increments `projectRevision`.

### Mutation Rules

- Validate the complete command before changing state.
- Apply commands transactionally.
- Add every human and WebMCP mutation to one undo/redo history.
- WebMCP mutations include `expectedRevision`; reject stale calls with a recovery message.
- Cabinet occupancy must stay inside its usable wall span.
- Solid occupancy volumes may not overlap.
- Openings and appliance reserve volumes may not be crossed.
- A retail mapping never changes geometry.
- Imported files are size-limited, schema-validated, and treated as plain data. No imported HTML, script, data URL, or remote image URL is rendered.

## Deterministic Layout Engine

The layout engine is not generative AI. It ranks valid combinations of catalog widths using dynamic programming and explicit scoring.

Inputs include usable wall spans, reserved spans, required cabinet types, sink or appliance centers, filler limits, construction rules, and the user’s strategy.

Strategies:

- **Balanced:** prioritize symmetry around a sink, range, or wall center.
- **Storage:** prioritize drawers and wider usable cabinets.
- **Budget:** minimize cabinet count and specialty units without violating requirements.

Each proposal contains placements, fillers, uncovered span, score components, warnings, and a deterministic proposal hash. The agent can explain or stage a proposal but cannot invent a cabinet ID outside the active catalog.

## Parametric Cabinet Rendering

### Shared Geometry Source

`buildCabinetParts(definition, instanceOptions)` is the only cabinet geometry source. It returns render-neutral part records:

- stable part ID and human label;
- box or front geometry dimensions;
- material role;
- assembled transform;
- selection group;
- hardware anchors;
- joinery anchors;
- exposed-edge metadata.

The planner scene, catalog preview renderer, assembly scene, selection list, BOM derivation, and tests consume these same records. No second assembly-only cabinet model is allowed.

### Planner Rendering

- Lazy-load the Three.js planner chunk only on `/planner`.
- Use `<Canvas frameloop="demand">` and invalidate on controls, state changes, and step animation.
- Clamp device pixel ratio between 1 and 1.5 by default; allow adaptive reduction on slow devices.
- Cache geometry and materials by dimensions and finish.
- Merge static carcass panels by material where practical while keeping doors, drawers, and selection proxies separate.
- Instance repeated hardware pulls and identical shelf pins.
- Raycast against simple selection proxies instead of every fastener and panel edge.
- Show dimension labels only for the selected cabinet or active warning.
- Avoid post-processing, real-time reflections, large shadow maps, and continuous decorative animation.
- Dispose geometry, materials, textures, controls, and observers on unmount.
- Never call React state setters inside `useFrame`.

### Context Loss and Low-Power Fallback

Listen for WebGL context loss and restoration. On loss, preserve project state, replace the canvas with a clear recovery panel, and keep the semantic cabinet editor working. If WebGL is unavailable or repeatedly fails, offer a top-down HTML/SVG-free numeric editor and cabinet list rather than blocking the project. Code-native diagrams are allowed; the prohibition applies to invented icon SVGs, not data-driven geometry output.

## Assembly Guide Generated from the Created Cabinet

### Core Rule

The cabinet visible in an assembly instruction must be the selected `CabinetInstance` rebuilt by `buildCabinetParts`. Image generation must never depict the cabinet, cabinet panels, joinery, dimensions, fasteners, or exploded state.

### Assembly Template

An assembly template contains ordered operations. Each operation declares:

- stable step ID and title;
- cabinet types and construction systems it supports;
- part IDs visible before and after the operation;
- active and highlighted part IDs;
- deterministic exploded transform per active part;
- fastener and material IDs with quantities;
- required and optional tool IDs;
- orthographic camera preset;
- action type: inspect, position, attach, fasten, square, adjust, or install;
- concise instruction and completion check;
- safety level and professional-help condition;
- optional helper-character pose ID.

The runtime combines this template with the actual cabinet instance. Width, height, depth, door count, drawer count, finish, and handedness therefore match the user’s design.

### Diagram Renderer

- Render an orthographic Three.js view from the shared part records.
- Use assembled and exploded transforms from the active step.
- Dim completed parts, highlight active parts in Drafting Blue, and use Safety Orange only for the action point or caution.
- Draw arrows and dimensions from exact anchor coordinates, not image-generation output.
- Put part names, quantities, measurements, and warnings in HTML beside the canvas.
- Expose a “Rotate diagram” control, fixed camera presets, reset view, and part highlight.
- Render a deterministic high-resolution canvas frame before printing so the browser printout contains the exact step view.
- If the exact catalog item has no verified template and no manufacturer manual, state that no assembly guide is available. Never substitute generic invented instructions.

### HTML Structure

- One `<main>` for the guide.
- A `<nav aria-label="Assembly steps">` containing an ordered list.
- One `<article>` per step with a stable fragment ID.
- A `<figure>` for the exact cabinet diagram and a descriptive `<figcaption>`.
- Separate semantic lists for Tools, Materials, Parts, Safety, and Check your work.
- Buttons with verb-object labels: “Mark step complete,” “Show previous step,” and “Show next step.”
- A live region for step changes initiated by WebMCP.
- A print mode that expands every step, removes controls, preserves headings, and repeats the project/cabinet identifier.

### First Verified Guide Templates

The first complete release supports:

1. a two-door base cabinet;
2. a two-door wall cabinet;
3. a drawer base cabinet;
4. project-level cabinet installation order.

Catalog definitions without one of these verified templates link to a manufacturer manual and contribute only project-level installation steps.

### Assembly and Installation Sequence

The available steps are generated from selected cabinet types and the room layout:

1. verify cabinet identity, dimensions, panels, fronts, and hardware;
2. prepare a protected, level work surface;
3. position the cabinet bottom and side panels;
4. attach the side panels using the template’s verified fasteners;
5. fit the back panel and square the carcass;
6. attach stretchers, rails, or face frame when the selected construction requires them;
7. install shelf supports, drawer runners, or internal hardware;
8. install and adjust doors or drawers;
9. inspect the assembled cabinet against exact dimensions;
10. mark room reference lines, wall type, studs, and the floor high point;
11. place, level, and shim the first cabinet in the computed installation sequence;
12. clamp and join adjacent cabinets using the product-family rule;
13. secure cabinets using fasteners appropriate to the confirmed wall type and manufacturer instructions;
14. install fillers, exposed panels, moldings, and toe kicks;
15. perform final alignment and clearance checks.

Unsupported or unsafe conditions stop the sequence with explicit professional-help guidance. Plumbing, gas, electrical, stone fabrication, unknown wall construction, and uncertain structural anchoring are not silently generalized.

## BOM and Retailer Contract

### BOM Groups

- cabinet units;
- fillers and scribes;
- exposed end panels and skins;
- toe kicks, crown, light rail, and other moldings;
- cabinet-family connectors and hardware;
- conditional installation supplies;
- user-selected appliances and placeholders;
- countertop planning estimate, clearly marked as non-fabrication data.

### Derivation Rules

Every row includes `derivedFrom`, such as cabinet instance IDs, exposed edge IDs, adjacency IDs, or wall spans. Linear materials include the raw required length, waste factor, stock length, and rounded purchase quantity. Conditional fasteners remain unresolved until wall type and manufacturer rule are known.

### Retail Mapping

Each mapping stores:

- retailer name;
- plain product or search URL;
- optional model and SKU entered from an authorized or manually verified source;
- optional price and currency;
- verification timestamp;
- geographic scope;
- status: verified, search-only, stale, unavailable, or user-entered;
- source note.

### Home Depot Boundary

- Do not scrape HomeDepot.com.
- Do not proxy undocumented retailer APIs.
- Do not show “live” stock or price without an authorized source.
- Use plain, untracked search links for the free hackathon deployment.
- Do not use Home Depot logos or copied product photography.
- Display “Not affiliated with or endorsed by The Home Depot.”
- Mark external retailer results as untrusted in WebMCP output.
- If an authorized affiliate feed is added later, isolate it behind a provider interface, preserve timestamps, and move commercial hosting off Vercel Hobby when required by Vercel’s terms.

## WebMCP Strategy

### Registration Rules

- Feature-detect `document.modelContext`; the app remains fully usable when it is absent.
- Register only tools relevant to the current route and state.
- Unregister with an `AbortController` during component cleanup.
- Keep tools same-origin; do not set `exposedTo`.
- Use one function per tool.
- Validate tool arguments in code even when the JSON Schema describes them.
- Return compact JSON strings with stable IDs and recovery guidance.
- Use the execution `AbortSignal` for cancellable analysis and exports.
- Every tool invokes the same domain command or query used by the visible UI.
- Every mutating tool accepts `expectedRevision` and is undoable.
- Retailer-derived output uses `untrustedContentHint: true`.
- Read-only queries use `readOnlyHint: true`; navigation, previews that alter visible state, progress updates, and design changes use `readOnlyHint: false`.

### Planner Tools

| Tool | Purpose | Annotation |
|---|---|---|
| `get_project_summary` | Return room, catalog, cabinet counts, revision, unresolved inputs, and warning totals. | read-only |
| `list_catalog_options` | Return valid cabinet IDs and exact dimensions for a requested type or wall span. | read-only |
| `set_room_dimensions` | Create or update orthogonal room walls after strict bounds validation. | mutating |
| `add_room_opening` | Add a door, window, appliance reserve, or utility anchor. | mutating |
| `place_cabinet` | Place one valid active-catalog cabinet at an exact wall offset. | mutating |
| `move_cabinet` | Move or reorient one cabinet with optimistic revision checking. | mutating |
| `remove_cabinet` | Remove one cabinet and preserve it in undo history. | mutating |
| `analyze_wall_fit` | Return ranked deterministic proposals without changing project state. | read-only |
| `preview_layout_proposal` | Stage a proposal in the viewport without committing it. | mutating visible state |
| `apply_layout_proposal` | Commit the staged proposal after revision and validity checks. | mutating |
| `set_cabinet_finish` | Apply a valid finish/front option to selected instances. | mutating |
| `validate_design` | Return grouped errors, warnings, affected IDs, and fixes. | read-only |
| `generate_bom` | Calculate a fresh BOM from the current revision. | read-only |

### BOM Tools

| Tool | Purpose | Annotation |
|---|---|---|
| `get_bom_summary` | Return grouped quantities, unresolved rows, estimate status, and revision. | read-only |
| `get_bom_group` | Return compact rows for one category. | read-only |
| `get_retailer_links` | Return plain retailer links and data status for selected BOM rows. | read-only, untrusted content |
| `set_user_price` | Store a user-entered local price and timestamp. | mutating |
| `prepare_bom_export` | Prepare CSV or print output and return the visible export action. | mutating visible state |

### Assembly Tools

| Tool | Purpose | Annotation |
|---|---|---|
| `get_assembly_overview` | Return cabinet guides, installation sequence, completion, and blocked conditions. | read-only |
| `get_current_step` | Return the current instruction, exact parts, tools, materials, safety, and completion check. | read-only |
| `list_step_requirements` | Return tools, materials, and BOM row references for a step range. | read-only |
| `go_to_assembly_step` | Activate, scroll to, focus, and announce one valid step. | mutating visible state |
| `highlight_assembly_part` | Highlight a real part ID in the exact parametric diagram and corresponding HTML list. | mutating visible state |
| `mark_assembly_step_complete` | Update local progress after revision checking. | mutating |
| `report_assembly_problem` | Return verified troubleshooting branches for the active template. | read-only |

### WebMCP Evaluation Cases

Test direct and open-ended prompts covering:

- correct tool selection;
- correct tool order;
- exact arguments and active-catalog IDs;
- wrong wall, cabinet, part, step, and proposal IDs;
- stale project revisions;
- human edits between agent analysis and apply;
- invalid dimensions and unsupported construction systems;
- cancellation during layout analysis;
- UI synchronization after mutation;
- retailer output marked untrusted;
- agent attempts to skip preview or validation;
- tool unregistration after route change;
- complete human workflow with WebMCP unavailable.

## Accessibility Plan

### Canvas Equivalence

The canvas is a bitmap and does not expose its objects to assistive technology. Maintain a synchronized semantic representation containing every wall, opening, cabinet, exact dimension, position, selection state, and validation issue. Human users can select, move, rotate, remove, and inspect cabinets from this representation without touching the canvas.

### Keyboard and Touch

- Arrow keys move the selected cabinet by one inch; modified keys use the documented fine/coarse increments.
- Numeric fields allow exact entry and expose unit suffixes without placing units inside the editable value.
- Undo and redo have buttons, shortcuts, labels, and announcements.
- Canvas actions are duplicated in adjacent controls.
- No hover-only action.
- Minimum target size is 44 by 44 CSS pixels.
- Focus is never moved merely because the pointer changes canvas selection.

### Status and Motion

- Meet WCAG 2.2 AA text and control contrast.
- Never communicate error, selection, or completion by color alone.
- Respect `prefers-reduced-motion`; explode-step transitions become instant or short crossfades.
- Use polite live regions for completed mutations and assertive announcements only for blocked safety states.
- Keep all HTML visible by default; JavaScript enhancement must not gate core assembly text behind entrance animations.

## Visual System

The normative tokens and component rules live in `DESIGN.md`.

- **Header font:** Geologica from Google Fonts.
- **Body and UI font:** Atkinson Hyperlegible Next from Google Fonts.
- **Number treatment:** tabular numerals for dimensions, quantities, prices, and step counts.
- **Palette:** cool field, white surfaces, graphite text, drafting blue action/selection, and safety orange attention.
- **Product density:** moderate; use lines and spacing before cards.
- **Motion:** 150–250ms and state-driven only.
- **No Tailwind.** Use Bulma plus SCSS.

## Bulma and SCSS Plan

### Bulma Boundary

Import Bulma modular Sass rather than the entire framework. Start with utilities, base, themes, form, button, icon wrapper, content, notification, progress, tag, tabs, and only the layout helpers actually used. Do not import Bulma Card merely to wrap every region.

### SCSS Layers

1. `_tokens.scss`: color, type, spacing, radius, z-index, motion, and breakpoint tokens.
2. `_bulma.scss`: Bulma `@use` configuration and selective `@forward` imports.
3. `_base.scss`: document defaults, focus, selection, typography, and reduced motion.
4. `_utilities.scss`: a small project-specific utility set unavailable in Bulma.
5. `_print.scss`: BOM and assembly print behavior.
6. `*.module.scss`: feature and component styles with local scoping.
7. `main.scss`: ordered composition of the global layers.

### SCSS Rules

- Use Sass modules with `@use` and `@forward`; do not use legacy `@import` for application styles.
- Keep nesting to three levels or fewer.
- Avoid `@extend` across component boundaries.
- Use CSS Grid for two-dimensional planner layout and Flexbox for one-dimensional tool rows.
- Use semantic z-index tokens only.
- Do not animate layout properties.
- Do not use custom scrollbars, decorative blur, generated SVG decorations, or CSS gradients.
- Bulma supplies base behavior; custom SCSS owns the workshop identity.

### Biome Limitation

Biome does not parse, format, or lint SCSS. Use Biome for TypeScript, TSX, JavaScript, JSON, and supported CSS. Add Stylelint with `stylelint-config-standard-scss` and `stylelint-scss` for `.scss`, plus a Sass compile/build check. This keeps the explicit Biome requirement without pretending it covers SCSS.

## Solar Iconify Plan

Use the Solar Linear family at 20px for controls and 24px for major actions. Import icon data locally from Iconify packages so the app never waits on the Iconify API. Decorative icons receive `aria-hidden="true"`; icon-only controls receive an accessible name and tooltip.

| Use | Iconify ID |
|---|---|
| Catalog | `solar:widget-3-linear` |
| Room plan | `solar:map-linear` |
| Measure | `solar:ruler-linear` |
| Auto-fit | `solar:magic-wand-3-linear` |
| Validate | `solar:shield-check-linear` |
| BOM | `solar:bill-list-linear` |
| Retail links | `solar:cart-large-linear` |
| Assembly | `solar:clipboard-check-linear` |
| Parts | `solar:box-minimalistic-linear` |
| Tools heading | `solar:toolbox-linear` |
| Warning | `solar:danger-triangle-linear` |
| Success | `solar:check-circle-linear` |
| Information | `solar:info-circle-linear` |
| Undo | `solar:undo-left-linear` |
| Redo | `solar:undo-right-linear` |
| Download | `solar:download-linear` |
| Print | `solar:printer-linear` |
| Agent guide | `solar:user-speak-linear` |
| Settings | `solar:settings-linear` |
| Show part | `solar:eye-linear` |
| Hide part | `solar:eye-closed-linear` |
| Previous | `solar:arrow-left-linear` |
| Next | `solar:arrow-right-linear` |
| More actions | `solar:menu-dots-linear` |

Place “Solar Icons by 480 Design, licensed under CC BY 4.0” in `/about` and the repository attribution section.

## Image Generation Plan

### Hard Boundary

Image generation is used only for:

1. non-runtime visual-direction references that guide SCSS/React implementation;
2. a small original helper-character sprite set that ordinary JavaScript cannot create with comparable illustrative quality.

Image generation is not used for cabinet renders, cabinet thumbnails, exploded views, part arrows, dimensions, tools/material text, icons, UI controls, or final page screenshots.

### Codex CLI Workflow

- Invoke `$imagegen` explicitly in a Codex CLI interactive session.
- Generate one reference or sprite per call. Do not batch multiple sections or poses into one image.
- Review subject, composition, hands, tool grip, extra objects, text, logos, and style consistency after every call.
- Attach the first approved visual as `--image` input when generating the next item in the same family.
- Make one targeted revision at a time.
- Save approved design references under `design/reference/`.
- Save approved helper sprites under `public/assembly/helpers/`.
- Helper sprites use a flat chroma-key background, then the imagegen skill’s removal workflow creates a transparent PNG. Validate alpha corners, subject coverage, and color fringe.
- Convert final sprites to lossless WebP when browser support and alpha validation pass; retain source PNGs outside the production asset path.
- No generated image may contain text, a brand logo, a cabinet dimension, or a product depiction.

### Sequential UI Direction References

These images are visual references only. The UI is implemented in React/SCSS and cabinet regions are masked during reference comparison because exact geometry comes from JavaScript.

#### Reference 01: Project Launcher

**Prompt:**
“Create one 1536×1024 desktop web-app design reference for a DIY cabinet planner project launcher. Use a restrained workshop-blueprint visual system: cool off-white field, crisp white work surface, graphite text, drafting-blue primary action, and one safety-orange measurement accent. Show a clear ‘Start room plan’ action, recent local projects, a sample kitchen entry, WebMCP support status, and a short local-privacy note. Use broad constructed sans-serif headings and highly legible humanist body text. Keep the layout open, asymmetric, and task-focused. No marketing hero, no gradients, no glass, no nested cards, no retailer logos, no cabinet product photography, no decorative pills, no watermark.”

#### Reference 02: Planner Shell and Toolbar

**Prompt:**
“Create one 1536×1024 design reference focused on the cabinet planner shell and top project toolbar. Show a deep graphite viewport below a compact light toolbar with project name, save state, undo, redo, 3D/elevation toggle, validation status, and a drafting-blue ‘Review BOM’ action. Use workshop-blueprint colors, Geologica-like constructed headings, Atkinson-like readable labels, 44px controls, disciplined spacing, and flat tonal layering. Leave the viewport as an empty drafting grid; exact room and cabinet content is inserted by JavaScript and masked during reference comparison. No generated room or cabinet geometry, no gradients, no glass, no giant rounded shell, no fake system jargon, no invented logos, no watermark.”

#### Reference 03: Cabinet Catalog Rail

**Prompt:**
“Create one 1536×1024 close design reference for the left cabinet catalog rail of a DIY planner. Include search, Base, Wall, Tall, Corner, Filler, and Panel categories; compact rows with exact code, width, height, depth, and construction type; a selected row; an empty search state; and a keyboard hint. Use a cool light workshop surface, graphite copy, drafting-blue selection, small safety-orange measurement markers, verified Solar-style box icons, and flat separators instead of card stacks. Do not depict cabinets or reserve fake image placeholders; exact catalog previews are inserted by the JavaScript renderer during implementation. No retailer branding, no gradients, no glass, no three-column cards, no watermark.”

#### Reference 04: 3D Viewport HUD

**Prompt:**
“Create one 1536×1024 close design reference for a Three.js cabinet-planner viewport HUD. Use a deep graphite canvas with an empty restrained drafting grid, small view controls, reset camera, top/elevation toggle, and one compact numeric-dimension control outside the masked scene region. Keep inspector content outside the canvas. Use thin verified Solar-style controls with text tooltips, visible keyboard focus, and no more than two floating control groups. Exact room, cabinet, selection, and measurement geometry is inserted by JavaScript and excluded from this generated reference. No generated geometry, no photorealism, no neon glow, no glassmorphism, no floating-card clutter, no watermark.”

#### Reference 05: Inspector and Validation

**Prompt:**
“Create one 1536×1024 close design reference for a cabinet inspector and validation panel. Show selected cabinet code, exact width/height/depth, wall position, hinge orientation, finish, exposed side, and numeric move controls. Below, show grouped errors, warnings, and passed checks with affected cabinet IDs and verb-object fixes. Use a white surface, graphite text, drafting-blue focus and selection, safety orange warnings, green success, red errors, and flat dividers. Labels sit above fields; no color-only status. No gradients, no shadowed ghost cards, no decorative badges, no retailer logos, no watermark.”

#### Reference 06: Auto-Fit Proposal Review

**Prompt:**
“Create one 1536×1024 design reference for reviewing three deterministic cabinet wall-fit proposals. Emphasize one staged preview, score breakdown for fit, symmetry, storage, and cost proxy, exact uncovered span, fillers, and warnings. Include ‘Preview proposal’, ‘Apply proposal’, and ‘Keep current layout’ actions plus a visible undo note. Use workshop-blueprint colors and open table-like comparison rather than equal marketing cards. Make revision safety and reversible change clear. No AI sparkle decoration, no gradients, no fake probability scores, no cabinet geometry source, no watermark.”

#### Reference 07: BOM Surface

**Prompt:**
“Create one 1536×1024 desktop design reference for a retailer-ready cabinet bill of materials. Show grouped rows for Cabinet units, Fillers and panels, Moldings, Hardware, and Conditional installation supplies. Each row includes item, exact quantity, derivation, data status, verified date, optional price, and a plain retailer search link. Show an unresolved wall-fastener row that asks for wall type. Include CSV and Print actions. Use a crisp semantic table, sticky group headers, drafting-blue links, graphite numbers with tabular alignment, and honest stale/unavailable states. No retailer logos, product photos, affiliate badges, fake live-stock claims, gradients, or watermark.”

#### Reference 08: Assembly Overview

**Prompt:**
“Create one 1536×1024 desktop design reference for an HTML cabinet assembly overview. Show the selected project, a list of cabinet-specific guides, project installation sequence, completion progress, blocked safety conditions, and a tool/material readiness summary. Use a pale work-sheet surface, workshop-blueprint accents, clear ordered steps, and one original friendly manual-helper character as a secondary accent. Include a clearly bounded region labeled by surrounding HTML structure as the exact JavaScript diagram area, but leave that region visually empty and do not depict cabinet parts. No fake image placeholder treatment, no copied IKEA layout, no brand colors or logos, no embedded instructional text inside images, no gradients, no watermark.”

#### Reference 09: Active Assembly Step

**Prompt:**
“Create one 1536×1024 close design reference for one active cabinet assembly step. Use semantic-document hierarchy: step title, concise action, exact parts list, separate Tools and Materials lists, Safety note, Check your work, previous/next controls, and ‘Mark step complete’. Reserve a large central frame for an exact code-rendered orthographic cabinet diagram. Place one small original helper character near the instruction without overlapping the diagram. Use drafting blue to highlight the active part and safety orange only at the action point. No generated cabinet, no copied brand manual, no text inside imagery, no gradients, no watermark.”

#### Reference 10: Mobile Assembly Step

**Prompt:**
“Create one 1024×1536 portrait design reference for the mobile cabinet assembly step. Stack step title, exact code-rendered diagram frame, concise instruction, collapsible Parts/Tools/Materials regions, safety note, completion check, and large previous/next controls. Keep the current step and cabinet identity visible without a sticky element covering content. Use cool white surfaces, graphite text, drafting-blue action, safety-orange attention, 44px minimum targets, and high contrast. Include a small original helper character only as a supporting cue. No phone mockup frame, no copied IKEA layout, no generated cabinet geometry, no gradients, no watermark.”

#### Reference 11: WebMCP Activity Drawer

**Prompt:**
“Create one 1536×1024 close design reference for a compact WebMCP activity drawer inside the cabinet planner. Show recent calls such as get_project_summary, analyze_wall_fit, preview_layout_proposal, apply_layout_proposal, and validate_design with status, duration, visible result summary, and an undo link for the applied mutation. Keep technical detail readable but do not expose hidden reasoning. Use a flat workshop-blueprint panel, Solar-style thin icons, clear read-only versus changed-state labels, and one concise unsupported-browser state. No chatbot bubbles, no purple AI gradients, no robot mascot, no fake terminal text, no watermark.”

### Original Helper Sprite Set

The helper is an original fictional character, not an imitation of a named brand’s character or trade dress. Generate each sprite independently after the first style is approved. Use the approved first sprite as the visual reference for all later poses.

#### Helper 01: Pointing Guide

**Prompt:**
“Create one original flat instruction-manual helper character on a perfectly uniform solid #00FF00 chroma-key background. Show a friendly adult DIY guide with simple rounded proportions, a short dark work cap, blue overshirt, dark trousers, and one safety-orange carpenter pencil, standing in three-quarter view and pointing calmly to an empty space at their right. Clean graphite line work, restrained flat colors, crisp edges, generous padding, no cast shadow. Do not include a cabinet, tool, text, logo, watermark, floor, gradient, or #00FF00 in the character.”

#### Helper 02: Measuring

**Prompt:**
“Using the attached approved helper as the exact character and style reference, create one new transparent-ready sprite on a perfectly uniform solid #00FF00 chroma-key background. Show the same helper holding a tape measure with both hands and looking carefully at the tape. Preserve face, cap, clothing, proportions, graphite line work, blue overshirt, and safety-orange pencil. Correct hand anatomy and a believable tool grip. No cabinet, numbers, text, logo, watermark, floor, cast shadow, gradient, extra tools, or #00FF00 in the character.”

#### Helper 03: Drill Safety

**Prompt:**
“Using the attached approved helper as the exact character and style reference, create one new transparent-ready sprite on a perfectly uniform solid #00FF00 chroma-key background. Show the same helper wearing clear safety glasses and holding a cordless drill safely at rest with the bit pointed down and away. Preserve face, cap, clothing, proportions, graphite line work, blue overshirt, and safety-orange pencil. Correct hand anatomy and trigger discipline. No cabinet, drilling action, text, logo, watermark, floor, cast shadow, gradient, extra tools, or #00FF00 in the character.”

#### Helper 04: Check Square

**Prompt:**
“Using the attached approved helper as the exact character and style reference, create one new transparent-ready sprite on a perfectly uniform solid #00FF00 chroma-key background. Show the same helper kneeling and checking an invisible right angle with a carpenter square, eyes focused on the square. Preserve face, cap, clothing, proportions, graphite line work, blue overshirt, and safety-orange pencil. Correct hand anatomy. No cabinet, dimension text, logo, watermark, floor, cast shadow, gradient, extra tools, or #00FF00 in the character.”

#### Helper 05: Two-Person Lift

**Prompt:**
“Using the attached approved helper as the exact character and style reference, create one new transparent-ready safety sprite on a perfectly uniform solid #00FF00 chroma-key background. Show two distinct adult helpers demonstrating a coordinated two-person lift posture around an empty space, knees bent, backs neutral, hands positioned as if supporting opposite sides of an unseen wall cabinet. Preserve the original helper’s line style and palette; give the second helper different facial features and a graphite overshirt. Correct anatomy. No cabinet, text, logo, watermark, floor, cast shadow, gradient, loose tools, or #00FF00 in either character.”

#### Helper 06: Completion Check

**Prompt:**
“Using the attached approved helper as the exact character and style reference, create one new transparent-ready sprite on a perfectly uniform solid #00FF00 chroma-key background. Show the same helper standing upright, holding a small checklist clipboard, and giving a restrained thumbs-up. Preserve face, cap, clothing, proportions, graphite line work, blue overshirt, and safety-orange pencil. The clipboard must contain no marks or text. Correct hand anatomy. No cabinet, words, logo, watermark, floor, cast shadow, gradient, extra tools, or #00FF00 in the character.”

## ODiff Visual Matching Workflow

### Reference Match

1. Generate one UI direction reference.
2. Implement only that surface or component family in React and SCSS.
3. Capture the implementation at the planned viewport after fonts load and all motion is disabled.
4. Normalize the screenshot and reference to the same dimensions.
5. Run a local Node wrapper around `odiff-bin` with antialias handling and a visible diff overlay.
6. Mask the exact Three.js cabinet/canvas region when comparing against image-generated UI references; JavaScript geometry, not the mockup, is authoritative there.
7. Use the heatmap to correct layout anchors, spacing, typography scale, color, radius, panel proportions, and icon placement.
8. Repeat until manual inspection and the heatmap show no material structural drift.
9. Promote the approved browser screenshot, not the image-generated reference, to the regression baseline.

### Regression Match

`scripts/visual/compare.mjs` wraps `ODiffServer.compare` and reports both `diffCount` and `diffPercentage`. Keep ODiff’s color threshold separate from the project’s allowed changed-pixel percentage.

- UI-only baselines: strict layout match with antialias handling and a very small allowed changed-pixel percentage.
- WebGL baselines: mask the canvas for cross-machine CI; compare canvas manually on the same machine and test geometry deterministically in Vitest.
- Freeze time, sample data, project revision, random IDs, viewport, DPR, reduced motion, and font readiness.
- Fail on layout-size mismatch.
- Save overlays under ignored test artifacts; commit only approved baselines.

## Feature-by-Feature Quality Gate

A feature is not complete until all applicable steps pass:

1. `biome check` for TypeScript, TSX, JavaScript, JSON, and supported CSS.
2. Stylelint for every changed SCSS file.
3. TypeScript `noEmit` check.
4. Sass/Next production build check.
5. Targeted Vitest tests for the changed observable contract.
6. React Doctor static audit with telemetry disabled; no new unresolved high-severity finding.
7. For rendered React features, a React Doctor browser performance scan of the changed scenario, saved locally as JSON and summarized in the feature notes.
8. Browser smoke of the actual changed workflow.
9. Targeted axe scan for changed semantic surfaces.
10. ODiff reference loop for new visual surfaces, then ODiff regression check against the approved browser baseline.
11. WebMCP tool-contract and UI-synchronization tests when the feature exposes or changes a tool.
12. Manual keyboard pass when focus order or shortcuts changed.

React Doctor findings are investigated rather than blindly suppressed. A confirmed false positive receives the narrowest possible rule exception with a written reason. Runtime traces may contain URLs and source paths, so keep raw traces out of the public repository.

## Performance Budgets

- `/` and `/assemble` must not load Three.js planner code until a diagram actually needs it.
- Idle planner performs no continuous frame loop.
- Typical 30-cabinet scene target: fewer than 120 draw calls and fewer than 150,000 visible triangles.
- Default DPR maximum: 1.5; adaptive low mode may use 1.0.
- No layout-thrashing animation and no React state update inside the render loop.
- Only selected-object labels become DOM overlays.
- Production static asset directory target: below 20 MB; helper sprites target below 200 KB each after conversion.
- Planner route owns the heavy JavaScript chunk; launcher, BOM, about, and text-first assembly content remain usable before it loads.
- Generated design references are excluded from production output.

## Feature Sequence and Acceptance Criteria

### Feature 1: Foundation and Static Shell

Deliver the Next.js static-export project, strict TypeScript, pnpm lockfile, Bulma modular SCSS, design tokens, Google fonts, Solar Iconify imports, Biome, Stylelint, Vitest, Playwright, React Doctor scripts, ODiff wrapper, license, and static Vercel configuration.

**Accept when:** `/`, `/planner`, `/bom`, `/assemble`, and `/about` export as static routes; no Tailwind exists; SCSS compiles; fonts are self-hosted; one verified Solar icon renders without network access; quality gates pass.

### Feature 2: Catalog and Parametric Cabinet Model

Implement versioned demo stock/RTA catalog definitions, unit math, shared cabinet part builder, cabinet previews, and schema validation.

**Accept when:** base, wall, and drawer cabinet dimensions produce exact stable part records; nominal and actual dimensions remain distinct; snapshots and invariant tests cover widths, handedness, fronts, and invalid inputs.

### Feature 3: Room and Planner Scene

Implement room templates, openings, appliances, lazy Three.js scene, camera controls, semantic cabinet list, numeric editor, selection synchronization, and context-loss handling.

**Accept when:** a keyboard-only user can create a room, place, select, move, rotate, and remove a cabinet; canvas and semantic state agree; idle rendering stops; React Doctor runtime scan and browser smoke pass.

### Feature 4: Validation and Undoable Commands

Implement transactional commands, revisioning, undo/redo, wall bounds, overlap, opening, exposed-side, filler, and door-swing checks.

**Accept when:** invalid commands never partially mutate state; warnings link to exact cabinet IDs; human and future WebMCP changes share one history; stale revision tests pass.

### Feature 5: Deterministic Auto-Fit

Implement balanced, storage, and budget wall-fit ranking, proposal hashes, preview, apply, and rejection.

**Accept when:** known wall spans produce stable ranked output; no proposal uses an unavailable catalog item; preview does not alter the saved revision; apply is one undoable command; agent-independent tests cover awkward leftover widths and reserved spans.

### Feature 6: BOM and Retail Links

Implement grouped derivation, trim length rounding, unresolved conditional supplies, user prices, CSV, print HTML, timestamps, plain retailer search links, and disclosures.

**Accept when:** every BOM row traces back to project IDs; price and availability states cannot masquerade as live; no scraper or affiliate tracking exists; static deployment makes no retailer network request until a user opens a link.

### Feature 7: Exact Assembly Renderer

Implement assembly templates, step generation, shared-part rendering, orthographic exploded transforms, HTML structure, exact part lists, print frame, progress, and context-specific blocked states.

**Accept when:** changing a cabinet from B24 to B36 changes the assembly cabinet and dimensions through the same part builder; door/drawer count matches the selected instance; no image-generated cabinet is present; print output contains the exact rendered step and all semantic instructions.

### Feature 8: Helper Character Assets

Generate and validate the six original helper sprites one at a time through Codex CLI `$imagegen`, remove chroma key, compress assets, add alt/decoration rules, and integrate only where they clarify a human action.

**Accept when:** character identity remains consistent; no logo, text, cabinet, dimension, or extra tool exists; the guide remains complete with images disabled; production assets meet size targets.

### Feature 9: WebMCP Planner and BOM Tools

Implement feature detection, adapter, route lifecycle, tool schemas, annotations, revision checks, cancellation, compact results, and tool activity UI.

**Accept when:** tools appear only in valid state, unregister on route change, never bypass domain validation, update visible state, share undo history, and pass deterministic tool-contract tests plus representative Chrome/ChatGPT WebMCP evals.

### Feature 10: WebMCP Assembly Guidance

Implement assembly overview, current-step, requirements, navigation, highlight, completion, and troubleshooting tools.

**Accept when:** an agent can navigate to a step, highlight a real part ID, list exact current requirements, and mark completion while focus, live announcements, HTML, and exact diagram stay synchronized.

### Feature 11: Responsive, Accessibility, and Visual Refinement

Complete mobile assembly layout, planner structural collapse, empty/loading/error/context-loss states, reduced motion, contrast checks, keyboard review, UI reference passes, and approved ODiff baselines.

**Accept when:** critical flows pass keyboard, 200% zoom, mobile viewport, axe, reduced-motion, browser smoke, React Doctor, and visual regression checks; no placeholder image or invented icon remains.

### Feature 12: Deployment and Submission Freeze

Deploy the static output to Vercel Hobby, run the live project in the supported WebMCP browser, prepare public repository documentation, license, testing instructions, Devpost description, and a sub-three-minute video.

**Accept when:** the live URL works without credentials; sample project demonstrates planner, proposal, BOM, and assembly WebMCP calls; the public repository contains all source and licenses; the submitted tag and deployment remain unchanged during judging.

## Risk Register and Fixes

| Risk | Failure mode | Prevention or fix |
|---|---|---|
| “Standard” cabinets vary | A nominal B30 is treated as universal. | Version catalogs, store exact product dimensions, show catalog family, and require manufacturer verification before order. |
| Floating-point geometry | Tiny gaps, overlaps, and unstable BOM rounding. | Store integer sixteenths of an inch and convert only at rendering/display boundaries. |
| Auto-fit appears intelligent but is wrong | Agent invents sizes or ignores reserves. | Use deterministic catalog-constrained dynamic programming; agent only selects goals and reviews results. |
| Agent overwrites human work | Human moves a cabinet after agent analysis. | Require `expectedRevision`, stage proposals, apply explicitly, and keep one undo stack. |
| WebMCP API changes | Experimental browser API or TypeScript definitions drift. | Feature-detect, isolate a minimal adapter, avoid global type augmentation, test target browsers, and keep ordinary UI complete. |
| Prompt injection through retailer data | External product text influences tool behavior. | Do not scrape; return minimal fields; mark retailer output untrusted; never execute retailer content. |
| Home Depot API assumption | Live price/cart feature breaks or violates terms. | Use plain search links and manually verified mappings; no scraper, proxy, or live claim. |
| Vercel Hobby commercial restriction | Affiliate links turn the demo into commercial use. | Use untracked links and no ads/payments; upgrade or change hosting before commercial/affiliate use. |
| Stale price or availability | User believes an estimate is current. | Show status and verification date on every row; allow blank price; require retailer confirmation. |
| Unsafe installation guidance | Wrong wall fastener or trade work causes harm. | Require wall type, follow manufacturer manuals, stop on unknown anchoring, and route plumbing/gas/electrical/stone work to qualified help. |
| Generic assembly steps | Guide does not match selected product. | Map verified templates by construction system; otherwise show the manufacturer manual and omit fabricated unit assembly. |
| Image-generated cabinet hallucination | Step art shows wrong panels or dimensions. | Render all cabinet geometry and exploded states from the shared JavaScript part model. |
| Helper art inconsistency | Character or tools drift between sprites. | Approve one source sprite, attach it as reference for every later pose, generate one item per call, and validate each result. |
| Image text corruption | Labels become unreadable or wrong. | Put no text in generated assets; render all copy in HTML. |
| Icon inconsistency or licensing omission | Made-up SVGs or missing attribution. | Use verified Solar Iconify IDs, local icon data, one visual family, and CC BY 4.0 attribution. |
| Bulma CSS bloat | Full framework increases unused CSS and visual genericness. | Import modular Sass only; custom SCSS owns components and tokens. |
| Biome misses SCSS | Style problems pass despite a green Biome run. | Add Stylelint SCSS and Sass compile checks; state the tool boundary explicitly. |
| Three.js bundle blocks first load | Every route downloads planner code. | Route-level lazy loading and isolated client components; do not load planner scene on BOM/about/launcher. |
| Continuous render drains battery | Static room still renders at 60 FPS. | Demand frameloop, explicit invalidation, no decorative loops. |
| Excess draw calls | One mesh per panel and fastener slows mobile GPU. | Cache/merge panels, instance repeated hardware, simplified selection proxies, and measured draw-call budget. |
| React rerender storm | Scene updates trigger full app renders. | Selector-based Zustand subscriptions, memoized scene groups, refs for frame-time mutation, and React Doctor runtime scans. |
| WebGL context loss | Canvas becomes blank and state appears lost. | Preserve state outside WebGL, handle loss/restoration, show recovery UI, and retain semantic editor. |
| Canvas excludes assistive tech | Screen reader cannot inspect the room. | Synchronized semantic cabinet list, numeric controls, validation summary, and complete non-canvas workflow. |
| WebGL screenshot nondeterminism | ODiff fails across GPUs. | Mask canvas in cross-machine regression, use same-machine design comparisons, and test geometry numerically. |
| Generated mockup mismatch | Pixel-perfect comparison rewards impossible image-model details. | Use ODiff heatmaps as design feedback, then promote the approved browser screenshot as the true regression baseline. |
| Local storage failure or schema drift | Project disappears or cannot load. | Version payloads, validate/migrate, catch quota/security errors, provide JSON export/import, and ship a static sample project. |
| Static export routing | Arbitrary `/assemble/[id]` route fails. | Use fixed `/assemble` route with local state or query/hash selection. |
| Print misses WebGL | Assembly diagram is blank in PDF. | Render a deterministic high-resolution frame before print and place it in the print figure. |
| Font build failure | Google Fonts cannot download during build. | Cache through `next/font/google`; fallback to committed official WOFF2 and OFL files via `next/font/local`. |
| React Doctor false positives | Team suppresses useful checks or blocks on noise. | Investigate each finding, document narrow exceptions, and compare feature deltas rather than chasing a score. |
| React Doctor trace privacy | Public repo contains paths and URLs. | Disable telemetry, ignore raw traces, and commit only non-sensitive summaries. |
| Oversized generated assets | Static upload and page weight grow. | Exclude design references, compress six helper sprites, lazy-load them, and enforce the asset budget. |
| Hackathon demo is too broad | Judges cannot see the core WebMCP value in three minutes. | Use one seeded sample room and one scripted planner-to-BOM-to-assembly story. |

## Demo Script

1. Open the seeded sample project and show the ordinary planner controls.
2. Ask the agent to summarize the room and unresolved constraints.
3. Ask for a balanced layout around the sink; show `analyze_wall_fit` returning ranked proposals.
4. Preview one proposal, inspect exact placements, then apply it.
5. Move one cabinet manually and ask the agent to validate; show a specific filler or clearance warning.
6. Generate the BOM and open one plain retailer search link with its stale/search-only status visible.
7. Open assembly, ask what is needed for the active step, and ask the agent to highlight a real part.
8. Change the active cabinet width in the planner or switch to another cabinet and show that the assembly diagram is rebuilt from the exact selected instance.
9. Mark the step complete through WebMCP and show synchronized progress and focus.

## Deployment and Submission Checklist

- Public live URL tested in ChatGPT’s in-app browser or the required Chrome version with WebMCP enabled.
- Public GitHub, GitLab, or Bitbucket repository.
- Open-source license file visible at repository root and repository metadata.
- README with install, development, build, static export, Vercel deployment, browser setup, sample-project path, WebMCP tool list, data limitations, and attribution.
- Solar Icons attribution and Google font license files where locally vendored.
- Text description covering WebMCP fit, user experience, human-agent collaboration, implementation, impact, and limitations.
- Public YouTube video shorter than three minutes with audio.
- No copyrighted music, copied retailer branding, or copied instruction-manual art.
- Submission tag and deployed build frozen for the judging period.

## Source-Grounded Decisions

- WebMCP challenge requirements and judging: https://webmcp.devpost.com/
- Official rules: https://webmcp.devpost.com/rules
- WebMCP imperative API and lifecycle: https://developer.chrome.com/docs/ai/webmcp/imperative-api
- WebMCP security: https://developer.chrome.com/docs/ai/webmcp/secure-tools
- WebMCP best practices: https://developer.chrome.com/docs/ai/webmcp/best-practices
- WebMCP evals: https://developer.chrome.com/docs/ai/webmcp/evals
- WebMCP specification: https://webmachinelearning.github.io/webmcp/
- Bulma modular Sass: https://bulma.io/documentation/customize/with-modular-sass/
- Biome language support, including absent SCSS support: https://biomejs.dev/internals/language-support/
- React Doctor usage and browser scans: https://github.com/millionco/react-doctor
- React Three Fiber performance guidance: https://r3f.docs.pmnd.rs/advanced/scaling-performance and https://r3f.docs.pmnd.rs/advanced/pitfalls
- Canvas accessibility limitation: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#accessibility
- Next.js static export constraints: https://nextjs.org/docs/app/guides/static-exports
- ODiff API: https://github.com/dmtrKovalenko/odiff
- Codex CLI image generation: https://developers.openai.com/codex/image-generation
- Solar Iconify package and license: https://www.npmjs.com/package/@iconify-json/solar
- Google Fonts: https://fonts.google.com/specimen/Geologica and https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next
- Home Depot affiliate data boundary: https://www.homedepot.com/c/SF_MS_The_Home_Depot_Affiliate_Program and https://www.homedepot.com/c/SF_MS_Affiliate_Program_FAQs
- Home Depot terms: https://www.homedepot.com/c/Terms_of_Use
- Vercel Hobby limits and commercial-use boundary: https://vercel.com/docs/limits and https://vercel.com/docs/limits/fair-use-guidelines

# Final Codex CLI Handoff Prompt

You are a senior product engineer, interaction designer, accessibility specialist, and WebGL performance engineer. Build the Cabinet Planner described by `PRODUCT.md`, `DESIGN.md`, and `PROJECT_PLAN.md` as a production-ready WebMCP hackathon submission.

Use Next.js App Router with strict TypeScript and static export, Bulma modular Sass plus SCSS modules, Geologica and Atkinson Hyperlegible Next from Google Fonts, locally bundled Solar Icons through Iconify, React Three Fiber for the planner and assembly diagrams, Zustand for normalized undoable local state, and Zod at every external data boundary. Do not add Tailwind.

The exact same parametric `buildCabinetParts` output must drive planner geometry, catalog previews, BOM derivation, selection, and every assembly diagram. Never use image generation for cabinet geometry, parts, dimensions, arrows, icons, text, or tools/material data. Use Codex CLI `$imagegen` one item at a time only for the approved UI direction references and six original helper-character sprites. The helper is secondary artwork; the cabinet in assembly instructions is always rendered from the cabinet instance created in the app.

Implement one feature at a time in the order in `PROJECT_PLAN.md`. After every feature, run Biome, Stylelint for SCSS, TypeScript, the production build, targeted behavior tests, React Doctor with telemetry disabled, a runtime React Doctor scan when React UI changed, browser smoke, targeted axe checks, and ODiff for new or changed visual surfaces. Fix source causes. Do not blanket-disable findings. Do not run the whole project suite between partial sibling changes; complete each feature gate before starting the next feature.

Keep the app entirely usable without WebMCP and without the Three.js canvas. Feature-detect WebMCP, register only route-relevant tools, unregister them with `AbortController`, validate all arguments in code, use honest annotations, share domain commands with the visible UI, require project revisions for mutations, and make every mutation undoable. Do not expose tools cross-origin.

Do not scrape Home Depot, use undocumented retailer APIs, use affiliate tracking, claim live price or stock, copy retailer imagery, or imitate named-brand instruction art. Use plain retailer search links with visible status and timestamps. Keep all runtime compute and persistence in the browser so the static deployment remains suitable for Vercel Hobby’s non-commercial hackathon use.

Completion requires the full planner-to-proposal-to-validation-to-BOM-to-assembly flow, exact cabinet-derived assembly diagrams, WebMCP planner/BOM/assembly tools, semantic alternatives, mobile assembly behavior, empty/loading/error/context-loss states, public licenses and attribution, a working static Vercel deployment, and the submission materials listed in `PROJECT_PLAN.md`. No stubs, placeholder images, invented SVG icons, fake prices, hidden follow-up work, or incomplete feature paths.
