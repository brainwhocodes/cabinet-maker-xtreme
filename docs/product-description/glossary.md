# Canonical Product Glossary

This glossary defines the authoritative domain and UX terminology used across the user interface, documentation, code, and WebMCP agent tools.

---

## 1. Spatial & Room Entities

### Wall
A vertical perimeter surface in the room coordinate system defined by a start point `(x, y)`, length, height, thickness, and a normal angle. Walls host cabinets, openings, appliances, and built-in finish elements.

### Room Layout Shape
The architectural topology of the room:
- `single_wall`: Single linear run.
- `l_shape`: Two perpendicular walls sharing a corner.
- `u_shape`: Three connected walls forming a U-run.
- `galley`: Two parallel opposing walls.

### Opening
An architectural penetration in a wall representing a window, doorway, or pass-through that restricts cabinet placement and requires clearance validation.

### Appliance
A major physical obstacle (e.g., Refrigerator, Range, Dishwasher) placed in the room with defined width, height, depth, and NKBA clearance requirements.

---

## 2. Cabinetry & Parametric Entities

### Stock Cabinet
A factory standard cabinet size (e.g., `B30`, `W3030`, `SB36`, `LS36`) with immutable nominal dimensions that maps to standard ready-to-assemble catalog definitions.

### Built Cabinet (Custom)
A fully parametric cabinet model with customizable carcass thickness, shelf counts, face frame width, toe kick dimensions, custom interior finishes, and finished end panels.

### Built-in Element
A continuous architectural finish piece applied across cabinet runs:
- `countertop`: Continuous surface deck with edge profiles and overhang.
- `toe_kick`: Continuous finished baseboard covering the structural recessed toe kick.
- `crown`: Decorative ceiling-line molding.
- `light_rail`: Under-cabinet valance molding concealing task lighting.
- `floating_shelf`: Heavy-duty wall-mounted open shelf with hidden bracket hardware.

---

## 3. Mechanisms & Hardware

### Hardware Pull
Visible handle hardware attached to cabinet doors and drawer fronts:
- `bar_pull`: 5-inch rectangular or round bar handle.
- `modern_knob`: Cylindrical or mushroom knob.
- `cup_pull`: Traditional bin/cup pull for drawers.
- `edge_pull`: Minimalist top-mounted finger lip pull.

### Drawer Box System
The construction style of the internal sliding box:
- `dovetail_solid`: Solid birch hardwood with dovetail joinery and undermount soft-close slide runners.
- `slim_metal`: Double-wall slim metal drawer system with integrated fluid damper.
- `push_to_open`: Handleless mechanical touch-latch opening with full extension slides.
- `standard_side`: Plywood drawer box with ball-bearing side-mount runners.

### Hinge System
Concealed cabinet door pivot mechanism:
- `european_110`: 110° clip-on concealed hinge with integrated soft-close piston.
- `wide_angle_165`: 165° zero-protrusion hinge allowing drawers to pull out past open doors.
- `pie_corner_bifold`: 60° bi-fold corner hinge for lazy Susan corner base cabinets.
- `face_frame_compact`: Compact 3/4" overlay hinge for traditional face-frame cabinets.

---

## 4. Viewport & Tool States

### Viewport Tool Dock
The floating glassmorphic pill bar at the top-center of the canvas allowing selection of the primary viewport mode:
- **Select (`V`/`S`)**: Select and drag/move entities.
- **Orbit (`O`)**: Rotate the 3D camera.
- **Pan (`P`)**: Translate the view plane.
- **Zoom (`Z`)**: Camera dolly zoom.
- **Measure (`M`)**: Point-to-point 3D measurement ruler.
- **Snap**: Magnetic collision and alignment snap toggle.

### Selection Action Bar
The floating contextual micro-toolbar that appears at the bottom-center of the canvas when one or more entities are selected, providing quick access to `Duplicate`, `Rotate 90°`, `Focus`, `Make Custom`, `Align`, `Distribute`, `Hide`, `Isolate`, and `Remove`.

### 3D Navigation Gizmo
The interactive XYZ orientation widget positioned in the bottom-left corner of the canvas for snapping the camera to orthogonal perspectives.
