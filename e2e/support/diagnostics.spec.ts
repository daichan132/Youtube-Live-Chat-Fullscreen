import { afterEach, describe, expect, it } from 'vitest'
import { hasYouTubePlayerError } from './diagnostics'

afterEach(() => {
  document.body.replaceChildren()
})

describe('hasYouTubePlayerError', () => {
  it('detects an unavailable live stream recording error', () => {
    document.body.innerHTML = `
      <div id="movie_player">
        <div class="ytp-error">
          <div role="alert">This live stream recording is not available.</div>
        </div>
      </div>
    `

    expect(hasYouTubePlayerError()).toBe(true)
  })

  it('does not treat normal player content as an error', () => {
    document.body.innerHTML = `
      <div id="movie_player">
        <div role="alert">Subtitles are not available for this video.</div>
      </div>
    `

    expect(hasYouTubePlayerError()).toBe(false)
  })
})
