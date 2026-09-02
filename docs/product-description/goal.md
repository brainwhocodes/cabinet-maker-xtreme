# Product Goals & Standing Contributor Invariants

## Core Mission

CabCraft 3D exists to give non-professional homeowners and cabinet makers total spatial confidence before cutting material or purchasing hardware. The product eliminates the gap between design concepts, physical clearances, accurate retail costs, and shop assembly.

---

## Non-Negotiable Product Invariants

### 1. External State Grounding
- The 3D canvas is an accessible visualization, never the sole source of truth.
- Every entity, dimension, clearance error, and material calculation must be mirrored in accessible, keyboard-operable semantic HTML (Semantic Cabinet Table, Placement Bar, Inspector, Validation Drawer).

### 2. Honest Commerce
- Never invent retail SKUs, prices, or store links.
- When verified pricing data is unavailable for a custom build or unverified stock size, explicitly report `Price unavailable` or `Materials estimate in BOM`.
- Clearly distinguish verified Home Depot / Lowe's / IKEA SKUs from general search links.

### 3. Strict Tool Isolation
- Navigation and manipulation modes must never bleed into one another:
  - **Select mode (`V`/`S`)**: Left-click selects and drags cabinets/elements. Dragging canvas background does not rotate the camera.
  - **Orbit mode (`O`)**: Left-click dragging rotates the 3D perspective around the model pivot. Clicking cabinets does not displace them.
  - **Pan mode (`P`)**: Left-click dragging pans the view plane.
  - **Measure mode (`M`)**: Point-to-point clicking sets dimensional measurement anchors.

### 4. Propose, Preview, Commit
- Layout changes, whether initiated by user dragging, keyboard nudging, auto-fit, or an AI agent via WebMCP, must always generate a non-destructive transient preview (`ScenePreview`) before committing to the revision history.
- The user or agent can inspect warnings, snap guides, and ghost geometry before confirming.

### 5. Deterministic Assembly Guidance
- Generated assembly manuals must follow the exact physical sequence of cabinet joinery (carcass box -> stretchers -> back panel -> shelves & pins -> face frame & finished ends -> doors & drawer slides).
- Manuals must be printable, downloadable as vector-crisp PDFs, and readable offline in a workshop environment.
