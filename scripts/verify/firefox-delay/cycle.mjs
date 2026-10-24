import { writeFile, rename } from 'node:fs/promises'
import { startSlowWatchdog } from './watchdog.mjs'

export async function saveJson(path, value) {
  await writeFile(path + '.tmp', JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
  await rename(path + '.tmp', path)
}
export async function mainWorld(api, expression) {
  const contexts = (await api.cmd('browsingContext.getTree', { maxDepth: 0 })).contexts
  if (contexts.length !== 1) throw new Error('Expected one owned verification tab')
  const raw = await api.evaluate(contexts[0].context, `JSON.stringify(${expression})`)
  return JSON.parse(raw.value)
}
export class PreconditionError extends Error {}
export async function wait(api, expression, ms = 15000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const value = await api.execute(expression)
    if (value) return value
    await api.delay(100)
  }
  throw new PreconditionError('Verification prerequisite timed out')
}
export async function clickVisible(api, selector) {
  const expression = `const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'});if(!e)return null;e.scrollIntoView({block:'nearest'});return e.getBoundingClientRect().toJSON()`
  const r = await wait(api, expression)
  await api.marionette('WebDriver:PerformActions', {
    actions: [
      {
        type: 'pointer',
        id: 'mouse',
        parameters: { pointerType: 'mouse' },
        actions: [{ type: 'pointerMove', x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), duration: 0 }],
      },
    ],
  })
  await api.delay(100)
  const next = await wait(api, expression, 3000),
    x = Math.round(next.x + next.width / 2),
    y = Math.round(next.y + next.height / 2)
  if (!(await api.execute(`return !!document.elementFromPoint(${x},${y})?.closest(${JSON.stringify(selector)})`)))
    throw new Error('Native control is obstructed')
  await api.click(x, y)
}
export function requireNativeObservation(state) {
  if (!state?.nativeConnected || !state.renderer || !(state.nativeRules > 0)) throw new Error('Native observation self-check failed')
}
const nativeReady = `const d=document.querySelector('ytd-live-chat-frame iframe')?.contentDocument;return !!d?.querySelector('yt-live-chat-renderer')&&(d.querySelector('#base-css')?.sheet?.cssRules.length??0)>0`
export async function prerequisites(api, url) {
  await api.marionette('WebDriver:Navigate', { url })
  await wait(api, nativeReady, 20000)
  const metadata = await mainWorld(
    api,
    `(()=>{const p=document.querySelector('#movie_player'),r=p?.getPlayerResponse?.();return {live:r?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow===true,playable:r?.playabilityStatus?.status==='OK'}})()`,
  )
  if (!metadata.live || !metadata.playable) throw new PreconditionError('Live source is no longer usable')
}
export async function discover(api) {
  await api.marionette('WebDriver:Navigate', { url: 'https://www.youtube.com/results?search_query=live+stream+chat&sp=EgJAAQ%3D%3D' })
  await wait(api, `return document.querySelectorAll('a[href^="/watch?v="]').length>0`)
  const candidates = await api.execute(
    `return [...new Set([...document.querySelectorAll('a[href^="/watch?v="]')].map(a=>new URL(a.getAttribute('href'),location.origin).toString()))].slice(0,6)`,
  )
  for (const url of candidates) {
    try {
      await prerequisites(api, url)
      return url
    } catch (error) {
      if (!(error instanceof PreconditionError)) throw error
    }
  }
  throw new PreconditionError('No usable public live source found')
}
const state = `(()=>{const o=window.__ylcDelayRecorder;if(!o?.iframe)throw new Error('Observation reference unavailable');const f=o.iframe,d=f?.contentDocument;if(o&&d!==o.document){o.document=d;o.generation++}return {fullscreen:!!document.fullscreenElement,generation:o?.generation??0,nativeConnected:!!f?.isConnected,parentRestored:f?.parentNode===o?.parent,nativeHostHasOriginal:document.querySelector('ytd-live-chat-frame iframe')===f,blank:d?.location.href==='about:blank',renderer:!!d?.querySelector('yt-live-chat-renderer'),defined:!!d?.defaultView.customElements.get('yt-live-chat-renderer'),readyState:d?.readyState??null,nativeRules:d?.querySelector('#base-css')?.sheet?.cssRules.length??0,extensionStyles:d?.querySelectorAll('style[data-ylc-style-injected]').length??0,extensionClass:d?.body?.classList.contains('custom-yt-app-live-chat-extension')??false}})()`
export async function resources(api) {
  return mainWorld(
    api,
    `(()=>{const d=window.__ylcDelayRecorder?.iframe?.contentDocument,w=d?.defaultView;if(!w)return null;return {readyState:d.readyState,initialDataPresent:w.ytInitialData!=null,rendererDefined:!!w.customElements.get('yt-live-chat-renderer'),resources:w.performance.getEntriesByType('resource').filter(e=>['script','link','fetch','xmlhttprequest'].includes(e.initiatorType)).sort((a,b)=>b.duration-a.duration).slice(0,40).map(e=>({kind:e.initiatorType,animationLibrary:new URL(e.name).pathname.includes('/external_hosted/lottie/'),start:e.startTime,duration:e.duration,requestStart:e.requestStart,responseStart:e.responseStart,responseEnd:e.responseEnd,transferBytes:e.transferSize})),navigation:w.performance.getEntriesByType('navigation').map(e=>({responseEnd:e.responseEnd,interactive:e.domInteractive,domContentLoaded:e.domContentLoadedEventStart,load:e.loadEventStart}))}})()`,
  )
}
export async function runCycle(api, journal, { url, out, index, entry, slowMs = 5000 }) {
  const record = {
    trial: index,
    entry,
    slowMs,
    observationLimitMs: 30000,
    failureThresholdMs: 15000,
    samples: [],
    slow: false,
    outcome: 'precondition',
    networkStartSequence: journal.sequence,
  }
  const path = `${out}/trial-${String(index).padStart(3, '0')}.json`
  let writes = Promise.resolve(),
    watchdog = null,
    latest = null
  const persist = () => {
    const snapshot = structuredClone(record)
    writes = writes.then(() => saveJson(path, snapshot))
    return writes
  }
  journal.mark('navigate', index)
  try {
    record.stage = 'source'
    await prerequisites(api, url)
    record.stage = 'fullscreen-entry'
    await mainWorld(
      api,
      `(()=>{const f=document.querySelector('ytd-live-chat-frame iframe');window.__ylcDelayRecorder={iframe:f,parent:f.parentNode,document:f.contentDocument,generation:0};for(const e of document.querySelectorAll('video,audio')){e.muted=true;e.volume=0;e.pause()};return true})()`,
    )
    record.before = await mainWorld(api, state)
    requireNativeObservation(record.before)
    journal.mark('fullscreen-enter')
    await clickVisible(api, '.ytp-fullscreen-button')
    await wait(api, 'return !!document.fullscreenElement')
    record.stage = 'entry-chat'
    if (entry === 'steady')
      await wait(
        api,
        `const f=document.querySelector('#shadow-root-live-chat')?.shadowRoot?.querySelector('iframe[data-ylc-chat]');return !!f?.contentDocument?.querySelector('yt-live-chat-renderer')`,
      )
    await api.delay(entry === 'steady' ? 500 : 200)
    record.entered = await mainWorld(api, state)
    journal.mark('fullscreen-exit')
    record.stage = 'exit-recovery'
    record.exitStartedEpochMs = Date.now()
    watchdog = startSlowWatchdog({ record, journal, latest: () => latest, save: persist })
    await api.key('\uE00C')
    let stableSince = null,
      generation = null
    while (Date.now() - record.exitStartedEpochMs < 30000) {
      if (journal.fatal) throw new Error('Network recording integrity failed')
      const value = await mainWorld(api, state)
      const sample = { ...value, ms: Date.now() - record.exitStartedEpochMs }
      record.samples.push(sample)
      const ready =
        !sample.fullscreen &&
        sample.nativeConnected &&
        sample.parentRestored &&
        sample.nativeHostHasOriginal &&
        !sample.blank &&
        sample.renderer &&
        sample.nativeRules > 0 &&
        !sample.extensionClass &&
        sample.extensionStyles === 0
      latest = { ready, sample }
      if (record.slow && record.atSlow && !record.atSlow.resources) record.atSlow.resources = await resources(api)
      if (!record.slow && sample.ms >= slowMs && (!ready || stableSince === null || generation !== sample.generation)) {
        record.slow = true
        journal.mark('slow-detected')
        record.atSlow = { state: sample, network: journal.snapshot(), resources: await resources(api) }
        await persist() // Save while the request is pending, before it can complete.
      }
      if (ready) {
        if (stableSince === null || generation !== sample.generation) {
          stableSince = sample.ms
          generation = sample.generation
        }
        if (sample.ms >= 2500 && sample.ms - stableSince >= 700) {
          record.recoveryMs = stableSince
          record.outcome = stableSince >= 15000 ? 'late-recovery' : 'recovered'
          break
        }
      } else {
        stableSince = null
        generation = null
      }
      await api.delay(sample.ms < 2000 ? 100 : 250)
    }
    if (record.outcome === 'precondition') record.outcome = 'recovery-timeout'
    record.finalResources = await resources(api)
  } catch (error) {
    record.outcome = record.stage === 'source' && error instanceof PreconditionError ? 'precondition-failed' : 'measurement-error'
    // Do not serialize native errors: they can contain a watch URL or a user string.
  } finally {
    await watchdog?.stop()
    record.networkEnd = journal.snapshot()
    record.networkEndSequence = journal.sequence
    record.completedEpochMs = Date.now()
    await persist()
    journal.mark('trial-finished')
  }
  return record
}
