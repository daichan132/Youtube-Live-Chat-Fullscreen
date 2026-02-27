import fs from 'node:fs'
import path from 'node:path'

const EXTENSION_OUTPUT_DIR = path.resolve('.output/chrome-mv3')

export default function globalSetup() {
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
}
