# Reading runtime failure diagnostics

The settings diagnostic download contains a sanitized, bounded report. `runtime.failureCode` describes the failure category. For `UNEXPECTED_RUNTIME_ERROR`, the optional `runtime.failureStage` identifies the operation that threw before recovery began.

| Stage | Start investigation here |
| --- | --- |
| `observe-page` | `platform/youtube/collectPageObservation.ts` and `chatControls.ts` |
| `session-lifecycle` | session identity changes and `bootstrap/SessionScope.ts` |
| `resolve-decision` | `resolveChatDecision.ts` and `runtimeModel.ts` |
| `apply-resources` | `ResourceReconciler.ts`, resource leases, observers and archive opening |
| `publish-view` | runtime subscribers and the React view boundary |

Paths above are relative to `entrypoints/content/`. The stage is an investigation starting point, not an exception stack or proof of a particular root cause. It covers unexpected errors caught by runtime reconciliation; it does not claim to classify every error in the extension.

The stage is captured before resource cleanup or fallback publication changes the current operation. A manual restart clears it, an active runtime clears the failure, and the report omits the stage when the failure code is no longer an unexpected error. Automatic recovery remains bounded as documented in the [engineering overview](../engineering.md).

Only values from `RUNTIME_FAILURE_STAGES` are exported. Do not include raw exception messages or stacks, page URLs, video identifiers, chat text, usernames, or arbitrary DOM content. The new field is optional in report schema 1; existing reports without it remain readable.

Archive control observations now retain the selector identifier when the candidate is found. The report can therefore identify the selected control without a second DOM search to reconstruct its provenance. Live-UI fallback evidence also uses the shared selector catalog. When YouTube changes a control, update the adapter and its focused DOM scenarios rather than adding a test-environment branch to production code.
