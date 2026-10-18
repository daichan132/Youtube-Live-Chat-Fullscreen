# Reading runtime failure diagnostics

The content runtime provides a sanitized, bounded diagnostic report through the internal content-status extension messages used for verification and maintenance. `runtime.failureCode` describes the failure category. For `UNEXPECTED_RUNTIME_ERROR`, optional `runtime.failureStage` identifies the operation that failed.

| Stage | Start investigation here |
| --- | --- |
| `observe-page` | `platform/youtube/collectPageObservation.ts` and `chatControls.ts` |
| `session-lifecycle` | session identity changes and `bootstrap/SessionScope.ts` |
| `resolve-decision` | `resolveChatDecision.ts` and `runtimeModel.ts` |
| `apply-resources` | `ResourceReconciler.ts`, resource leases, observers and archive opening |
| `publish-view` | synchronous runtime subscribers and the React view boundary |

Paths above are relative to `entrypoints/content/`. The stage is an investigation starting point, not an exception stack or proof of a particular root cause. Reconciliation, explicit stop/restart cleanup, and synchronous subscriber failures are classified; asynchronous React rendering errors are outside this boundary.

Reconciliation captures the stage before recovery changes it. Resource cleanup attempts each owner independently before reporting a failure. A chat chrome cleanup failure does not skip returning a borrowed iframe; an iframe release failure does not skip layout, presentation or chrome cleanup. An owner that fails to release remains referenced for diagnostics and a later bounded cleanup attempt. This is best-effort cleanup, not a guarantee that a permanently throwing page operation can be made to succeed.

Stop disposes session timers/observers and content listeners even when resource cleanup fails. Restart clears the previous diagnostic before teardown, so a new teardown failure is not accidentally erased. Recovery remains finite; no background or unlimited retry is added.

Synchronous subscriber exceptions are isolated per listener. Healthy subscribers still receive the view and subscriber failures do not tear down healthy page leases. New subscriptions wait for the next publication, and listeners removed before their turn are skipped. This is not an asynchronous component error boundary.

An active runtime clears prior failures, and the report omits a stage when the failure code is no longer unexpected. Only values from `RUNTIME_FAILURE_STAGES` are exported. Do not include raw exception messages or stacks, page URLs, video identifiers, chat text, usernames, or arbitrary DOM content. The field remains optional in report schema 1.

Archive control observations retain the selector identifier when the candidate is found. Live-UI fallback evidence uses the shared selector catalog. Update the adapter and focused DOM scenarios when YouTube changes its structure, not a test-environment branch in production code.


## Page connection policy and packaged assets

Chromium can emit `Unsafe attempt to load URL … Domains, protocols and ports must match` for requests that fail a page Connection Allowlist while the page is controlled by a Service Worker. In report-only mode the request can still return successfully, so a successful response is not evidence that the console error is absent. This differs from a missing web-accessible-resource declaration or an invalidated extension context.

The production regression is `node scripts/verify/connection-policy.browser-test.mjs` after a production build. It reproduces the policy locally without account data. The pre-fix build produced the same JSON/CSS errors under report-only policy and failed startup under enforced policy. The background asset handler now fetches packaged files from the extension origin and supplies CSS text to both shadow roots. Check that no page-origin asset fetch or stylesheet resource link has been reintroduced when this error returns. See [testing contracts](../testing/contracts.md#connection-policy-regression) for the exact verification scope.

Chromium's [fetch-context checks](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/loader/base_fetch_context.cc) explain the shared error text, and the [Chrome Connection Allowlist documentation](https://developer.chrome.com/blog/connection-allowlist-announcement) describes enforced and report-only policies. Do not disable browser security flags or change the site's policies as a product fix.
