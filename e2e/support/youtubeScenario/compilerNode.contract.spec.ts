import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('YouTube scenario compiler in native Node', () => {
  it('compiles a fixture through the same TypeScript import used by verification CLIs', () => {
    const compilerUrl = new URL('./compiler.ts', import.meta.url)
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `
          import { compileYouTubeScenario } from ${JSON.stringify(compilerUrl.href)}
          const compiled = compileYouTubeScenario({
            video: { id: 'node-fixture', title: 'Native Node fixture', mode: 'live' },
            page: { chatContainer: 'present' },
            fullscreen: false,
            chat: { mode: 'live', native: { state: 'playable' }, response: 'playable' },
          })
          process.stdout.write(JSON.stringify(compiled))
        `,
      ],
      { encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' }, timeout: 10_000 },
    )
    const compiled = JSON.parse(output)

    expect(compiled).toMatchObject({
      watchUrl: 'https://www.youtube.com/watch?v=node-fixture',
      watchHtml: expect.stringContaining('<title>Native Node fixture</title>'),
      spaDocument: { videoId: 'node-fixture', isLive: true },
      chatRoutes: [{ pattern: '**/live_chat?*', body: expect.stringContaining('yt-live-chat-item-list-renderer') }],
    })
  })
})
