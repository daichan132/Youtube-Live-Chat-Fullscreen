/* biome-ignore-all lint/suspicious/noConsole: verification CLI reports contract failures */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(resolve(root, path), 'utf8')
const failures = []

const runtimeSource = read('entrypoints/content/runtime/ChatRuntime.ts')
const contentSource = read('entrypoints/content/index.tsx')
const nativeChatSource = read('entrypoints/content/utils/nativeChat.ts')
const e2eSelectorSource = read('e2e/utils/selectors.ts')
const reconcilerSource = read('entrypoints/content/runtime/ResourceReconciler.ts')
const iframeAttachmentSource = read('entrypoints/content/features/YTDLiveChatIframe/utils/iframeAttachment.ts')
const layoutSource = read('entrypoints/content/runtime/resources/PlayerLayoutLease.ts')
const iframeLeaseSource = read('entrypoints/content/runtime/resources/ChatIframeLease.ts')
const presentationLeaseSource = read('entrypoints/content/runtime/resources/PresentationLease.ts')
const chatChromeLeaseSource = read('entrypoints/content/runtime/resources/ChatChromeLease.ts')
const runtimeModelSource = read('entrypoints/content/runtime/runtimeModel.ts')
const diagnosticReportSource = read('entrypoints/content/diagnostics/sanitizeDiagnosticReport.ts')

if (/export\s+const\s+chatRuntime\s*=/.test(runtimeSource)) {
  failures.push('ChatRuntime must be created per content session, not exported as a module singleton')
}
if (/window\.(?:setTimeout|setInterval|requestAnimationFrame)\s*\(/.test(runtimeSource)) {
  failures.push('ChatRuntime async work must be issued through SessionScope')
}
if (!contentSource.includes('new ChatRuntimeImpl()') || !contentSource.includes('<ChatRuntimeProvider')) {
  failures.push('content bootstrap must create and provide its own ChatRuntime instance')
}
if (!runtimeSource.includes('new ResourceReconciler(') || !reconcilerSource.includes('restoringLeases')) {
  failures.push('runtime resources and pending iframe restoration must be owned by ResourceReconciler instances')
}
if (!runtimeModelSource.includes('RuntimePlan') || /ensure-observer|sync-portals|clear-layout|clear-runtime/.test(runtimeModelSource)) {
  failures.push('the pure runtime model must emit semantic RuntimePlan values, not low-level DOM actions')
}
if (
  !iframeLeaseSource.includes('ChatIframeLease') ||
  !presentationLeaseSource.includes('PresentationLease') ||
  !layoutSource.includes('PlayerLayoutLease') ||
  !chatChromeLeaseSource.includes('ChatChromeLease')
) {
  failures.push('runtime DOM resources must expose the four scoped lease contracts')
}
if (
  /^const (?:borrowedIframeRestoreMap|pendingNativeHostRestoreIframes|pendingNativeHostRestoreVideoIds)\b/m.test(iframeAttachmentSource)
) {
  failures.push('iframe restore state must be owned by ChatIframeLease, not module-global collections')
}
if (/^let (?:applied|resizeTimeouts)\b/m.test(layoutSource)) {
  failures.push('player layout state and timers must be owned by PlayerLayoutLease instances')
}
if (!nativeChatSource.includes('platform/youtube/selectorCatalog')) {
  failures.push('native chat controls must use the YouTube selector catalog')
}
if (!e2eSelectorSource.includes('platform/youtube/selectorCatalog')) {
  failures.push('E2E page selectors must use the production YouTube selector catalog')
}
const diagnosticExportType = diagnosticReportSource.slice(
  diagnosticReportSource.indexOf('export type SanitizedDiagnosticReport'),
  diagnosticReportSource.indexOf('export const detectBrowserFamily'),
)
if (/\b(?:videoId|url)\s*:/i.test(diagnosticExportType)) {
  failures.push('sanitized diagnostic export types must not contain raw URL or video ID fields')
}
if (!runtimeSource.includes('RuntimeTrace') || !runtimeSource.includes('createSanitizedDiagnosticReport')) {
  failures.push('ChatRuntime must publish only the shared in-memory sanitized diagnostic schema')
}

for (const obsoletePath of ['entrypoints/content/runtime/readPageSnapshot.ts', 'entrypoints/content/runtime/useChatRuntime.ts']) {
  try {
    read(obsoletePath)
    failures.push(`${obsoletePath} must not be restored`)
  } catch {
    // Expected: the responsibilities moved to scoped runtime and the compatibility adapter.
  }
}

if (failures.length > 0) {
  console.error(`Runtime architecture contract failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('Runtime architecture contract is valid')
}
