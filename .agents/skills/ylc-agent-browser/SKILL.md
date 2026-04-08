---
name: ylc-agent-browser
description: この拡張の web 上の動作確認・手動検証・表示崩れ調査を agent-browser で行うためのガイド。YouTube 上で live/archive/no-chat の挙動、フルスクリーン切替、overlay/switch/native chat/extension iframe の状態、DOM 移動、computed style、スクリーンショット、console/trace を確認するときはこの skill を使う。ブラウザで現物確認する作業では Playwright を使わない。Playwright は E2E テスト実行・追加・修正のときだけ `ylc-e2e-playwright` を使う。
---

# YLC Browser Validation with agent-browser

このリポジトリで実ブラウザを開いて確認するときの標準手順。汎用コマンドは `agent-browser` スキル、実行時契約は `fullscreen-chat-contracts` を参照する。

## Guardrails

1. **手動検証は agent-browser に寄せる**。DOM 確認、見た目確認、スクリーンショット、console/trace 採取のために Playwright を起動しない
2. **Playwright はテスト専用**。spec 作成、fixture 修正、trace/PWDEBUG、flake 調査のときだけ `ylc-e2e-playwright` / `chrome-extension-e2e-playwright` を使う
3. **毎回 build 済み extension を読む**。`.output/chrome-mv3/manifest.json` が前提。未生成なら先に `yarn build`
4. **headed で確認する**。YouTube の fullscreen・overlay・hover は `--headed` を基本にする
5. **音量は毎回 0 にしてから検証する**。YouTube を開いたら最初に player を mute し、`video.volume = 0` と `video.muted = true` を確認する
6. **fullscreen 進入は trusted click で行う**。`eval` から `element.click()` しても user activation にならず失敗することがある。`snapshot -i` で fullscreen button の ref を取り、`agent-browser click @ref` を使う
7. **シナリオごとに証跡を残す**。少なくとも URL、screenshot、必要なら console/trace を採取する

## Quick Start

```bash
agent-browser close --all
agent-browser --headed --extension .output/chrome-mv3 open "https://www.youtube.com/watch?v=<VIDEO_ID>"
agent-browser wait --load networkidle
cat <<'EOF' | agent-browser eval --stdin
(() => {
  const videos = Array.from(document.querySelectorAll('video'))
  for (const video of videos) {
    video.volume = 0
    video.muted = true
  }
  return videos.map((video) => ({
    volume: video.volume,
    muted: video.muted,
  }))
})()
EOF
agent-browser snapshot -i
# fullscreen が必要なら snapshot の ref を使って trusted click する
agent-browser click @e123
agent-browser snapshot -i
```

`--extension .output/chrome-mv3` は毎回付ける。既存セッションを使い回して挙動が怪しいときは `agent-browser close --all` でリセットする。

## Standard Workflow

1. `yarn build` 済みを確認する
2. `agent-browser --headed --extension .output/chrome-mv3 open <watch-url>` で対象ページを開く
3. `agent-browser wait --load networkidle` の直後に `video.volume = 0` と `video.muted = true` を設定し、音量が 0 になったことを確認する
4. `agent-browser snapshot -i` で初期状態を確認する
5. fullscreen が必要なら snapshot の ref を使って `agent-browser click @ref` で進入する
6. switch 操作、native chat 開閉など必要な操作を行う
7. `agent-browser screenshot`, `agent-browser console`, `agent-browser errors`, `agent-browser trace start/stop` で証跡を残す
8. DOM や style の確認が必要なら `agent-browser eval --stdin` で状態を採取する

## Scenario Checklist

### live

- switch が出るか
- extension iframe が `data-ylc-owned="true"` で作られるか
- native `#chatframe` に依存せず live chat を表示できるか

### archive

- switch が出るか
- native `#chatframe` または borrowed iframe が再生可能か
- `data-ylc-chat="true"` の iframe が stale URL を再利用していないか

### no-chat / replay-unavailable

- switch が出ないか
- overlay / extension iframe が生成されないか

## Common Selectors

- switch button: `#switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec button.ytp-button`
- shadow host: `#shadow-root-live-chat`
- native frame: `#chatframe`
- extension frame: `#shadow-root-live-chat iframe[data-ylc-chat="true"]`
- fullscreen chat container: `#chat-container`

## Evidence Collection

```bash
agent-browser screenshot ./tmp/ylc-before-toggle.png
agent-browser console
agent-browser errors
agent-browser trace start
# ... reproduce issue ...
agent-browser trace stop ./tmp/ylc-trace.zip
```

## DOM / Style Diagnostics

`fullscreen-chat-contracts` で見るべき境界を確認したうえで、次のスクリプトで状態を採取する。

```bash
cat <<'EOF' | agent-browser eval --stdin
(() => {
  const selectors = [
    '#chat-container',
    '#chatframe',
    '#shadow-root-live-chat',
    '#shadow-root-live-chat iframe[data-ylc-chat="true"]',
  ]

  return {
    url: window.location.href,
    fullscreen: document.fullscreenElement !== null,
    switchPressed:
      document
        .querySelector('#switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec button.ytp-button')
        ?.getAttribute('aria-pressed') ?? null,
    nodes: selectors.map((sel) => {
      const el = document.querySelector(sel)
      if (!el) return { sel, exists: false }
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      return {
        sel,
        exists: true,
        parentId: el.parentElement?.id ?? '',
        width: rect.width,
        height: rect.height,
        display: style.display,
        visibility: style.visibility,
        position: style.position,
      }
    }),
  }
})()
EOF
```

iframe の中身を見るときは snapshot で ref を取り、そのまま操作する。必要なら `agent-browser frame <ref>` で iframe にスコープする。

## Escalation Path

- spec を追加する、既存 E2E を直す、trace viewer でテスト失敗を追う: `ylc-e2e-playwright`
- 拡張ロードや MV3 Service Worker の Playwright fixture を触る: `chrome-extension-e2e-playwright`
- 実ブラウザで現物確認する: この skill
