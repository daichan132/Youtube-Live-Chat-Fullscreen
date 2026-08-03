import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { E2E_BRIDGE_FILE, E2E_BRIDGE_REQUIRED, E2E_EXTENSION_OUTPUT_DIR } from './config/buildOutput'

const EXTENSION_OUTPUT_DIR = path.resolve(E2E_EXTENSION_OUTPUT_DIR)
const SHARED_LIVE_URL_PATH = path.join(os.tmpdir(), 'ylc-e2e-live-url.txt')

export default function globalSetup() {
  if (fs.existsSync(SHARED_LIVE_URL_PATH)) fs.unlinkSync(SHARED_LIVE_URL_PATH)
  if (!fs.existsSync(EXTENSION_OUTPUT_DIR)) {
    throw new Error(`E2E extension build output not found: ${EXTENSION_OUTPUT_DIR}\nRun "yarn build:e2e" before running E2E tests.`)
  }

  const manifest = path.join(EXTENSION_OUTPUT_DIR, 'manifest.json')
  if (!fs.existsSync(manifest)) {
    throw new Error(
      `manifest.json not found in ${EXTENSION_OUTPUT_DIR}\nThe E2E build output may be corrupted. Run "yarn build:e2e" again.`,
    )
  }

  const e2eBridge = path.join(EXTENSION_OUTPUT_DIR, E2E_BRIDGE_FILE)
  if (E2E_BRIDGE_REQUIRED && !fs.existsSync(e2eBridge)) {
    throw new Error(`${E2E_BRIDGE_FILE} not found in ${EXTENSION_OUTPUT_DIR}\nThe bridge is only included by "yarn build:e2e".`)
  }
}
