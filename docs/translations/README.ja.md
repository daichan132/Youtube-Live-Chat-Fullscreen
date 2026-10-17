<div align="center">
  <img src="../../public/icon/128.png" alt="YouTube Live Chat Fullscreen ロゴ" width="80" />
</div>

<h1 align="center">YouTube Live Chat Fullscreen</h1>

<p align="center">
  <strong>フルスクリーンでも、映像とチャットを一緒に。</strong><br />
  配信とチャットの反応を一緒に楽しめます。YouTube 本来のチャットを動画に重ねて、位置や大きさ、見た目を調整できます。
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

![風真いろはの配信に、入力欄と視聴者名のぼかしを含むチャットを重ねた画面](../store-assets/chrome-web-store/screenshots/02-default-chat.png)

*標準のチャットと入力欄を表示した例です。入力途中のメッセージは送信していません。画像では視聴者名などをぼかしています。配信映像：風真いろは / hololive。[出典とプライバシー処理](../store-assets/chrome-web-store/README.md#sources-and-privacy)。*

## 映像を見ながら会話にも参加

ボス戦もライブパフォーマンスも、フルスクリーンの映像とチャットを一緒に楽しめます。チャットリプレイが再生できるアーカイブなら、録画を見ながら当時の反応を追えます。

チャットには YouTube 本来の機能を使います。ライブ配信中はフルスクリーンのままチャットを読んだり投稿したりできます。ログイン、投稿、バッジ、Super Chat は YouTube のルールやチャンネルの参加条件に従います。

## 配信に合わせてレイアウトを選ぶ

見たい配信に合わせて配置や見た目を調整し、次回のために保存できます。

| やりたいこと | 調整できること |
| --- | --- |
| ゲーム画面や出演者を見やすくする | チャットをドラッグして移動し、辺や角からサイズを変更 |
| チャットの後ろの映像も見る | 背景色、透明度、ぼかしを調整 |
| 視聴する距離に合わせて読みやすくする | 文字サイズ、フォント、色、メッセージの間隔を変更 |
| メッセージに集中する | 通常メッセージのユーザー名やアイコンを非表示に |
| 操作ボタンが消えても反応を見続ける | チャットを常時表示し、必要なら「チャットのみ表示」に切り替え |
| 読み方に合わせて見た目を切り替える | 名前付きプリセットを保存。設定を JSON で書き出してバックアップや別のブラウザへの移行に使う |

![背景を完全に透過したチャットのみの表示で、視聴者の情報を保護したアーカイブの画面](../store-assets/chrome-web-store/screenshots/03-transparent-chat.png)

*背景を完全に透過し、チャットのみを表示したリプレイの例です。このアーカイブの画像には入力欄はありません。配信映像：CohhCarnage。[出典とプライバシー処理](../store-assets/chrome-web-store/README.md#sources-and-privacy)。*

ライト、ダーク、システム設定に合わせたテーマを選べます。UI は 55 ロケールに対応し、右から左に読む言語のレイアウトも備えています。[使い方](../user-guide.md)では、プリセットを使った設定例や操作方法を紹介しています（英語）。

## 使い始める

1. [Chrome ウェブストア](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd) または [Firefox アドオン](https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/) からインストールします。
2. YouTube のライブ配信、またはチャットリプレイを再生できるアーカイブを開き、フルスクリーンにします。チャット表示は初期状態で有効です。
3. パネルにポインターを重ねると操作ボタンが表示されます。移動ハンドルをドラッグして位置を変え、辺からサイズを変更できます。設定で見た目も調整できます。プレイヤーのチャットボタンで表示を切り替えられます。

デスクトップブラウザ向けの拡張機能です。Chrome 版は Opera でも動作します。利用できるチャットがない動画では、通常のフルスクリーンプレイヤーを表示します。

プリセットやバックアップの手順は[使い方](../user-guide.md)、パネルが表示されない場合は[トラブルシューティング](../troubleshooting.md)をご覧ください（どちらも英語）。

## プライバシー

拡張機能用のアカウントやアクセス解析 SDK、トラッキングサービスはありません。設定はこのブラウザの `browser.storage.local` に保存され、閲覧履歴やチャット本文を開発者へ送信しません。YouTube 本来のチャットは、引き続き YouTube と通信します。

配布版が要求する権限は `storage` のみです。ページ上で動くスクリプトや、ページから利用できる拡張機能のリソースは YouTube に限定しています。選択した追加フォントは Google Fonts から取得する場合があります。[権限とリソースの設定](../../config/packagePolicy.ts)と[パッケージの検証コード](../../scripts/verify/check-package-contracts.mjs)で、この範囲を確認できます。

## 実装を知る

WXT、React、TypeScript、Jotai、Tailwind CSS を使った Chrome / Firefox 向けの拡張機能です。映像とチャットを一緒に表示するため、次のような処理を実装しています。

- [YouTube のページ遷移に対応する](../architecture/content-runtime.md)：YouTube のチャット iframe を借り、動画の切り替えに合わせて表示を更新し、フルスクリーンを解除したら元に戻します。
- [見た目を編集中にプレビューする](../architecture/settings-and-state.md)：スライダーの操作をチャットに反映し、編集中の値や保存済みの設定、別の拡張画面からの変更を順序どおりに扱います。
- [ブラウザの動作をローカルで再現する](../testing/contracts.md)：同じ条件のテスト用 YouTube ページでライブ、リプレイ、チャットなしを再現し、実際の YouTube との互換性は別に確認します。

[技術概要](../engineering.md)から、それぞれの動作に対応するコードをたどれます。[コントリビューションガイド](../../CONTRIBUTING.md)には、変更する場所を選ぶ前に試せる小さな実行例があります（どちらも英語）。

## 改善に参加する

視聴中に困ったことの報告、翻訳、説明の改善、小さな修正から参加できます。拡張機能の内部をすべて理解していなくても大丈夫です。[貢献の始め方](../../CONTRIBUTING.md#choose-a-starting-point)から、取り組みやすいものを選べます（英語）。

- [不具合を報告する](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml)、または[機能を提案する](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=feature.yml)。
- 脆弱性は [SECURITY.md](../../SECURITY.md) の非公開の手順で報告してください。

[GPL-3.0](../../LICENSE) ライセンスで公開しています。
