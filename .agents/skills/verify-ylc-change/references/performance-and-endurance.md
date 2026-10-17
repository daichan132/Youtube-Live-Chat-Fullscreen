# Performance and endurance evidence

Use this for a performance claim, suspected memory growth, or a long-running stability task. Ordinary fixes do not require a benchmark or multi-hour soak. Choose duration and workload for the reported symptom or requested scope; one historical run is not a universal threshold.

## Compare the same work

Identify the before and after revisions or diffs, actual loaded bundles, browser version, profile setup, viewport, source mode, and workload. Keep chat volume, page signals, route/fullscreen transitions, and warmup comparable. Use the loaded-build checks in [browser-evidence.md](browser-evidence.md); do not let another dev server or build overwrite an output under measurement.

Repeat matched runs and retain per-run results. Count the operation being optimized separately from timing it. Instrumentation can change execution cost: collect timing without counters or monkey patches as well as operation counts when instrumentation could affect the conclusion. Separate warmup from measured samples and report variability rather than selecting the best run.

Limit the claim to the measurement. A reduction from 500 to 300 iframe queries establishes 40% fewer queries for that workload, not 40% better FPS or perceived speed. Noisy timing does not establish a latency improvement. DOM query counts do not measure compositor or GPU cost.

## Distinguish product retention from harness retention

Before attributing growing Documents, Nodes, listeners, or heap to the extension, inspect the harness. A browser wait that returns a DOM node can retain a JSHandle across navigation. Prefer a boolean predicate when only readiness matters; explicitly dispose handles that must be retained. Check unbounded result arrays, tracing buffers, open pages, and contexts as other possible owners.

Sample after comparable lifecycle points and warmup. Record elapsed time, completed cycles, transition counts, page errors, and failures alongside memory metrics. If using forced GC, use the same procedure on both sides and label results as post-GC retention; this does not establish normal peak memory or absence of GC pauses. Top-renderer metrics alone do not cover extension workers, every iframe process, or total browser memory.

If growth appears, use a shorter controlled reproduction and a harness-only or extension-disabled comparison where feasible before declaring a product leak. Keep failed runs and explain harness corrections; do not silently reinterpret the corrected run as a product fix.

## Preserve the scope and reproduction

Offline YouTube fixtures provide controlled lifecycle/load evidence. Real-YouTube checks establish current external compatibility; a short canary does not establish long-running real-stream stability. Report these independently. Likewise, installed Firefox packages do not prove Firefox fullscreen input, and unauthenticated checks do not prove authenticated chat composition. If native focus is unavailable, report that boundary rather than making synthetic focus a substitute for real input.

Retain the exact invocation, harness source, configuration, artifact identity, workload, duration, raw samples, and summary needed to repeat useful measurements. Temporary paths alone are insufficient for a reusable procedure: when reuse is in scope, promote a validated harness into a repository-owned optional command and document it. Do not describe an ad hoc script as an existing supported command. Keep diagnostic summaries free of URLs, video IDs, chat text, and user names.

A completed run should make its stopping condition and any early termination clear. Report observed ranges and failures for the measured workload, rather than asserting that all features or all memory owners are stable. Reuse successful evidence when the relevant artifact and conditions have not changed; rerun when a new change or unresolved concern invalidates it.
