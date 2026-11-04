# Browser CI sharding measurement — 2026-11-05

The same deterministic testing build from `ae1f2b6f89c1519112090385301e8c5ac3d5c01d` was measured on the same local Docker VM. The image was `mcr.microsoft.com/playwright:v1.64.1-noble` (arm64, digest `sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f`), Node 26.13.0, with 14 available CPUs and 8,318,976,000 bytes of memory. The testing manifest SHA-256 was `03e77c1a0b75d596760602962164fe16b56c1901b400ea36060df08571050179`, and the content script SHA-256 was `2f0240b2796690910cbf98ed1b93a1c15e3b72179e9880d73618185c0559d137`.

The baseline ran `CI=1 xvfb-run -a yarn playwright test --project=fixture --retries=0 --workers=1 --reporter=line`. Each parallel measurement ran the same command with `--shard=1/2` or `--shard=2/2` in separate containers and X servers, using separate temporary browser profiles and result directories. Timings cover the test commands, not image download, installation or build. The two containers shared the local VM; GitHub's matrix jobs use separate runners.

| Run | Wall time | Results |
| --- | ---: | --- |
| Serial | 447.844 s | 249 passed, 0 failed, 0 skipped, 0 retries |
| Two shards, first attempt | 212.29 s | 248 passed, 1 failed, 0 skipped, 0 retries |
| Two shards, second attempt | 203.89 s | 249 passed, 0 failed, 0 skipped, 0 retries |

The first parallel run failed `keeps hover help readable under the pointer while native clicks still pass through it`: the native button's click count remained zero. The test was not changed to make it pass. Twenty isolated repetitions subsequently passed, as did the second complete parallel run. The cause of that one failure remains unconfirmed; a later pass does not erase it. The successful comparison suggests roughly 54% less wall time on this machine, not a guaranteed GitHub speedup or proof that the flaky case is fixed.

After updating to `fbe5cd11c99b865d105c80bdbadbf7dcbfc0518a`, both shards were also run concurrently through `browser-docker.sh` with separate result directories. They passed 125 and 124 tests with no skips or retries; the combined 236.19 s includes source copying, dependency installation and the testing build. An earlier helper invocation passed the browser assertions but exited unsuccessfully because the script was edited while Bash was still reading it; that invocation is not counted as a successful command.
