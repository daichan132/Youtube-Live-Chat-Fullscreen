import type { NativeChatDefinition, YouTubeScenarioState } from './types'

export type CompiledYouTubeScenario = {
  watchUrl: string
  watchHtml: string
  chatRoutes: Array<{
    pattern: string
    body: string
  }>
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const playableChatHtml = (title: string) => `<!doctype html>
<html>
  <head><title>${escapeHtml(title)}</title></head>
  <body>
    <yt-live-chat-renderer>
      <yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>
    </yt-live-chat-renderer>
  </body>
</html>`

const unavailableChatHtml = () => `<!doctype html>
<html>
  <body>
    <yt-live-chat-unavailable-message-renderer>
      Live chat replay is not available
    </yt-live-chat-unavailable-message-renderer>
  </body>
</html>`

const renderShowHideControl = (mode: 'live' | 'archive') => `
  <div id="show-hide-button">
    <button type="button" aria-label="${mode === 'archive' ? 'Show chat replay' : 'Show chat'}">
      ${mode === 'archive' ? 'Show chat replay' : 'Show chat'}
    </button>
  </div>`

const iframeSrc = (videoId: string, mode: 'live' | 'archive') =>
  mode === 'archive' ? `/live_chat_replay?v=${videoId}&continuation=ylc-fixture` : `/live_chat?v=${videoId}&fixture=native`

const renderNativeChat = (videoId: string, mode: 'live' | 'archive', native: NativeChatDefinition) => {
  if (native.state === 'absent') return ''
  const slotBefore = native.slot ? `<span id="${escapeHtml(native.slot.beforeId)}"></span>` : ''
  const slotAfter = native.slot ? `<span id="${escapeHtml(native.slot.afterId)}"></span>` : ''
  const hostVideoId = native.hostVideoId === false ? '' : ` video-id="${escapeHtml(videoId)}"`
  const srcdoc = native.state === 'unavailable' ? ` srcdoc="${escapeHtml(unavailableChatHtml())}"` : ''
  return `
    <ytd-live-chat-frame${hostVideoId}>
      ${slotBefore}
      <iframe
        id="chatframe"
        class="ytd-live-chat-frame"
        src="${escapeHtml(iframeSrc(videoId, mode))}"${srcdoc}
      ></iframe>
      ${slotAfter}
      ${native.showHideControl ? renderShowHideControl(mode) : ''}
    </ytd-live-chat-frame>`
}

const renderChatContainer = (state: YouTubeScenarioState) => {
  if (state.page.chatContainer === 'absent') return ''
  const nativeChat = state.chat.mode === 'none' ? '' : renderNativeChat(state.video.id, state.chat.mode, state.chat.native)
  return `
    <div id="secondary">
      <div id="chat-container">${nativeChat}</div>
    </div>`
}

const renderWatchHtml = (state: YouTubeScenarioState) => {
  const isLive = state.video.mode === 'live'
  const dimensions =
    state.page.chatDimensions === 'standard'
      ? '#secondary { width: 420px; height: 640px; } #chat-container, ytd-live-chat-frame, #chatframe { display: block; width: 400px; height: 600px; }'
      : ''
  return `<!doctype html>
<html>
  <head>
    <title>${escapeHtml(state.video.title)}</title>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #0f0f0f; }
      #movie_player { position: relative; width: 1280px; height: 720px; background: #111; color: white; }
      .ytp-right-controls { position: absolute; right: 0; bottom: 0; height: 48px; display: flex; align-items: stretch; }
      .ytp-button { width: 54px; height: 48px; }
      ${dimensions}
    </style>
  </head>
  <body>
    <ytd-watch-flexy video-id="${escapeHtml(state.video.id)}"${isLive ? ' is-live-now' : ''}></ytd-watch-flexy>
    <div id="movie_player" video-id="${escapeHtml(state.video.id)}">
      <div class="ytp-right-controls">
        <button type="button" class="ytp-button ytp-fullscreen-button" aria-label="Full screen">Full screen</button>
      </div>
    </div>
    ${renderChatContainer(state)}
    <script>
      const player = document.getElementById('movie_player');
      player.getVideoData = () => ({ isLive: ${isLive}, isLiveContent: ${isLive}, video_id: '${escapeHtml(state.video.id)}' });
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
}

export const compileYouTubeScenario = (state: YouTubeScenarioState): CompiledYouTubeScenario => {
  const chatRoutes =
    state.chat.mode === 'none'
      ? []
      : [
          {
            pattern: state.chat.mode === 'archive' ? '**/live_chat_replay?*' : '**/live_chat?*',
            body: state.chat.response === 'playable' ? playableChatHtml(`${state.video.title} chat fixture`) : unavailableChatHtml(),
          },
        ]

  return {
    watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(state.video.id)}`,
    watchHtml: renderWatchHtml(state),
    chatRoutes,
  }
}
