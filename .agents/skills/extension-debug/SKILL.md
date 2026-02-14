---
name: extension-debug
description: Chrome/Firefox 拡張の挙動調査。content script / popup / service worker の不具合再現、フルスクリーン/ネイティブチャットのループ調査で使う。
metadata:
  short-description: 拡張ランタイム不具合を切り分け
---

# 目的
- 最短で再現し、症状を境界ごとに切り分けて根本原因を特定する。

# 入力（不足時のみ確認）
- 対象ブラウザ（Chrome/Firefox）
- 再現 URL と手順
- どの層で壊れるか（content/popup/background）

# 手順
1. 最新ビルドを作る。
- `yarn build`（Firefox は `yarn build:firefox`）
2. 再現手順を1回通し、壊れる地点を固定する。
3. その時点の状態を採取する。
- fullscreen 状態
- switch（存在有無 / `aria-pressed`）
- native iframe（`#chatframe` href/playable）
- extension iframe（`data-ylc-chat` / `data-ylc-owned` / `src`）
4. 境界にマッピングする。
- mode 判定
- source resolver
- toggle/overlay gating
- native auto-disable
5. 最小修正して検証する。
- `yarn lint`
- 必要な unit/e2e

# iframe スロットリング診断レシピ

フルスクリーン解除後に native chat の読み込みが遅い場合、以下の手順で原因を特定する。

## 1. Playwright で computed style を採取

```typescript
const getDiagnostics = () => {
  const elements = ['#secondary', '#chat-container', 'ytd-live-chat-frame', '#chatframe']
  return elements.map(sel => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) return { sel, exists: false }
    const style = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return {
      sel,
      exists: true,
      display: style.display,
      visibility: style.visibility,
      position: style.position,
      width: style.width,
      rectWidth: rect.width,
      rectHeight: rect.height,
      parentId: el.parentElement?.id ?? '',
    }
  })
}
```

## 2. チェックポイント

| タイミング | 何を見るか |
|-----------|-----------|
| フルスクリーン前 | `#chat-container` の `parentId` が `secondary-inner` であることを確認 |
| フルスクリーン中（switch 操作前） | `#chat-container` の `parentId` が `panels-full-bleed-container` に変わっているか確認 |
| フルスクリーン中（extension 有効） | `#chatframe` が存在するか、`rectWidth > 0` か確認 |
| フルスクリーン解除後 | `isNativeChatUsable()` が 2 秒以内に true になるか時系列で確認 |

## 3. 典型的な原因パターン

| 症状 | 原因 | 対処 |
|------|------|------|
| `#chatframe` の `rectWidth` が 0 | 祖先に `display: none` or `width: 0` | `visibility: hidden` + `position: fixed` + `width: 400px` に変更 |
| `#chatframe` が null | archive borrow で extension が iframe を移動済み | 正常。返却処理を確認 |
| `#chat-container` の `parentId` が想定外 | YouTube の DOM 再配置 | Playwright で実際の親を確認し、CSS ターゲットを修正 |
| 解除後 1s 付近でフリッカー | YouTube の DOM 再構成で一時的に非表示 | `#panels-full-bleed-container` の隠蔽方式を確認 |

## 4. 注意: YouTube の DOM 構造は変わりうる

YouTube はフルスクリーン時に `#chat-container` を `#secondary` から `#panels-full-bleed-container` に移動する。
この挙動は YouTube 側のアップデートで変わる可能性があるため、CSS の修正前には必ず Playwright で
実際の DOM 階層を確認すること。詳細は `fullscreen-chat-contracts` スキルを参照。

# ガードレール
- デバッグ中に大規模リファクタを混ぜない。
- permissions 変更は明示依頼がある場合のみ。

# 出力形式
- 再現手順
- 根本原因
- 変更概要
- 検証結果
