---
name: extension-debug
description: Debug browser extension behavior. Use when asked to debug/reproduce extension issues in Chrome/Firefox, or mentions content script/popup/service worker/manifest/permissions.
metadata:
  short-description: Debug Chrome/Firefox extension issues
---

# Goal
- Reproduce and debug issues in the extension with clear logs and minimal guesswork.

# Inputs (ask only if missing)
- Where the issue occurs: content script / popup / background (service worker) / options page.
- Browser: Chrome, Firefox, or both.
- Repro steps (URL, actions) if not provided.

# Steps
1. Build/run in dev mode
   - Chrome: `yarn dev`
   - Firefox: `yarn dev:firefox`
2. Load/refresh the extension in the browser
   - Use the built output under `.output/` (e.g., `.output/chrome-mv3`) as the load-unpacked target
   - After rebuild: reload extension + reload the target page
3. Collect the right console logs
   - Popup: open popup, inspect its console
   - Content: open target page devtools console (content script logs)
   - Background/SW: open extension detail page and inspect the service worker console
4. Narrow down the entrypoint and file
   - Use `rg` for the feature/keyword and follow imports into `shared/`
5. Validate suspected fix
   - `yarn lint`
   - `yarn build`（and/or `yarn build:firefox`）
   - If behavior-level: `yarn e2e`

# Guardrails
- Permissions/host_permissions changes are sensitive: ask before changing.
- Avoid adding noisy logs; keep debug logs behind a guard if needed.

# Output format
- Repro steps (exact)
- Observed logs/errors (short excerpt)
- Suspected root cause (with file pointers)
- Proposed fix + verification commands
