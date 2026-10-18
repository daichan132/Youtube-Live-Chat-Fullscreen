import { stat } from 'node:fs/promises'
import { join } from 'node:path'

export const findFirefoxSourceZip = async (outputDirectory, version) => {
  const sourceZip = join(outputDirectory, `youtube-live-chat-fullscreen-${version}-sources.zip`)
  await stat(sourceZip).catch(error => {
    if (error.code !== 'ENOENT') throw error
    throw new Error(`Firefox source ZIP for v${version} is missing: ${sourceZip}\nRun \`yarn zip:firefox\` first.`)
  })
  return sourceZip
}
