import fs from 'node:fs'
import path from 'node:path'

const reportPath = process.argv[2]

if (!reportPath) {
  console.error('Usage: node scripts/validate-e2e-report.mjs <playwright-json-report>')
  process.exit(1)
}

const requiredSpecs = (process.env.E2E_REQUIRED_SPECS ?? '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)

const defaultRequiredSpecs = [
  'e2e/scenarios/archive/liveChatReplay.spec.ts',
  'e2e/scenarios/archive/fullscreenChatRestore.spec.ts',
  'e2e/scenarios/archive/fullscreenChatVideoTransition.spec.ts',
  'e2e/scenarios/archive/liveChatReplayUnavailable.spec.ts',
]

const required = requiredSpecs.length > 0 ? requiredSpecs : defaultRequiredSpecs

const raw = fs.readFileSync(reportPath, 'utf8')
const report = JSON.parse(raw)

const unexpected = Number(report?.stats?.unexpected ?? 0)
if (unexpected > 0) {
  console.error(`[validate-e2e-report] unexpected=${unexpected} (must be 0)`)
  process.exit(1)
}

const collectSpecs = suites => {
  const collected = []
  for (const suite of suites ?? []) {
    for (const spec of suite?.specs ?? []) {
      collected.push(spec)
    }
    collected.push(...collectSpecs(suite?.suites ?? []))
  }
  return collected
}

const specs = collectSpecs(report?.suites ?? [])

const normalizePath = filePath => {
  if (!filePath) return ''
  const normalized = filePath.replace(/\\/g, '/')
  const marker = '/e2e/'
  const markerIndex = normalized.lastIndexOf(marker)
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + 1)
  }
  return normalized
}

const getSpecOutcome = spec => {
  const tests = spec?.tests ?? []
  const statuses = tests.map(test => test?.status).filter(Boolean)
  const hasExecuted = statuses.some(status => status === 'expected' || status === 'flaky')
  return { statuses, hasExecuted }
}

const missing = []
const skippedRequired = []

for (const requiredSpec of required) {
  const requiredCandidates = [requiredSpec, requiredSpec.replace(/^e2e\//, '')]
  const matched = specs.filter(spec => requiredCandidates.some(candidate => normalizePath(spec?.file).endsWith(candidate)))
  if (matched.length === 0) {
    missing.push(requiredSpec)
    continue
  }

  const executed = matched.some(spec => getSpecOutcome(spec).hasExecuted)
  if (!executed) {
    skippedRequired.push(requiredSpec)
  }
}

if (missing.length > 0) {
  console.error('[validate-e2e-report] Required specs missing from report:')
  for (const spec of missing) {
    console.error(`- ${spec}`)
  }
  process.exit(1)
}

if (skippedRequired.length > 0) {
  console.error('[validate-e2e-report] Required specs were not executed (skipped):')
  for (const spec of skippedRequired) {
    console.error(`- ${spec}`)
  }
  process.exit(1)
}

const summary = {
  expected: Number(report?.stats?.expected ?? 0),
  skipped: Number(report?.stats?.skipped ?? 0),
  unexpected: unexpected,
  flaky: Number(report?.stats?.flaky ?? 0),
}

console.log(`[validate-e2e-report] ok ${JSON.stringify(summary)} checked=${required.length}`)
