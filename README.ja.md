<div align="center">
  <img src="public/icon/128.png" alt="YouTube Live Chat Fullscreen ロゴ" width="80" />
</div>
<br>
<h1 align="center">YouTube Live Chat Fullscreen</h1>
<p align="center">
  <a href="README.md">English (US)</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.zh-TW.md">繁體中文 (台灣)</a>
</p>
<p align="center">
  <a target="_blank" href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img alt="Chrome Web Store Rating" src="https://img.shields.io/chrome-web-store/rating/dlnjcbkmomenmieechnmgglgcljhoepd?style=social&logo=googlechrome"/>
  </a>
  <a target="_blank" href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img alt="Chrome Web Store Users" src="https://img.shields.io/chrome-web-store/users/dlnjcbkmomenmieechnmgglgcljhoepd?style=social&logo=googlechrome"/>
  </a>
  <a target="_blank" href="https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Add-ons Rating" src="https://img.shields.io/amo/rating/youtube-live-chat-fullscreen?style=social&logo=firefox"/>
  </a>
  <a target="_blank" href="https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Add-ons Users" src="https://img.shields.io/amo/users/youtube-live-chat-fullscreen?style=social&logo=firefox"/>
  </a>
  <a target="_blank" href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/daichan132/Youtube-Live-Chat-Fullscreen?style=social"/>
  </a>
</p>

<p align="center">
  YouTube Live を全画面のまま、レイアウトを崩さずチャットできます。
</p>
<p align="center">
  <a target="_blank" href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd"><strong>Chrome に追加</strong></a> ·
  <a target="_blank" href="https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/"><strong>Firefox に追加</strong></a> ·
  <a target="_blank" href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen"><strong>GitHubでStarする</strong></a>
</p>

## この拡張が選ばれる理由
- フルスクリーン視聴を維持したまま、チャットの閲覧と投稿ができます。
- チャットの位置とサイズを自由に調整でき、ゲームHUDや字幕と干渉しにくくできます。
- 背景色・文字色・フォント・ぼかし・余白など、可読性を細かく調整できます。
- プリセットを使って、視聴シーンごとに設定をすぐ切り替えられます。
- ライブ配信と、チャットリプレイ付きアーカイブの両方に対応します。

## 30秒クイックスタート
1. [Chrome ウェブストア](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd) または [Firefox アドオン](https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/) から導入します。
2. YouTube のライブ配信、またはチャットリプレイ付きアーカイブ動画を開きます。
3. フルスクリーンにして、右下のスイッチからチャット表示を切り替えます。
4. オーバーレイをドラッグ/リサイズし、設定で見た目を調整します。

## 配信タイプごとの挙動
| 動画状態 | 拡張が使うチャットソース | スイッチ / オーバーレイ |
| --- | --- | --- |
| ライブ配信 | 公開 `live_chat?v=<videoId>` | 表示される |
| リプレイ可能なアーカイブ | native `live_chat_replay` iframe | リプレイが再生可能な時のみ表示 |
| チャットなし / リプレイ不可 | なし | 表示されない |

## プレビュー
![Preview](./.github/preview.png)

## 主な機能
- フルスクリーン中のチャット投稿（Super Chat 投稿フローを含む）。
- オーバーレイのドラッグ、リサイズ、位置調整。
- 見た目調整: 背景色、文字色、フォント、文字サイズ、ぼかし、余白。
- 表示切替: ユーザー名、ユーザーアイコン、Super Chatバー、チャットのみ表示。
- プリセット管理によるスタイル切替。
- 多言語対応。

## ダウンロード
- [Chrome ウェブストア](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd)
- [Firefox アドオン](https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/)

## 開発者向けセットアップ
### 必須環境
- **[Node.js](https://nodejs.org)** (v22.x)
- **[Yarn](https://yarnpkg.com)**（Corepack経由を推奨）

### インストール
```bash
git clone https://github.com/daichan132/Youtube-Live-Chat-Fullscreen.git
cd Youtube-Live-Chat-Fullscreen
corepack enable
yarn install
```

### 主要コマンド
- `yarn dev`: 開発サーバーを起動
- `yarn dev:firefox`: Firefox 用の開発サーバーを起動
- `yarn build`: 本番ビルドを作成
- `yarn build:firefox`: Firefox 向けにビルド
- `yarn zip`: Zip パッケージを作成
- `yarn zip:firefox`: Firefox 向け Zip パッケージを作成
- `yarn lint`: Biomeチェック + TypeScript型検査
- `yarn test:unit`: ユニットテストを実行
- `yarn storybook`: Storybook を起動
- `yarn storybook:build`: Storybook を静的ビルド
- `yarn e2e`: E2E テストを実行

Storybook では `Catalog/CurrentUIDesigns` を開くと、現状UIを一括確認できます。

## 品質チェック
Pull Request前は次を実行してください。

```bash
yarn lint
yarn test:unit
yarn build
```

Firefox 互換に関係する変更では、次も実行してください。

```bash
yarn build:firefox
```

## プロジェクト概要
この拡張機能は、YouTubeページ上の content script でフルスクリーンチャット挙動を制御します。popup 側の設定（言語・ON/OFF・テーマ）は content 側と同期されます。

![System](./.github/system_overview.drawio.png)

## 貢献
アイデア、バグ報告、改善提案を歓迎します。

- Issue / Pull Request を作成してください。
- フルスクリーンチャットのソース判定を変更する場合は、まず `docs/architecture/live-archive-boundary.md` を確認してください。

## サポート
この拡張が役に立ったら、GitHub Star が継続開発の後押しになります。

- [GitHubでStarする](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen)
- [Ko-fiで支援する](https://ko-fi.com/D1D01A39U6)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/D1D01A39U6)

## ライセンス
GPL-3.0 ライセンス。詳細は [LICENSE](LICENSE) を参照してください。

## 翻訳
- English (US): `README.md`
- 日本語: `README.ja.md`
- 繁體中文 (台灣): `README.zh-TW.md`

他言語の翻訳コントリビュートも歓迎です。ファイル名は `README.<locale>.md` 形式で追加してください。
