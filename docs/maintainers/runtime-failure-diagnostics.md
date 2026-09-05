# Reading runtime failure diagnostics

The settings diagnostic download contains a sanitized, bounded report. `runtime.failureCode` describes the failure category. For `UNEXPECTED_RUNTIME_ERROR`, optional `runtime.failureStage` identifies the operation that failed.

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
