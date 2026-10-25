// This timer runs in Node, independently of a stalled browser command.
export function startSlowWatchdog({ record, journal, latest, save, now = Date.now }) {
  let pendingSave = Promise.resolve()
  const timer = setTimeout(() => {
    const current = latest()
    if (current?.ready) return
    record.slow = true
    journal.mark('slow-detected')
    record.atSlow = {
      detectedMs: now() - record.exitStartedEpochMs,
      state: current?.sample ?? null,
      browserStateUnavailable: !current || now() - record.exitStartedEpochMs - current.sample.ms > 1000,
      network: journal.snapshot(),
      watchdog: true,
    }
    pendingSave = save().catch(() => {
      record.captureWriteFailed = true
    })
  }, record.slowMs)
  return {
    async stop() {
      clearTimeout(timer)
      await pendingSave
    },
  }
}
