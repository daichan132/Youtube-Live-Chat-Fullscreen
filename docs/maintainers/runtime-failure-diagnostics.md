# Reading runtime failure diagnostics

The settings diagnostic download contains a sanitized, bounded report. `runtime.failureCode` describes the failure category. For `UNEXPECTED_RUNTIME_ERROR`, the optional `runtime.failureStage` identifies the operation that failed.

| Stage | Start investigation here |
| --- | --- |
| `observe-page` | `platform/youtube/collectPageObservation.ts` and `chatControls.ts` |
| `session-lifecycle` | session identity changes and `bootstrap/SessionScope.ts` |
| `resolve-decision` | `resolveChatDecision.ts` and `runtimeModel.ts` |
| `apply-resources` | `ResourceReconciler.ts`, resource leases, observers and archive opening |
| `publish-view` | runtime subscribers and the React view boundary |

Paths above are relative to `entrypoints/content/`. The stage is an investigation starting point, not an exception stack or proof of a particular root cause. It covers errors caught by runtime reconciliation and synchronous subscriber delivery; it does not classify every error in the extension or asynchronous React rendering failures.

Reconciliation errors capture the stage before resource cleanup or fallback publication changes it. Automatic recovery remains bounded as documented in the [engineering overview](../engineering.md). A subscriber failure is different: it is isolated so healthy subscribers still receive the view, and it does not restart healthy page resources. Stop and recovery notifications use the same isolation. Subscriptions added during delivery start with the next view change; removed subscriptions are not invoked later in the same delivery.

A manual restart clears the failure stage. An active runtime clears the prior failure during reconciliation; a new notification error can then set `publish-view`. The report omits the stage when the current failure code is no longer an unexpected error.

Only values from `RUNTIME_FAILURE_STAGES` are exported. Do not include raw exception messages or stacks, page URLs, video identifiers, chat text, usernames, or arbitrary DOM content. The field is optional in report schema 1; reports without it remain readable.

Archive observations retain the selector identifier when a candidate is found. Live-UI evidence uses the same selector catalog. Explicit `aria-controls` relationships take precedence over labels. Disabled controls cannot be rediscovered through wrappers or bypassed through a host method; text-only host UI remains supported. Player events require a fresh check of video identity and chat-open state before any toggle is invoked.

When YouTube changes a control, update the adapter and its focused DOM scenarios rather than adding a test-environment branch to production code.
