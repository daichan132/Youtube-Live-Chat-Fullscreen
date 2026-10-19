# メンテナ向けドキュメント

ストア公開と実ブラウザ検証を行うメンテナ向けの手順。開発を始めるときは [Contributing](../../CONTRIBUTING.md)、利用方法は [ユーザーガイド](../user-guide.md) を参照する。

| 作業 | 読む資料 |
| --- | --- |
| 検証済みの候補を作り、ストアへ提出する | [リリース Runbook](release-runbook.md) |
| YouTube 上の動作と読み込んだビルドを確認する | [実ブラウザ検証](verification-browser.md) |
| runtime の予期しない失敗を調べる | [診断レポートの読み方](runtime-failure-diagnostics.md) |

## リリースと動作確認

候補の作成とストア提出は別の手動ワークフロー。候補作成では決定的な `yarn verify:release:ci` を実行し、ソースコミットと ZIP のサイズ・SHA-256 を記録する。実 YouTube の確認は独立させ、提出前に候補 ZIP の Chrome・Firefox 確認記録を必須にする。提出時はその記録と照合し、同じ ZIP を再ビルドせずに使う。

ライブ、リプレイ、チャットなし、全画面解除や SPA 遷移の実機確認は [実ブラウザ検証](verification-browser.md) に沿って記録する。現在の候補ワークフローには手動検証の申告入力はなく、記録を自動収集する仕組みもない。自動検証と実機で確認した範囲を分けて、リリースの記録に残す。

## ストア掲載文と画像

- [掲載文](../store-listing/) は各言語の原稿。`yarn store:check` が文字数・必須表記・URL・構成を検査する。このチェックは `yarn verify` に含まれ、`yarn check` には含まれない。
- [ストア更新のチェックリスト](../store-listing/asset-work-list.md) で、原稿・画像の準備から公開後の確認までをたどれる。
- [Chrome Web Store の画像資料](../store-assets/chrome-web-store/README.md) に、選択済みの画像6枚と元データ、撮影時の記録がある。画像の選択とストアでの公開状態は別に確認する。

公開ワークフローが提出するのは拡張 ZIP と Firefox のソース ZIP。ストアの掲載文や画像はダッシュボードで手動更新し、公開後に表示を確認する。

## GitHub の掲載内容

About、Topics、Social preview を更新するときは、README の製品説明と対応ブラウザに揃える。これらはビルドや公開ワークフローでは更新されない。利用者数や評価を載せる場合は、出典と確認日を記録する。画像は [選択済みのストア画像](../store-assets/chrome-web-store/README.md) を参照する。
