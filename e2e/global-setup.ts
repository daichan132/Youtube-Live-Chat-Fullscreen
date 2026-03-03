import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const EXTENSION_OUTPUT_DIR = path.resolve('.output/chrome-mv3')
const SHARED_LIVE_URL_PATH = path.join(os.tmpdir(), 'ylc-e2e-live-url.txt')

export default function globalSetup() {
	if (fs.existsSync(SHARED_LIVE_URL_PATH)) fs.unlinkSync(SHARED_LIVE_URL_PATH)
	if (!fs.existsSync(EXTENSION_OUTPUT_DIR)) {
		throw new Error(
			`Extension build output not found: ${EXTENSION_OUTPUT_DIR}\nRun "yarn build" before running E2E tests.`,
		)
	}

	const manifest = path.join(EXTENSION_OUTPUT_DIR, 'manifest.json')
	if (!fs.existsSync(manifest)) {
		throw new Error(
			`manifest.json not found in ${EXTENSION_OUTPUT_DIR}\nThe build output may be corrupted. Run "yarn build" again.`,
		)
	}

	const e2eBridge = path.join(EXTENSION_OUTPUT_DIR, 'e2e.html')
	if (!fs.existsSync(e2eBridge)) {
		throw new Error(
			`e2e.html not found in ${EXTENSION_OUTPUT_DIR}\nEnsure public/e2e.html exists and run "yarn build" again.`,
		)
	}
}
