#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const generator = fileURLToPath(new URL('../generate-locales.mjs', import.meta.url))
const result = spawnSync(process.execPath, [generator, '--check'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, MISE_TRUSTED_CONFIG_PATHS: root },
})

process.exit(result.status ?? 1)
