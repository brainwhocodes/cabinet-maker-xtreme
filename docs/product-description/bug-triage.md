# Defect Triage & Audit Summary

This document records the findings from the comprehensive multi-subagent codebase audit, including observed edge cases, reproduction steps, severity classifications, and implemented resolutions.

---

## Audit Triage Log

### 1. Decimal Number Splitting in Assembly Instructions
- **Subsystem**: Assembly Guide (`src/domain/assembly/step-presentation.ts`)
- **Severity**: High
- **Description**: `splitAssemblyInstruction` regex used a naive `.` sentence delimiter that split nominal dimensions like `34.5` into two broken instruction segments (`34.` and `5"H...`).
- **Resolution**: Updated regular expression to preserve decimal numbers and abbreviations using lookbehind/lookahead `(?<=\d)\.(?=\d)` tokenization.
- **Status**: **Resolved & Verified** (tests pass).

### 2. Corner Cabinet Assembly Step Assignment
- **Subsystem**: CAD & Assembly Step Generator (`src/domain/geometry/part-builder.ts`, `step-presentation.ts`)
- **Severity**: High
- **Description**: Lazy Susan corner base cabinets (`LS36`) use corner-specific part IDs (`corner_panel_left`, `corner_panel_return`, `corner_bottom_back`) which were missing from step 1 & 2 active carcass part filters.
- **Resolution**: Updated `createAssemblySteps` and `getIntroductionStep` to dynamically gather all carcass and back panel parts across both rectangular and corner cabinet families.
- **Status**: **Resolved & Verified** (tests pass).

### 3. Shelf Pin Grouping in Assembly Parts Legend
- **Subsystem**: Assembly Legend (`src/domain/assembly/step-presentation.ts`)
- **Severity**: Medium
- **Description**: Shelf pins were excluded from callouts to prevent balloon clutter, but left step 5 without an explicit hardware legend entry.
- **Resolution**: Added a consolidated `Shelf support pins (4x per shelf)` grouped callout entry when shelf pins are present in the active step.
- **Status**: **Resolved & Verified**.

### 4. Strict Tool Mode Isolation in 3D Viewport
- **Subsystem**: Viewport Interaction (`src/rendering/planner-scene/PlannerCanvas.tsx`)
- **Severity**: High
- **Description**: Mouse drag was rotating the camera when in Select mode, and clicks on cabinets could select items when in Orbit mode.
- **Resolution**: Enforced strict tool gating: OrbitControls rotation is enabled exclusively when `navigationTool === 'orbit'`, and entity selection/dragging is enabled exclusively when `navigationTool === 'select'`.
- **Status**: **Resolved & Verified** (tested in Chrome).

### 5. Viewport Dock Layout on Compact Mobile Screens
- **Subsystem**: Responsive Layout (`src/styles/_planner.scss`)
- **Severity**: Medium
- **Description**: Top tool dock overlapped the mobile action drawer triggers (`Catalog`, `Properties`) on 390px mobile viewports.
- **Resolution**: Set `.planner-viewport-tool-dock { display: none; }` under `@media (width <= 1100px)` where native touch gestures (1-finger orbit, pinch zoom) handle navigation and drawer buttons take top priority.
- **Status**: **Resolved & Verified** (all 35 Playwright tests passed).
