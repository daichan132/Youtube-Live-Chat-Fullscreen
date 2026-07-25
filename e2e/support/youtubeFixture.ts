import type { Page } from '@playwright/test'

type WatchFixtureHtmlOptions = {
  title: string
  videoId: string
  isLive?: boolean
  extraStyle?: string
  extraBody?: string
}

export const buildPlayableChatHtml = (title: string) => `<!doctype html>
<html>
  <head><title>${title}</title></head>
  <body>
    <yt-live-chat-renderer>
      <yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>
    </yt-live-chat-renderer>
  </body>
</html>`

export const buildWatchFixtureHtml = ({
  title,
  videoId,
  isLive = false,
  extraStyle = '',
  extraBody = '',
}: WatchFixtureHtmlOptions) => `<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #0f0f0f; }
      #movie_player { position: relative; width: 1280px; height: 720px; background: #111; color: white; }
      .ytp-right-controls { position: absolute; right: 0; bottom: 0; height: 48px; display: flex; align-items: stretch; }
      .ytp-button { width: 54px; height: 48px; }
      ${extraStyle}
    </style>
  </head>
  <body>
    <ytd-watch-flexy video-id="${videoId}"${isLive ? ' is-live-now' : ''}></ytd-watch-flexy>
    <div id="movie_player" video-id="${videoId}">
      <div class="ytp-right-controls">
        <button type="button" class="ytp-button ytp-fullscreen-button" aria-label="Full screen">Full screen</button>
      </div>
    </div>
    ${extraBody}
    <script>
      const player = document.getElementById('movie_player');
      player.getVideoData = () => ({ isLive: ${isLive}, isLiveContent: ${isLive}, video_id: '${videoId}' });
      document.querySelector('.ytp-fullscreen-button').addEventListener('click', async () => {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          return;
        }
        await player.requestFullscreen();
      });
    </script>
  </body>
</html>`

export const unregisterYouTubeServiceWorkers = async (page: Page) => {
  await page.goto('https://www.youtube.com/?ylc-fixture-preflight=1', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)
  await page
    .evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(registration => registration.unregister()))
    })
    .catch(() => null)
  await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null)
}

export const routeYouTubeWatchFixture = async (page: Page, videoId: string, body: string) => {
  await unregisterYouTubeServiceWorkers(page)
  await page.route(
    `**/watch?v=${videoId}`,
    route =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body,
      }),
    { times: 1 },
  )
}
