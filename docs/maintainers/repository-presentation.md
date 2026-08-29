# リポジトリの見せ方

GitHub リポジトリの設定を、`README.md` のプロダクト位置づけに揃えておくための控え。ここに書いた値は **GitHub の設定画面で手作業で適用するもの**で、拡張のビルドは一切関与しない。`docs/store-listing/` と違って検査スクリプトもないので、ずれても誰も教えてくれない。

> 現状（2026-08-27 時点）: About の説明と Topics は下記の内容がまだ適用されていない。homepage だけが一致している。

## About

```text
Open-source Chrome & Firefox extension that restores YouTube Live chat in fullscreen. Draggable, privacy-first, and used by 20K+ viewers.
```

homepage は既存のプロダクトサイトのまま。

## Topics

プロダクト側の発見語とエンジニアリング側の発見語を混ぜる。

```text
youtube
youtube-live
youtube-chat
live-chat
livestream
browser-extension
webextension
chrome-extension
firefox-extension
wxt
react
typescript
playwright
manifest-v3
vtuber
chat-overlay
privacy-first
```

## Social preview

[`.github/social-preview.png`](../../.github/social-preview.png)（1280×640）を Social Preview として登録する。

この画像で伝えたいこと:

- フルスクリーンのチャットがプロダクトそのものであること
- オーバーレイが実際の映像の上に載っていること
- 2 万人以上が使っていること
- Chrome と Firefox に対応していること
- オープンソースで、トラッキングをしないこと

## 計測

分析 SDK を新しく入れない。GitHub Traffic を週 1 回、同じ曜日に記録する。

- 新規 star 数
- ユニークビジター数
- star ÷ ユニークビジター
- 参照元サイト
- ストアの評価と直近レビューの傾向

外部での宣伝を増やす前に、リポジトリの転換率を先に評価する。ビジターが増えて star が増えないなら、最初の画面の説明を直す。転換率が健全でビジターが伸びないなら、技術記事とコミュニティでの露出を増やす。
