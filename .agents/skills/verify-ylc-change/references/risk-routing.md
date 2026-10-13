# YLC change-risk routing

Use behavior and diff scope together. Read only rows relevant to the current change. The rows suggest evidence, not blanket suites; use the current repository test contract for required gates and commands.

| Changed boundary | Invariants to prove | Deterministic evidence | Additional evidence when applicable |
| --- | --- | --- | --- |
| Runtime state, chat decision, availability, retry | Keep live/archive/no-chat/pending/user intent distinct; preserve stable transition semantics | Core state tests; DOM observation; relevant live/archive/no-chat/transient and managed-live-to-native-replay fixtures | Real-YouTube canary only for current compatibility drift |
| Session scope, generation, timers, observers | Old callbacks cannot mutate a new video; stop owns every resource | Core generation/ownership tests; SPA, same-URL video replacement, and player-replacement fixtures | Repeated real navigation when a production-only sequence is suspected |
| Chat iframe lease or reconciler | Borrow exact node; release before reacquire; restore/remove idempotently | Core/DOM ownership tests; borrow/restore, fullscreen-exit, replacement fixtures | Archive smoke when YouTube-owned replay behavior is involved |
| Presentation, layout, or fullscreen root | Mount and restore only the current player/session; preserve native UI | DOM ownership tests; fullscreen entry/exit, root replacement, off/on fixtures | Actual browser for focus, multi-monitor, or engine-specific fullscreen behavior |
| YouTube adapter or selector catalog | Support known variants and supported watch/live entry routes; accept a channel-live video ID only from unique player/watch/native-chat candidates; emit useful probe IDs | Core/DOM typed old/new/no-chat fixtures; selector and architecture contracts | Current real-YouTube canary for A/B or rollout drift |
| Iframe CSS, chat-only, menus, monetization, blur | Keep styles scoped; preserve input, menus, reactions, clipping, and chat readability | Style contracts; pointer-driven fixture; deterministic visual check | Affected Chrome/Firefox/Brave/Zen surface for compositor, blur, or auth UI |
| Overlay interaction | Input, controls, drag, resize, player click-through, focus, and idle behavior remain coherent | DOM interaction tests; pointer/keyboard fixture; accessibility checks | Actual browser when Shadow DOM, focus, or extension iframe routing differs |
| Geometry or adaptive placement | Use player-relative coordinates; clamp locally; commit once; preserve opposite edge and pinned intent | Core geometry tests; DOM hook tests; drag/resize/player-resize fixture; visual check | Representative viewport sizes when perceived placement matters |
| Settings repository, normalization, migration | Buffer initialization races; preserve external writes and legacy compatibility reads; normalize explicit imports; do not clear dependent values | Core repository/migration tests; DOM cross-context sync; settings round-trip fixture | Manual backup/restore only when real legacy data is explicitly in scope |
| Settings application, extension iframe, messaging | Open once; route real pointer/keyboard input; synchronize storage; preserve focus/a11y | DOM extension-API tests; settings fixture; accessibility checks | Dedicated loaded extension when browser iframe behavior is involved |
| Locales or direction | Generated outputs match source locale; Chrome/Firefox inventories and RTL stay valid | Generation/source contracts; representative provider tests; package contract | Visual sample only for material layout/direction changes |
| Manifest, WXT config, permissions, package scripts | Keep least privilege; separate testing assets; build correct Chrome/Firefox packages | Source/config contracts; fresh production build/package; ZIP and size contracts | Inspect final artifact identity if release-facing |
| E2E actions, fixtures, project classification, reporters | Deterministic project owns product behavior; canary owns external drift; failures do not become skips | Classification and reporter contracts; representative fixture with retries disabled | Compare a real canary only when changing compatibility logic |
| CI or release workflow | Jobs consume the intended fresh artifacts and repeat required gates | Workflow/source contracts; local equivalent checks where available | Inspect live CI only when the user requests PR/release verification |

## Risk multipliers

Add lifecycle or environment evidence when any multiplier applies:

- **Source or ownership change:** test loss, replacement, release, reacquire, and repeated cleanup.
- **Timing or retry change:** use controlled clocks where possible; inspect retry progress; reject new blanket skips.
- **Parent/player CSS or compositor change:** require actual pixels in each affected engine.
- **Pointer or focus change:** use real input, not DOM `.click()`.
- **Migration or persistence change:** preserve old data, cross-tab writes, and operation boundaries.
- **Package or WXT mode change:** verify both production outputs and the testing-output separation.
- **YouTube selector change:** cover multiple typed DOM variants and current canary evidence separately.
