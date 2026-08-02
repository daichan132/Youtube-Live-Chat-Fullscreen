import type { Page, TestInfo } from '@playwright/test'
import {
  assessCompatibilityFingerprint,
  type CompatibilityFingerprint,
} from '../../entrypoints/content/diagnostics/compatibilityFingerprint'
import type { RuntimeFailureCode } from '../../entrypoints/content/diagnostics/failureCodes'
import {
  archivePlayerChatToggleProbe,
  archiveSidebarOpenControlProbe,
  nativeChatIframeProbe,
  playerProbe,
  rightControlsProbe,
} from '../../entrypoints/content/platform/youtube/selectorCatalog'

type FingerprintDiff = {
  field: string
  previous: string | boolean | null
  current: string | boolean | null
}

export type CanaryFingerprintArtifact = {
  schemaVersion: 1
  fingerprint: CompatibilityFingerprint
  previousFingerprint: CompatibilityFingerprint | null
  differences: readonly FingerprintDiff[]
  assessment: ReturnType<typeof assessCompatibilityFingerprint>
  failureCode?: RuntimeFailureCode
}

const flattenFingerprint = (fingerprint: CompatibilityFingerprint) => ({
  playerProbe: fingerprint.playerProbe,
  controlsProbe: fingerprint.controlsProbe,
  chatProbe: fingerprint.chatProbe,
  archiveControlProbe: fingerprint.archiveControlProbe,
  mode: fingerprint.mode,
  source: fingerprint.source,
  overlay: fingerprint.capabilities.overlay,
  playerSwitch: fingerprint.capabilities.playerSwitch,
  nativeRestore: fingerprint.capabilities.nativeRestore,
})

export const diffCompatibilityFingerprints = (
  previous: CompatibilityFingerprint | null,
  current: CompatibilityFingerprint,
): readonly FingerprintDiff[] => {
  if (!previous) return []
  const previousFlat = flattenFingerprint(previous)
  const currentFlat = flattenFingerprint(current)
  return Object.keys(currentFlat).flatMap(field => {
    const key = field as keyof typeof currentFlat
    return previousFlat[key] === currentFlat[key] ? [] : [{ field, previous: previousFlat[key], current: currentFlat[key] }]
  })
}

const failureCodeFor = (fingerprint: CompatibilityFingerprint): RuntimeFailureCode | undefined => {
  if (!fingerprint.playerProbe || !fingerprint.capabilities.overlay) return 'PLAYER_TARGET_MISSING'
  if (!fingerprint.capabilities.playerSwitch && (fingerprint.mode === 'live' || fingerprint.mode === 'archive')) {
    return 'CONTROL_TARGET_MISSING'
  }
  if (!fingerprint.source && (fingerprint.mode === 'live' || fingerprint.mode === 'archive')) return 'CHAT_SOURCE_PENDING'
  if (fingerprint.mode === 'unknown') return 'CHAT_SOURCE_UNAVAILABLE'
  return undefined
}

const readFingerprint = (probes: {
  player: typeof playerProbe
  controls: typeof rightControlsProbe
  chat: typeof nativeChatIframeProbe
  archiveSidebar: typeof archiveSidebarOpenControlProbe
  archivePlayer: typeof archivePlayerChatToggleProbe
}): CompatibilityFingerprint => {
  const firstProbe = (root: ParentNode, probe: { probeId: string; selectors: readonly string[] }, fallback?: Element | null) => {
    for (let index = 0; index < probe.selectors.length; index += 1) {
      if (root.querySelector(probe.selectors[index]) || fallback?.matches(probe.selectors[index])) {
        return `${probe.probeId}.${index + 1}`
      }
    }
    return null
  }

  const helpers = window.__ylcHelpers
  const player = document.querySelector(probes.player.selectors[0]) as (HTMLElement & { getVideoData?: () => { isLive?: boolean } }) | null
  const frame = helpers?.getExtensionIframe() ?? helpers?.getNativeIframe() ?? null
  const frameHref = helpers?.readIframeHref(frame) ?? ''
  const frameUnavailable = helpers?.isDocUnavailable(frame?.contentDocument ?? null) ?? false
  const source: CompatibilityFingerprint['source'] = frame
    ? frame.getAttribute('data-ylc-owned') === 'true'
      ? 'managed-live'
      : frameHref.includes('/live_chat_replay')
        ? 'borrowed-replay'
        : 'borrowed-live'
    : null
  const mode: CompatibilityFingerprint['mode'] = frameUnavailable
    ? 'no-chat'
    : frameHref.includes('/live_chat_replay')
      ? 'archive'
      : frameHref.includes('/live_chat') || player?.getVideoData?.().isLive === true
        ? 'live'
        : frame
          ? 'unknown'
          : 'no-chat'
  const archiveControlProbe = firstProbe(document, probes.archiveSidebar) ?? firstProbe(document, probes.archivePlayer)

  return {
    playerProbe: firstProbe(document, probes.player),
    controlsProbe: player ? firstProbe(player, probes.controls) : null,
    chatProbe: firstProbe(document, probes.chat, frame),
    archiveControlProbe,
    mode,
    source,
    capabilities: {
      overlay: Boolean(player && document.fullscreenElement),
      playerSwitch: Boolean(player?.querySelector(probes.controls.selectors[0])),
      nativeRestore: source === 'borrowed-live' || source === 'borrowed-replay',
    },
  }
}

export const captureCompatibilityFingerprint = async (
  page: Page,
  testInfo: TestInfo,
  previousFingerprint: CompatibilityFingerprint | null,
) => {
  const fingerprint = await page
    .evaluate(readFingerprint, {
      player: playerProbe,
      controls: rightControlsProbe,
      chat: nativeChatIframeProbe,
      archiveSidebar: archiveSidebarOpenControlProbe,
      archivePlayer: archivePlayerChatToggleProbe,
    })
    .catch(() => null)
  if (!fingerprint) return null

  const assessment = assessCompatibilityFingerprint(fingerprint)
  const failureCode = failureCodeFor(fingerprint)
  const artifact: CanaryFingerprintArtifact = {
    schemaVersion: 1,
    fingerprint,
    previousFingerprint,
    differences: diffCompatibilityFingerprints(previousFingerprint, fingerprint),
    assessment,
    ...(failureCode ? { failureCode } : {}),
  }
  await testInfo.attach('compatibility-fingerprint', {
    body: JSON.stringify(artifact, null, 2),
    contentType: 'application/json',
  })
  testInfo.annotations.push({ type: 'compatibility', description: assessment.state })
  return artifact
}
