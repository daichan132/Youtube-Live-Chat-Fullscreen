#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const classifyReleaseCanary = (payload, exitCode) => {
  const summary = payload?.summary
  if (!summary || !Number.isInteger(exitCode)) throw new Error('Canary summary or exit code is invalid.')

  if (exitCode === 0 && summary.state === 'passed' && summary.executed > 0 && summary.failed === 0 && summary.skipped === 0) {
    return 'passed'
  }

  if (summary.state === 'not-run' && summary.executed === 0 && summary.failed === 0 && summary.skipped > 0) {
    return 'unavailable'
  }

  throw new Error(
    `Release canary is neither clean nor externally unavailable: state=${summary.state}, executed=${summary.executed}, failed=${summary.failed}, skipped=${summary.skipped}, exit=${exitCode}`,
  )
}

const isDirectInvocation = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
if (isDirectInvocation) {
  const [summaryPath, rawExitCode] = process.argv.slice(2)
  if (!summaryPath || rawExitCode === undefined) {
    throw new Error('Usage: classify-release-canary.mjs <summary.json> <playwright-exit-code>')
  }
  const payload = JSON.parse(await readFile(summaryPath, 'utf8'))
  console.log(classifyReleaseCanary(payload, Number(rawExitCode)))
}
