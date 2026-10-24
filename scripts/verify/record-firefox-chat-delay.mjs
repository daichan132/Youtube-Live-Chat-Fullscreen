#!/usr/bin/env node
import { mkdir, realpath, readFile } from 'node:fs/promises'
import { resolve, relative, isAbsolute, join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:net'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { NetworkJournal } from './firefox-delay/network.mjs'
import { startFirefox } from './firefox-delay/session.mjs'
import { discover, saveJson, runCycle, PreconditionError } from './firefox-delay/cycle.mjs'

export function parseOptions(args) {
  const result = { minutes: 10, cycles: 40, slowMs: 5000 }
  const names = {
    '--firefox': 'firefox',
    '--extension': 'extension',
    '--out': 'out',
    '--minutes': 'minutes',
    '--cycles': 'cycles',
    '--slow-ms': 'slowMs',
  }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help') return { help: true }
    const key = names[args[i]],
      value = args[++i]
    if (!key || !value) throw new Error('Unknown or incomplete option')
    result[key] = ['minutes', 'cycles', 'slowMs'].includes(key) ? Number(value) : value
  }
  if (!result.firefox || !result.extension || !result.out) throw new Error('--firefox, --extension and --out are required')
  if (
    !Number.isInteger(result.minutes) ||
    result.minutes < 1 ||
    result.minutes > 60 ||
    !Number.isInteger(result.cycles) ||
    result.cycles < 1 ||
    result.cycles > 200 ||
    !Number.isInteger(result.slowMs) ||
    result.slowMs < 2500 ||
    result.slowMs > 15000
  )
    throw new Error('Invalid observation limit')
  return result
}
export function isTemporaryBinary(binary, roots) {
  return roots.some(root => {
    const r = relative(root, binary)
    return r !== '' && !r.startsWith('..') && !isAbsolute(r)
  })
}
async function freePort() {
  const server = createServer()
  await new Promise((yes, no) => {
    server.once('error', no)
    server.listen(0, '127.0.0.1', yes)
  })
  const port = server.address().port
  await new Promise(yes => server.close(yes))
  return port
}
export async function record(options) {
  const firefox = await realpath(resolve(options.firefox)),
    extension = await realpath(resolve(options.extension)),
    output = resolve(options.out)
  const roots = await Promise.all([tmpdir(), '/private/tmp'].map(p => realpath(p).catch(() => p)))
  if (!isTemporaryBinary(firefox, roots)) throw new Error('Use a separate Firefox copy under the system temporary directory')
  // Refuse a previous capture directory rather than overwrite its journal or profile.
  await mkdir(output)
  const out = await realpath(output)
  const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'))
  const contentBytes = await readFile(join(extension, 'content-scripts/content.js'))
  const summary = {
    startedAt: new Date().toISOString(),
    version: manifest.version,
    contentSha256: createHash('sha256').update(contentBytes).digest('hex'),
    settings: {
      minutes: options.minutes,
      cycles: options.cycles,
      slowMs: options.slowMs,
      audio: 'volume0/autoplay-blocked',
      cacheOverride: false,
      requestInterception: false,
    },
    trials: [],
    slowDetected: false,
    stoppingReason: null,
    cleanup: null,
  }
  const journal = new NetworkJournal(join(out, 'network.jsonl'))
  let api,
    stopped = false
  const onInterrupt = () => {
    stopped = true
  }
  process.on('SIGINT', onInterrupt)
  process.on('SIGTERM', onInterrupt)
  try {
    api = await startFirefox({ firefox, extensionPath: extension, out, port: await freePort() })
    summary.browser = { version: api.session.capabilities.browserVersion, headless: true, pid: api.browser.pid }
    const safe = await api.chrome(
      `return {volumeScale:Services.prefs.getCharPref('media.volume_scale'),defaultVolume:Services.prefs.getCharPref('media.default_volume'),autoplay:Services.prefs.getIntPref('media.autoplay.default'),startupUpdateSuppressed:Services.env.get('MOZ_DISABLE_UPDATE_PROCESSING')==='1',testingUpdateDisabled:Services.prefs.getBoolPref('app.update.disabledForTesting')}`,
    )
    if (
      safe.volumeScale !== '0.0' ||
      safe.defaultVolume !== '0.0' ||
      safe.autoplay !== 5 ||
      !safe.startupUpdateSuppressed ||
      !safe.testingUpdateDisabled
    )
      throw new Error('Silent isolated setup invariant failed')
    summary.setup = safe
    api.eventHandlers.add(message => journal.receive(message))
    await api.cmd('session.subscribe', {
      events: ['network.beforeRequestSent', 'network.responseStarted', 'network.responseCompleted', 'network.fetchError'],
    })
    let url = process.env.YLC_FIREFOX_WATCH_URL
    if (url) {
      const parsed = new URL(url)
      if (parsed.origin !== 'https://www.youtube.com' || !(parsed.pathname === '/watch' || parsed.pathname.startsWith('/live/')))
        throw new Error('Expected a YouTube video surface')
    } else {
      journal.mark('source-discovery')
      url = await discover(api)
    }
    const deadline = Date.now() + options.minutes * 60000
    for (let i = 1; i <= options.cycles && Date.now() < deadline && !stopped; i++) {
      const trial = await runCycle(api, journal, { url, out, index: i, entry: i % 2 ? 'rapid' : 'steady', slowMs: options.slowMs })
      summary.trials.push({ trial: i, entry: trial.entry, outcome: trial.outcome, slow: trial.slow, recoveryMs: trial.recoveryMs ?? null })
      await saveJson(join(out, 'summary.json'), summary)
      console.log(JSON.stringify(summary.trials.at(-1)))
      if (trial.slow) {
        summary.slowDetected = true
        summary.stoppingReason = 'natural-slow-case-captured'
        break
      }
      if (trial.outcome !== 'recovered') {
        summary.stoppingReason = trial.outcome
        break
      }
      if (journal.fatal) throw new Error('Network journal integrity failed')
      await api.delay(2000)
    }
    summary.stoppingReason ??= stopped ? 'interrupted' : 'observation-limit'
  } catch (error) {
    summary.stoppingReason = error instanceof PreconditionError ? 'source-unavailable' : 'capture-error'
    // Errors, CLI URL values and protocol objects are intentionally not printed.
  } finally {
    try {
      if (api) {
        await api.close()
        summary.cleanup = 'normal-quit'
      } else {
        summary.cleanup = 'startup-not-connected'
        summary.browserMayRemain = true
      }
    } catch {
      summary.cleanup = 'normal-quit-failed'
      summary.browserMayRemain = true
    }
    try {
      await journal.close()
    } catch {
      summary.journalIntegrityError = true
    }
    summary.counts = {
      executed: summary.trials.filter(t => t.outcome !== 'precondition-failed').length,
      preconditionFailed: summary.trials.filter(t => t.outcome === 'precondition-failed').length,
      failed: summary.trials.filter(t => ['measurement-error', 'recovery-timeout', 'late-recovery'].includes(t.outcome)).length,
    }
    summary.networkEvents = journal.sequence
    summary.networkTail = journal.snapshot()
    summary.finishedAt = new Date().toISOString()
    await saveJson(join(out, 'summary.json'), summary)
    process.off('SIGINT', onInterrupt)
    process.off('SIGTERM', onInterrupt)
  }
  if (
    summary.stoppingReason === 'capture-error' ||
    summary.journalIntegrityError ||
    summary.cleanup !== 'normal-quit' ||
    summary.trials.some(t => ['measurement-error', 'recovery-timeout', 'late-recovery'].includes(t.outcome))
  )
    process.exitCode = 1
  if (['source-unavailable', 'precondition-failed'].includes(summary.stoppingReason) && process.exitCode !== 1) process.exitCode = 2
  return summary
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseOptions(process.argv.slice(2))
    if (options.help)
      console.log(
        'node scripts/verify/record-firefox-chat-delay.mjs --firefox TEMP_COPY_BINARY --extension UNPACKED_PRODUCTION --out NEW_DIRECTORY [--minutes 10] [--cycles 40] [--slow-ms 5000]\nOptional YLC_FIREFOX_WATCH_URL selects a live source without writing its URL to reports.',
      )
    else {
      const result = await record(options)
      console.log(
        JSON.stringify({
          stoppingReason: result.stoppingReason,
          slowDetected: result.slowDetected,
          trials: result.trials.length,
          cleanup: result.cleanup,
        }),
      )
    }
  } catch {
    console.error('Firefox capture could not start; check arguments, paths and the new output directory.')
    process.exitCode = 1
  }
}
