import { scenarioDocumentInitializationScript } from './initializeScenarioDocument.ts'
import type { NativeChatDefinition, YouTubeScenarioState } from './types'

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]+$/

export type CompiledYouTubeScenario = {
  watchUrl: string
  watchHtml: string
  spaDocument: {
    title: string
    bodyHtml: string
    videoId: string
    isLive: boolean
    nativeChatNavigationHref: string | null
  }
  chatRoutes: Array<{
    pattern: string
    body: string
  }>
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

// Representative native boundaries observed in the current YouTube composer and picker.
const appearanceSurfaceHtml = `
  <style>
    .ytwPdgGiftItemHost { background: white; color: rgb(15,15,15); }
    .ytwPdgGiftItemSelected { background: rgb(15,15,15); color: rgb(241,241,241); }
    ytd-engagement-panel-title-header-renderer :is(#title-text, button, svg) { color: rgb(15,15,15); fill: currentColor; }
    yt-live-chat-participant-list-renderer #header { background: white; color: rgb(15,15,15); }
    yt-live-chat-participant-list-renderer #back-button :is(button, svg) { color: rgb(15,15,15); fill: currentColor; }
    yt-live-chat-author-chip[is-highlighted] #author-name.owner.yt-live-chat-author-chip { color: white; background: rgb(15,15,15); }
    yt-live-chat-message-input-renderer #input-container { background: rgba(0, 0, 0, .05); }
    yt-live-chat-super-sticker-preview-renderer #close button { color: rgb(15,15,15); }
    yt-live-chat-super-sticker-preview-renderer #close svg { fill: currentColor; }
    yt-live-chat-super-sticker-preview-renderer #back-button { background: white; }
    :root { --fixture-native-offer-primary: rgb(15,15,15); --fixture-native-offer-secondary: rgb(96,96,96); }
    ytd-sponsorships-gift-offer-header-renderer, ytd-sponsorships-gift-offer-body-renderer {
      display: block; background: white; color: var(--fixture-native-offer-primary);
    }
    ytd-sponsorships-gift-offer-header-renderer #title, ytd-sponsorships-gift-offer-body-renderer #title,
    ytd-sponsorships-gift-offer-header-renderer button { color: var(--fixture-native-offer-primary); }
    ytd-offer-section-renderer yt-formatted-string.title, ytd-offer-content-renderer yt-formatted-string.title { color: var(--fixture-native-offer-primary); }
    ytd-sponsorships-gift-offer-body-renderer #subtitle { color: var(--fixture-native-offer-secondary); }
    ytd-sponsorships-gift-offer-body-renderer .ytSpecButtonShapeNextText { color: rgb(6,95,212); }
    ytd-sponsorships-gift-offer-renderer svg { fill: currentColor; }
    #fixture-poll-panel { background: white; }
    yt-live-chat-poll-renderer {
      --yt-live-chat-poll-choice-background-color: rgba(0,0,0,.1);
      --yt-live-chat-poll-choice-text-color: rgba(17,17,17,.6);
      --yt-live-chat-poll-choice-vote-bar-color: rgba(0,0,0,.2);
    }
    yt-live-chat-poll-header-renderer #poll-question,
    yt-live-chat-poll-header-renderer button,
    yt-live-chat-poll-choice #selected-icon,
    yt-live-chat-poll-choice:not([has-voted]) #label-text,
    yt-live-chat-poll-choice[has-voted][selected] #label-text { color: var(--fixture-native-offer-primary); }
    yt-live-chat-poll-header-renderer .metadata { color: var(--fixture-native-offer-secondary); }
    yt-live-chat-poll-choice #endpoint { color: var(--yt-live-chat-poll-choice-text-color); background: var(--yt-live-chat-poll-choice-background-color); }
    yt-live-chat-poll-choice[has-voted] #vote-percentage-bar { background: var(--yt-live-chat-poll-choice-vote-bar-color); height: 4px; }
    yt-live-chat-poll-renderer svg { fill: currentColor; }
    yt-emoji-picker-upsell-category-renderer #title { color: rgba(17,17,17,.6); background: rgba(247,247,247,.8); }
    yt-emoji-picker-category-renderer #title { color: rgb(96, 96, 96); background: rgb(204, 204, 204); }
    yt-emoji-picker-renderer label.tp-yt-paper-input { color: rgba(17,17,17,.6); }
    yt-emoji-picker-renderer #clear-search, yt-emoji-picker-renderer #clear-search svg { color: rgb(15,15,15); fill: currentColor; }
    tp-yt-iron-input.tp-yt-paper-input > input.tp-yt-paper-input { color: inherit; }
    yt-emoji-picker-renderer input::placeholder { color: rgb(96, 96, 96); }
    yt-live-chat-viewer-engagement-message-renderer #action-button a { color: rgb(6, 95, 212); }
  </style>
  <yt-live-chat-participant-list-renderer>
    <div id="header"><div id="back-button"><button aria-label="Leave participants"><svg width="24" height="24"><path d="M2 12h20" /></svg></button></div>Participants</div>
    <yt-live-chat-participant-renderer>
      <yt-live-chat-author-chip><span id="author-name" class="yt-live-chat-author-chip">Fixture viewer</span></yt-live-chat-author-chip>
      <yt-live-chat-author-chip is-highlighted><span id="author-name" class="owner yt-live-chat-author-chip">Fixture owner</span></yt-live-chat-author-chip>
    </yt-live-chat-participant-renderer>
  </yt-live-chat-participant-list-renderer>
  <div id="input-panel"><yt-live-chat-message-input-renderer>
    <div id="input-container"><yt-live-chat-text-input-field-renderer>
      <div id="input" class="yt-live-chat-text-input-field-renderer" contenteditable="true" aria-label="Message"></div>
    </yt-live-chat-text-input-field-renderer></div>
  </yt-live-chat-message-input-renderer></div>
  <yt-live-chat-product-picker-panel-view-model><yt-attributed-string>Support choices</yt-attributed-string></yt-live-chat-product-picker-panel-view-model>
  <yt-live-chat-paid-sticker-panel-renderer>
    <yt-live-chat-super-sticker-preview-renderer>
      <div id="header"><div id="left"><yt-icon-button id="close"><button aria-label="Close purchase preview"><svg width="24" height="24"><path d="M4 4l16 16M20 4L4 20" /></svg></button></yt-icon-button></div></div>
      <div id="footer">
        <button aria-label="Purchase sticker" style="background: rgb(6,95,212); color: rgb(241,241,241)">Purchase</button>
        <div id="back-button"><button aria-label="Show stickers" style="color: inherit; background: transparent">Show stickers</button></div>
      </div>
    </yt-live-chat-super-sticker-preview-renderer>
    <yt-live-chat-super-sticker-pack-backstory-renderer><span id="title">Sticker story</span><span id="content">Illustration credits</span></yt-live-chat-super-sticker-pack-backstory-renderer>
  </yt-live-chat-paid-sticker-panel-renderer>
  <ytd-sponsorships-gift-offer-renderer>
    <ytd-sponsorships-gift-offer-header-renderer>
      <yt-icon-button id="close-button"><button aria-label="Close membership gift"><svg width="24" height="24"><path d="M4 4l16 16M20 4L4 20" /></svg></button></yt-icon-button>
      <div id="title">Membership gifts</div>
    </ytd-sponsorships-gift-offer-header-renderer>
    <ytd-sponsorships-gift-offer-body-renderer>
      <div id="title">Give memberships</div><div id="subtitle">Gift offer description</div>
      <ytd-offer-section-renderer><div><yt-formatted-string class="title">Buy membership gifts</yt-formatted-string></div></ytd-offer-section-renderer><ytd-offer-content-renderer class="purchase-option"><div><yt-formatted-string class="title">5 memberships</yt-formatted-string></div><button class="ytSpecButtonShapeNextText" aria-label="Choose membership quantity"><span class="ytSpecButtonShapeNextButtonTextContent">Price</span><svg width="24" height="24"><path d="M8 4l8 8-8 8" /></svg></button></ytd-offer-content-renderer>
    </ytd-sponsorships-gift-offer-body-renderer>
  </ytd-sponsorships-gift-offer-renderer>
  <yt-live-chat-action-panel-renderer id="fixture-poll-panel"><yt-live-chat-poll-renderer>
    <yt-live-chat-poll-header-renderer>
      <span class="metadata">Poll metadata</span>
      <div id="menu"><button aria-label="Poll menu"><svg width="24" height="24"><path d="M4 12h16" /></svg></button></div>
      <div id="main-content"><yt-formatted-string id="poll-question">Fixture poll question</yt-formatted-string></div>
    </yt-live-chat-poll-header-renderer>
    <yt-live-chat-poll-choice><a id="endpoint" role="button" aria-label="Poll option" href="#fixture-poll"><tp-yt-paper-item id="content"><span id="label-text">Unvoted option</span></tp-yt-paper-item></a></yt-live-chat-poll-choice>
    <yt-live-chat-poll-choice has-voted selected enable-banner-update><a id="endpoint" role="button" aria-label="Selected poll result" href="#fixture-poll-result"><tp-yt-paper-item id="content"><span id="label-text">Selected option</span><span id="vote-percentage-text">60%</span><div id="vote-percentage-bar" style="width: 60%"></div><span id="selected-icon"><svg width="24" height="24"><path d="M4 12l5 5L20 6" /></svg></span></tp-yt-paper-item></a></yt-live-chat-poll-choice>
    <yt-live-chat-poll-choice><a id="endpoint" role="button" aria-label="Disabled poll option" aria-disabled="true" href="#fixture-disabled-poll"><tp-yt-paper-item id="content" disabled><span id="label-text">Unavailable option</span></tp-yt-paper-item></a></yt-live-chat-poll-choice>
  </yt-live-chat-poll-renderer></yt-live-chat-action-panel-renderer>
  <yt-emoji-picker-renderer>
    <div id="search-panel"><label class="tp-yt-paper-input">Search</label><yt-icon-button id="clear-search"><button aria-label="Clear emoji search"><svg width="24" height="24"><path d="M4 4l16 16" /></svg></button></yt-icon-button><tp-yt-iron-input class="tp-yt-paper-input" style="color: rgba(17, 17, 17, .8)"><input class="tp-yt-paper-input" aria-label="Search emoji" placeholder="Search" /></tp-yt-iron-input></div>
    <yt-emoji-picker-upsell-category-renderer><yt-formatted-string id="title">Channel emoji</yt-formatted-string></yt-emoji-picker-upsell-category-renderer>
    <yt-emoji-picker-category-renderer><div id="title" class="yt-emoji-picker-category-renderer">People</div></yt-emoji-picker-category-renderer>
    <span id="fixture-colored-emoji" style="color: rgb(255, 128, 0)">Emoji artwork</span>
  </yt-emoji-picker-renderer>
  <yt-live-chat-viewer-engagement-message-renderer>
    <div id="card"><yt-formatted-string id="message" class="yt-live-chat-viewer-engagement-message-renderer">Chat notice</yt-formatted-string>
      <div id="action-button"><yt-button-renderer><yt-button-shape>
        <a href="#details" class="ytSpecButtonShapeNextHost"><span class="ytSpecButtonShapeNextButtonTextContent">Details</span></a>
      </yt-button-shape></yt-button-renderer></div>
      <yt-icon id="fixture-semantic-icon" style="color: rgb(255, 0, 51)">YouTube</yt-icon>
    </div>
  </yt-live-chat-viewer-engagement-message-renderer>
  <ytd-engagement-panel-section-list-renderer>
    <ytd-engagement-panel-title-header-renderer>
      <h2 id="title"><yt-formatted-string id="title-text">Gifts</yt-formatted-string></h2>
      <div id="navigation-button"><button aria-label="Back to chat"><svg width="24" height="24"><path d="M2 12h20" /></svg></button></div>
      <button id="fixture-jewels-balance" style="background: rgb(222,241,255); color: rgb(6,95,212)">Jewels balance</button>
    </ytd-engagement-panel-title-header-renderer>
    <yt-pdg-gift-collection-view-model>
      <button class="ytwPdgGiftCollectionGridCell" aria-label="Gift choice"><yt-pdg-gift-item-view-model class="ytwPdgGiftItemHost">
        <img alt="Gift artwork" width="16" height="16" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath fill='%238000ff' d='M0 0h16v16H0z'/%3E%3C/svg%3E" />
        <div class="ytwPdgGiftItemGiftName">Gift name</div><span class="ytwPdgGiftItemTokenAmount">100</span>
      </yt-pdg-gift-item-view-model></button>
      <button class="ytwPdgGiftCollectionGridCell" aria-label="Selected gift choice"><yt-pdg-gift-item-view-model class="ytwPdgGiftItemHost ytwPdgGiftItemSelected">Send</yt-pdg-gift-item-view-model></button>
      <button class="ytwPdgGiftCollectionGridCell" aria-label="Unavailable gift choice" disabled><yt-pdg-gift-item-view-model class="ytwPdgGiftItemHost">Unavailable</yt-pdg-gift-item-view-model></button>
    </yt-pdg-gift-collection-view-model>
  </ytd-engagement-panel-section-list-renderer>`

const playableChatHtml = (
  title: string,
  runtimeVideoId?: string,
  restrictedParticipation = false,
  giftButton = false,
  appearanceSurfaces = false,
) => `<!doctype html>
<html>
  <head><title>${escapeHtml(title)}</title></head>
  <body${runtimeVideoId ? ` data-ylc-fixture-video-id="${escapeHtml(runtimeVideoId)}"` : ''}>
    <yt-live-chat-renderer>
      <yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>
      ${
        appearanceSurfaces
          ? appearanceSurfaceHtml
          : restrictedParticipation
            ? `<style>
        #container.yt-live-chat-restricted-participation-renderer { background: white; color: rgba(17,17,17,.6); }
        #body.yt-live-chat-restricted-participation-renderer { color: rgba(17,17,17,.6); }
      </style>
      <div id="input-panel"><yt-live-chat-restricted-participation-renderer>
        <div id="container" class="yt-live-chat-restricted-participation-renderer">
          <div id="explanation"><div id="body" class="yt-live-chat-restricted-participation-renderer"><span id="message">Subscribers-only mode</span></div></div>
        </div>
      </yt-live-chat-restricted-participation-renderer></div>`
            : giftButton
              ? `<style>
        .ytwPdgGiftButtonButton { color: rgb(15,15,15); background-color: rgba(0,0,0,.05); border: 0; width: 40px; height: 40px; }
        .ytwPdgGiftButtonButton:disabled { color: rgba(15,15,15,.3); }
        .ytSpecIconShapeHost { color: inherit; }
        .ytSpecIconShapeHost svg, .ytSpecIconShapeHost path { fill: currentColor; }
        #gift-catalog-icon { color: rgb(1,128,255); }
      </style>
      <div id="input-panel"><yt-live-chat-message-input-renderer>
        <div id="container"><div id="picker-buttons-container">
          <button id="fixture-composer-peer" aria-label="Emoji" style="background: transparent; border: 0">Emoji</button>
        <div id="jewels-gifts-button">
          <yt-pdg-gift-button class="ytwPdgGiftButtonHost">
            <button class="ytwPdgGiftButtonButton" aria-label="Gift" aria-haspopup="true">
              <span class="ytwPdgGiftButtonIcon"><span class="ytSpecIconShapeHost"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 8h16v12H4z" /></svg></span></span>
            </button>
          </yt-pdg-gift-button>
          <yt-pdg-gift-button class="ytwPdgGiftButtonHost">
            <button class="ytwPdgGiftButtonButton" aria-label="Disabled gift" disabled>
              <span class="ytwPdgGiftButtonIcon"><span class="ytSpecIconShapeHost"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 8h16v12H4z" /></svg></span></span>
            </button>
          </yt-pdg-gift-button>
        </div></div></div>
        <span id="gift-catalog-icon">Colored gift</span>
      </yt-live-chat-message-input-renderer></div>`
              : ''
      }
    </yt-live-chat-renderer>
    ${
      runtimeVideoId
        ? `<a id="fixture-sign-in" href="/signin?next=${encodeURIComponent(`/watch?v=${runtimeVideoId}`)}">Sign in</a>
    <script>window.__ylcFixtureChatRuntime = { videoId: '${runtimeVideoId}' };</script>`
        : ''
    }
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

const iframeSrc = (videoId: string, mode: 'live' | 'archive', continuationVideoId?: string) =>
  continuationVideoId
    ? `/${mode === 'archive' ? 'live_chat_replay' : 'live_chat'}?continuation=ylc-fixture-${continuationVideoId}`
    : mode === 'archive'
      ? `/live_chat_replay?v=${videoId}&continuation=ylc-fixture`
      : `/live_chat?v=${videoId}&fixture=native`

const renderNativeChat = (videoId: string, mode: 'live' | 'archive', native: NativeChatDefinition) => {
  if (native.state === 'absent') return ''
  const slotBefore = native.slot ? `<span id="${escapeHtml(native.slot.beforeId)}"></span>` : ''
  const slotAfter = native.slot ? `<span id="${escapeHtml(native.slot.afterId)}"></span>` : ''
  const hostVideoId = native.hostVideoId === false ? '' : ` video-id="${escapeHtml(videoId)}"`
  const href = `${iframeSrc(videoId, mode, native.continuationVideoId)}${native.state === 'unavailable' ? '&fixture-unavailable=1' : ''}`
  const src = native.navigateWithoutSrc ? '' : ` src="${escapeHtml(href)}"`
  return `
    <ytd-live-chat-frame${hostVideoId}>
      ${slotBefore}
      <iframe
        id="chatframe"
        class="ytd-live-chat-frame"
        ${native.inlineStyle ? `style="${escapeHtml(native.inlineStyle)}"` : ''}
        ${src}
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

const renderWatchBody = (state: YouTubeScenarioState) => {
  const isLive = state.video.mode === 'live'
  return `
    <ytd-watch-flexy video-id="${escapeHtml(state.video.id)}"${isLive ? ' is-live-now' : ''}></ytd-watch-flexy>
    <div
      id="movie_player"
      video-id="${escapeHtml(state.video.id)}"
      data-ylc-fixture-generation="0"
    >
      <button
        type="button"
        data-ylc-player-boundary-probe
        aria-label="Player boundary probe"
      >Player boundary probe</button>
      <div class="ytp-right-controls">
        <button type="button" class="ytp-button ytp-fullscreen-button" aria-label="Full screen">Full screen</button>
      </div>
    </div>
    ${renderChatContainer(state)}`
}

const renderWatchHtml = (state: YouTubeScenarioState, bodyHtml: string, nativeChatNavigationHref: string | null) => {
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
      [data-ylc-player-boundary-probe] { position: absolute; left: 24px; bottom: 24px; width: 160px; height: 40px; }
      ${dimensions}
    </style>
  </head>
  <body>
    ${bodyHtml}
    <script>
      ${scenarioDocumentInitializationScript({ videoId: state.video.id, isLive, nativeChatNavigationHref, generation: 0 })}
    </script>
  </body>
</html>`
}

const getScenarioUrl = (state: YouTubeScenarioState) => {
  const route = state.page.route ?? 'watch'
  if (route !== 'watch' && state.video.mode !== 'live') {
    throw new Error(`YouTube scenario route ${route} requires a live video.`)
  }
  if (route === 'direct-live') return `https://www.youtube.com/live/${encodeURIComponent(state.video.id)}`
  if (route === 'channel-live') return 'https://www.youtube.com/@ylc-fixture/live'
  return `https://www.youtube.com/watch?v=${encodeURIComponent(state.video.id)}`
}

export const compileYouTubeScenario = (state: YouTubeScenarioState): CompiledYouTubeScenario => {
  if (!VIDEO_ID_PATTERN.test(state.video.id)) {
    throw new Error(`Invalid YouTube scenario video ID: ${JSON.stringify(state.video.id)}`)
  }
  if (
    state.chat.mode !== 'none' &&
    state.chat.native.continuationVideoId !== undefined &&
    !VIDEO_ID_PATTERN.test(state.chat.native.continuationVideoId)
  ) {
    throw new Error(`Invalid YouTube scenario continuation video ID: ${JSON.stringify(state.chat.native.continuationVideoId)}`)
  }

  const chatRoutes =
    state.chat.mode === 'none'
      ? []
      : [
          {
            pattern: state.chat.mode === 'archive' ? '**/live_chat_replay?*' : '**/live_chat?*',
            body:
              state.chat.response === 'playable'
                ? playableChatHtml(
                    `${state.video.title} chat fixture`,
                    state.chat.native.continuationVideoId,
                    state.chat.mode === 'live' && state.chat.restrictedParticipation === true,
                    state.chat.mode === 'live' && state.chat.giftButton === true,
                    state.chat.mode === 'live' && state.chat.appearanceSurfaces === true,
                  )
                : unavailableChatHtml(),
          },
        ]
  if (state.chat.mode !== 'none' && state.chat.native.state === 'unavailable') {
    chatRoutes.push({
      pattern: `**/${state.chat.mode === 'archive' ? 'live_chat_replay' : 'live_chat'}?*fixture-unavailable=1`,
      body: unavailableChatHtml(),
    })
  }
  const bodyHtml = renderWatchBody(state)
  const isLive = state.video.mode === 'live'
  const nativeChatNavigationHref =
    state.chat.mode !== 'none' && state.chat.native.state === 'playable' && state.chat.native.navigateWithoutSrc
      ? iframeSrc(state.video.id, state.chat.mode, state.chat.native.continuationVideoId)
      : null

  return {
    watchUrl: getScenarioUrl(state),
    watchHtml: renderWatchHtml(state, bodyHtml, nativeChatNavigationHref),
    spaDocument: {
      title: state.video.title,
      bodyHtml,
      videoId: state.video.id,
      isLive,
      nativeChatNavigationHref,
    },
    chatRoutes,
  }
}
