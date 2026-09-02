# WebMCP Agent-Native Interface

## Summary

CabCraft 3D exposes a 22-tool Model Context Protocol (WebMCP) interface adhering to W3C agent drafts. AI agents can autonomously inspect room dimensions, discover catalog options, stage layout proposals, resolve snap points, manipulate 3D cabinets, diagnose NKBA clearance violations, calculate procurement BOMs, and generate assembly manuals without fragile pixel scraping or vision inference.

---

## The simple case

An AI agent connects to CabCraft 3D via WebMCP, calls `list_catalog_options(kind: "cabinet")` to discover available stock sizes, executes `auto_fit_run` to generate an optimized kitchen base run along the North wall, calls `validate_project` to verify clearances, and returns a structured BOM to the user. Every tool invocation is validated with strict Zod schemas and logged in the in-app WebMCP Activity Drawer.

---

## The 22-Tool WebMCP Contract

| Category | Tools | Purpose |
| :--- | :--- | :--- |
| **Room & Project** | `get_room_state`, `set_room_dimensions`, `reset_project` | Inspect and configure room boundary dimensions, ceiling heights, and layout shapes |
| **Catalog & Options** | `list_catalog_options` | Query cabinets, hardware, drawer systems, hinges, and materials |
| **Entity Operations** | `add_cabinet`, `configure_cabinet`, `remove_cabinet`, `convert_cabinet_to_built` | Stage, modify, and delete cabinets with full parametric control |
| **Obstacles** | `add_opening`, `update_opening`, `remove_opening`, `add_appliance`, `update_appliance`, `remove_appliance` | Manage doors, windows, and kitchen appliances |
| **Finishes & Runs** | `configure_built_in_element`, `remove_built_in_element`, `complete_built_in_runs` | Generate and manage countertops, toe kicks, and molding |
| **Layout & Selection** | `auto_fit_run`, `batch_selection_command` | Execute layout algorithms and batch operations (Duplicate, Align, Distribute, Isolate) |
| **Validation & Procurement**| `validate_project`, `get_bom`, `get_assembly_overview` | Run NKBA diagnostics, compute retailer BOMs, and inspect build manuals |

---

## Interruption and Verification

- **Schema validation**: Every tool input is validated strictly using `z.strictObject()`. Unrecognized or malformed arguments fail fast with descriptive validation errors.
- **Transactional execution**: Scene mutations update the shared project store with atomic revision increments, ensuring human and agent changes stay synchronized.
- **Activity logging**: Tool calls, arguments, execution duration, and outcomes are tracked in `webMCPLogs` and inspectable in the WebMCP Activity Drawer.

---

## Open questions and verification

- **Verified commit**: `204a4af` (`main` branch).
- **Automated test evidence**: `tests/integration/webmcp.test.ts`.
