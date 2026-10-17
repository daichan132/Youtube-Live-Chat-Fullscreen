<div align="center">
  <img src="../../public/icon/128.png" alt="YouTube Live Chat Fullscreen ロゴ" width="80" />
</div>

<h1 align="center">YouTube Live Chat Fullscreen</h1>

<p align="center">
  <strong>フルスクリーンでも、映像とチャットを一緒に。</strong><br />
  YouTube のチャットを映像に重ねて表示。位置やサイズ、見た目を好みに合わせて調整できます。
</p>

<p align="center">
  Chrome / Firefox 対応、ライブとリプレイ、55 ロケール、無料、オープンソース
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd"><strong>Chrome にインストール</strong></a>
  ·
  <a href="https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/"><strong>Firefox にインストール</strong></a>
  ·
  <a href="../user-guide.md">使い方（英語）</a>
  ·
  <a href="../../README.md">English</a>
  ·
  <strong>日本語</strong>
  ·
  <a href="README.zh-TW.md">繁體中文</a>
</p>

![YouTube のフルスクリーン映像に、右上の小さなチャットパネルを重ねた画面](../../.github/screenshots/fullscreen-chat-overview.png)

*透明な背景で、通常メッセージのユーザー名を非表示にしたレイアウト例です。配信に合わせて色、文字サイズ、位置を選べます。*

## 映像を見ながら会話にも参加

コンサートを見たり、ゲーム配信を追ったり、アーカイブを見返したりするときも、チャットの反応を一緒に楽しめます。オーバーレイには YouTube 本来のチャットを使うため、ライブチャットへのログイン、投稿、バッジ、Super Chat は引き続き YouTube が扱います。

| 映像のための余白をつくる | チャットを読みやすくする |
| --- | --- |
| パネルをドラッグして、映像に重なりにくい場所へ移動 | 文字サイズ、フォント、色、メッセージの間隔を調整 |
| 辺や角をドラッグしてサイズを変更 | 背景の透明度とぼかしを選択 |
| プレイヤーの操作ボタンが消えてもチャットを表示 | 通常メッセージのユーザー名やアイコンを非表示に |
| 「チャットのみ表示」でコンパクトなレイアウトに | 名前付きプリセットを保存して、見た目を切り替え |

ライト、ダーク、システム設定に合わせたテーマを選べます。UI は 55 ロケールに対応し、右から左に読む言語のレイアウトも備えています。設定は JSON で書き出してバックアップしたり、別のブラウザへ移したりできます。

## 使い始める

1. [Chrome ウェブストア](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd) または [Firefox アドオン](https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/) からインストールします。
2. YouTube のライブ配信、またはチャットリプレイを再生できるアーカイブを開き、フルスクリーンにします。チャット表示は初期状態で有効です。
3. パネルにポインターを重ねると操作ボタンが表示されます。ドラッグで移動、辺からサイズ変更、設定から見た目の調整ができます。プレイヤーのチャットボタンで表示を切り替えられます。

デスクトップブラウザ向けの拡張機能です。Chrome 版は Opera でも動作します。利用できるチャットがない動画では、通常のフルスクリーンプレイヤーを表示します。

プリセットやバックアップの手順は[使い方](../user-guide.md)、パネルが表示されない場合は[トラブルシューティング](../troubleshooting.md)をご覧ください（どちらも英語）。

## プライバシー

拡張機能用のアカウントやアクセス解析 SDK、トラッキングサービスはありません。設定はこのブラウザの `browser.storage.local` に保存され、閲覧履歴やチャット本文を開発者へ送信しません。YouTube 本来のチャットは、引き続き YouTube と通信します。

配布版が要求する権限は `storage` のみです。ページ上で動くスクリプトや、ページから利用できる拡張機能のリソースは YouTube に限定しています。選択した追加フォントは Google Fonts から取得する場合があります。[権限とリソースの設定](../../config/packagePolicy.ts)と[パッケージの検証コード](../../scripts/verify/check-package-contracts.mjs)で、この範囲を確認できます。

## 改善に参加する

不具合報告、翻訳、ドキュメントの改善、小さな修正を歓迎します。開発環境の準備や変更後の検証は[コントリビューションガイド](../../CONTRIBUTING.md)、コードの構成は[技術概要](../engineering.md)にまとめています（どちらも英語）。

- [不具合を報告する](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml)、または[機能を提案する](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=feature.yml)。
- 脆弱性は [SECURITY.md](../../SECURITY.md) の非公開の手順で報告してください。

[GPL-3.0](../../LICENSE) ライセンスで公開しています。
