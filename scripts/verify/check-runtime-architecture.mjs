import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(resolve(root, path), 'utf8')
const failures = []

const runtimeSource = read('entrypoints/content/runtime/ChatRuntime.ts')
const contentSource = read('entrypoints/content/index.tsx')
const nativeChatSource = read('entrypoints/content/utils/nativeChat.ts')
const e2eSelectorSource = read('e2e/utils/selectors.ts')

if (/export\s+const\s+chatRuntime\s*=/.test(runtimeSource)) {
  failures.push('ChatRuntime must be created per content session, not exported as a module singleton')
}
if (/window\.(?:setTimeout|setInterval|requestAnimationFrame)\s*\(/.test(runtimeSource)) {
  failures.push('ChatRuntime async work must be issued through SessionScope')
}
if (!contentSource.includes('new ChatRuntimeImpl()') || !contentSource.includes('<ChatRuntimeProvider')) {
  failures.push('content bootstrap must create and provide its own ChatRuntime instance')
}
if (!nativeChatSource.includes("platform/youtube/selectorCatalog")) {
  failures.push('native chat controls must use the YouTube selector catalog')
}
if (!e2eSelectorSource.includes('platform/youtube/selectorCatalog')) {
  failures.push('E2E page selectors must use the production YouTube selector catalog')
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
