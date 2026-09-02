# CabCraft 3D — Product Description & External Behavior Map

## Purpose

CabCraft 3D is an agent-native browser workspace for DIY homeowners and custom builders. It transforms measured walls, room bounds, and architectural openings into a physically validated 3D layout of stock, ready-to-assemble, and custom built-in cabinetry. The system produces honest retailer bills of materials (BOM), installation supply lists, printable cabinet-specific assembly manuals, and a complete WebMCP tool suite for autonomous or collaborative AI agents.

This documentation maps the product's user experience from the outside in: visible states, user gestures, transient previews, state commitments, interruption recovery, and observable verification criteria.

---

## Conventions & Document Structure

- **Sentence case** for headings and standard technical terms.
- **External state chart focus**: Documents describe what the user sees, what inputs are accepted, what changes immediately, and what is committed to the project revision history.
- **Implementation isolation**: Implementation details are included only when they alter user expectations, formatted under `Technical note:` callouts.
- **Fixed interrupt checklist**: Every feature document evaluates all 7 standard interrupt categories in identical order.
- **Fixed cross-cutting order**: Every feature document evaluates the 8 standard cross-cutting concerns in identical order.

---

## Scope & Work Order

| Document | User Surface | Focus Area | Status |
| :--- | :--- | :--- | :--- |
| [`glossary.md`](./glossary.md) | Universal | Canonical domain and UX vocabulary | **Verified** |
| [`goal.md`](./goal.md) | Contributors | Standing product principles & invariants | **Verified** |
| [`features/planner-workspace.md`](./features/planner-workspace.md) | `/planner` | 3D Canvas, Tool Dock, Selection, Snapping, Camera Navigation | **Verified** |
| [`features/catalog-and-mechanisms.md`](./features/catalog-and-mechanisms.md) | `/planner` | 4-Tab Catalog, 3D Mechanism Previews, Drawer Slides, Hinges | **Verified** |
| [`features/bom-and-pricing.md`](./features/bom-and-pricing.md) | `/bom` | Material aggregation, Retailer SKU mapping, Honest Pricing | **Verified** |
| [`features/assembly-guide.md`](./features/assembly-guide.md) | `/assemble` | Step-by-step CAD Manual, Exploded 3D Stage, PDF Export | **Verified** |
| [`features/webmcp-agent-native.md`](./features/webmcp-agent-native.md) | Tool API | 22 WebMCP tools, Agent Activity Drawer, JSON Schema | **Verified** |
| [`bug-triage.md`](./bug-triage.md) | System | Defect inventory, reproduction, and resolutions | **Verified** |

---

## Verification & Revision Baseline

All behavior documented herein is verified against commit `204a4af` (`main` branch) in the `cabinet-maker-xtreme` repository using:
1. **Unit and domain test suite** (`vitest run` — 20 test files, 106 tests passed).
2. **End-to-end browser suite** (`playwright test` — 35 tests passed across 390px, 1280px, and 1920px viewports).
3. **Automated accessibility audits** (zero axe-core critical or serious findings, AAA contrast >= 7:1).
4. **Live Chrome browser verification** via desktop computer use actions.
