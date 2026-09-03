# Cabinet Maker Xtreme

## Inspiration

Custom cabinet making is trapped between two bad options: five-figure desktop software locked to local Windows machines, or generic 3D tools like SketchUp that know nothing about joinery or cutting tickets. When AI agents arrived, they could write code but lacked spatial awareness—unable to check if a door would swing into an oven or optimize sheet cuts on a table saw. 

We built Cabinet Maker Xtreme to bridge that gap: a browser-based studio where woodworkers and AI agents work within the exact same 3D spatial model to turn kitchen designs into machine-ready cut lists.

---

## What it does

- **Parametric 3D Studio:** Place, move, and snap standard cabinetry with live clearance badges and elevation snap locks.
- **NKBA & Physical Clash Validation:** Detects door swing collisions, drawer binds, and kitchen work triangle compliance ($12\text{ft} \le \text{Triangle} \le 26\text{ft}$) in real time.
- **2D Sheet Nesting:** Guillotine bin-packs panels onto $48'' \times 96''$ plywood sheets, deducting edge-banding thickness ($W_{\text{raw}} = W_{\text{finished}} - 2T_{\text{band}}$) and blade kerf.
- **CNC-Ready DXF & Assembly Guides:** Exports layered DXFs (`OUTLINE_CUT`, `POCKET_DADO`, `BORE_32MM`) and vector assembly manuals.
- **Agent-Native WebMCP:** Exposes 26 tools with strict JSON schemas so AI models can design, inspect, and undo actions with full parity to human mouse clicks.

---

## How we built it

- **Integer Sixteenth Geometry:** To eliminate floating-point drift across long cabinet runs, all spatial math uses integer sixteenths:
  $$\text{Sixteenths} = \text{round}(\text{Inches} \times 16)$$
  Wall coordinates project into world space via rotation angle $\theta$:
  $$x_{\text{world}} = x_{\text{start}} + x_{\text{local}} \cos\theta + z_{\text{local}} \sin\theta, \quad z_{\text{world}} = z_{\text{start}} - x_{\text{local}} \sin\theta + z_{\text{local}} \cos\theta$$
- **Parametric Builder:** Compiles carcasses, $32\text{mm}$ system boring, and door styles (Shaker, Flat Slab, Raised Panel) procedurally on the fly.
- **Stack:** Built with Next.js, React 19, Three.js, React Three Fiber, and Zustand.

---

## Challenges we ran into

- **Planning WebMCP Tool Contracts:** We initially treated WebMCP as a secondary API instead of an architectural foundation. Lacking an upfront schema abstraction layer meant hand-wiring 26 tool wrappers, while overlooking transactional parity initially left the agent without undo capabilities.
- **Raycast Self-Obstruction:** Transient placement previews hovered directly under the cursor, intercepting mouse rays and freezing movement. We fixed this by setting `raycast={() => null}` on ghost meshes and adding an active-wall placement plane.
- **3D Marquee Selection:** Projecting world coordinates through the perspective camera into screen space ($[-1, 1]$ NDC) required factoring in local depth offsets, or floating countertops were miscalculated from angled viewpoints.
- **Mobile Touch Collisions:** Moving the 3D tool dock to the bottom of mobile viewports caused it to be blocked by the validation panel's DOM overlay. We adjusted z-indexes and resting offsets to preserve $44\text{px}$ touch targets.

---

## Accomplishments that we're proud of

- **Zero-Setup Screen-to-Machine:** Designing a kitchen in-browser and downloading CNC-ready nested DXF cut sheets in seconds.
- **Full Agent-Human Parity:** AI models use the exact same state machine, revision guards, and undo history as human clicks.
- **Pure Client-Side Speed:** Real-time parametric rendering, sheet nesting, and BOM generation running at 60 FPS in WebGL without server round-trips.

---

## What we learned

- **Agent Affordances Belong Up Front:** AI agents require the same affordances as humans (especially error recovery and undo stacks); treating agent tools as an afterthought creates technical debt.
- **Decouple Visual Detail from Domain Data:** 3D aesthetic details (like multi-piece Shaker door stiles) must be rendered in the view layer without cluttering the canonical carcass model used for cut lists and CAD sheets.

---

## What's next for Cabinet Maker Xtreme

- Direct G-code post-processors for Shapeoko, ShopBot, and industrial CNC routers.
- Live supplier catalog APIs (Blum, Salice) for automated hardware procurement.
- Multi-agent collaboration for automated commercial project estimation and shop scheduling.
