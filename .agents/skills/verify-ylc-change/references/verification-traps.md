# Verification traps

Consult relevant traps when results may not support the claim. This reference does not require running unrelated suites or re-reading established evidence.

| Trap | Invalid evidence | Required correction |
| --- | --- | --- |
| Stale or wrong bundle | Process arguments, an open browser, or old computed CSS | Confirm loaded extension entry, version, exact output path, current page artifact, and reload state |
| Wrong profile, page, or port | Targeting an app by name alone or accepting the inspector's first watch tab | Match dedicated profile, port, intended route, and loaded extension; pass a route-specific `--url-includes` |
| Fullscreen implies presentation | Missing DOM is treated as a load failure despite no-chat, user-off, or pending capability | Establish native source, enabled intent, and settled runtime expectations before failing; inspector exit status alone cannot decide this |
| Production/testing confusion | Fixture E2E succeeds with a testing bridge | Verify production Chrome/Firefox outputs and package contracts separately |
| All-skipped green | Command exits zero but no product scenario executed | Read executed/skipped/failed counts and run a deterministic fixture or valid source |
| External precondition overreach | Missing YLC UI becomes a YouTube-availability skip | Skip only source discovery or other YouTube-owned prerequisites; fail after the prerequisite exists |
| Retry or timeout masking | A larger timeout eventually hides an unstable boundary | Identify the missing state convergence and prove it with controlled evidence |
| Force or JavaScript click | The test bypasses pointer routing | Use a real pointer/keyboard action and assert the stable post-action state |
| Action without its postcondition | Escape closed a panel but also left fullscreen | Check the required context, target state, and focus independently; refresh UI targets after transitions |
| DOM-as-pixel proof | Element exists, `z-index` is high, or hit test succeeds | Capture actual pixels in the affected engine and repeat the triggering lifecycle |
| First-entry success | Overlay works once | Exercise off/on, fullscreen exit/re-entry, SPA navigation, focus, or replacement as relevant |
| One-browser success | Chrome passes for a Firefox/Brave/Zen-sensitive change | Run the affected engine; keep package success separate from visual success |
| Runtime and oracle relaxed together | Production gate and test expectation change in the same direction | Anchor expected behavior in the diagnosed user contract or unchanged independent fixture |
| Live canary as PR contract | Current live content happens to pass | Keep deterministic behavior in typed fixtures and use canaries only for compatibility drift |
| Unavailable command treated as pass | Tool could not start, browser crashed, or credentials failed | Report the unavailable boundary and use an authorized equivalent; never label it passed |
| Baseline warnings hidden | A broad command emits existing warnings or unrelated failures | Separate errors, warnings, selected-boundary results, and unrelated baseline explicitly |
| Dirty-tree collateral | Verification or formatting alters unrelated user/agent work | Inspect status before and after; preserve and report unrelated changes |
| Previous-run confidence | A prior revision or agent report passed | Rerun the complete required command against the current revision and read fresh output |
