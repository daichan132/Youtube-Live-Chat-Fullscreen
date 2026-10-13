# リポジトリの見せ方

GitHub の About・Topics・Social preview を [README](../../README.md) と揃えるための設定案。ここに書いた値は GitHub で適用する候補であり、現在の設定を示すものではない。適用するときはリポジトリの表示と設定画面を確認する。

設定は拡張のビルドや公開ワークフローに含まれない。この文書を更新しても GitHub 側には自動反映されない。

## About

```text
Keep YouTube live chat in fullscreen. A draggable, resizable chat overlay for Chrome and Firefox, with local settings and no tracking.
```

homepage は現在運用しているプロダクトサイトを確認して設定する。説明には利用場面と対応ブラウザを入れ、README の導入と意味を揃える。

利用者数や評価を掲載する場合は、出典と確認日を記録する。以前の「20K+ viewers」や過去の GitHub 設定確認を、現在の値として再利用しない。

## Topics

利用者が探す語と、実装を知りたい開発者が探す語を選ぶ。

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
```

新しい技術名や対応プラットフォームを追加するときは、実装や配布先で確認できるものに限る。

## Social preview

既存の [`.github/social-preview.png`](../../.github/social-preview.png) は 1280×640 の参考資産。登録前に全体と小さく表示した状態を確認する。現在の画像には「20K+ viewers」が含まれるため、そのまま現在の指標として使わず、数字の根拠を確認するか表記を更新する。

画像では実際の動画とチャットの重なりが一目で分かるようにする。製品名、Chrome と Firefox への対応、オープンソースであることを README と揃え、実装と異なる UI や未確認の人数を追加しない。

## 更新後の確認

About、Topics、Social preview は、設定画面に保存したあとリポジトリの表示でも確認する。リンク先が意図したストアやサイトに到達するか、画像が小さい表示でも読めるか、README と説明が食い違わないかを確認し、変更日と適用した値を作業記録に残す。

## 反応の記録

分析 SDK は追加せず、GitHub Traffic を同じ曜日に記録する。

- 新規 star 数とユニークビジター数
- 参照元サイト
- ストアの評価と直近レビューの傾向

説明を変える前後で期間と指標を揃える。star 数と訪問者数だけで改善の原因を断定せず、参照元やレビューと合わせて、次に見直す説明や導線を判断する。
