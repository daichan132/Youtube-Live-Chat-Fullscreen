# メンテナ向けドキュメント

ストア公開、実ブラウザ検証、GitHub 上の掲載内容を管理するための手順。開発を始めるときは [Contributing](../../CONTRIBUTING.md)、利用方法は [ユーザーガイド](../user-guide.md) を参照する。公開の開発ドキュメントは英語、メンテナの運用手順は日本語で記載している。

| 作業 | 読む資料 |
| --- | --- |
| 検証済みの候補を作り、ストアへ提出する | [リリース Runbook](release-runbook.md) |
| YouTube 上の動作と読み込んだビルドを確認する | [実ブラウザ検証](verification-browser.md) |
| GitHub の About・Topics・Social preview を整える | [リポジトリの見せ方](repository-presentation.md) |

## リリースと動作確認

候補の作成とストア提出は別の手動ワークフロー。候補作成では `yarn verify:release` を実行し、ソースコミットと ZIP のサイズ・SHA-256 を記録する。提出時はその記録と照合し、同じ ZIP を再ビルドせずに使う。

ライブ、リプレイ、チャットなし、全画面解除や SPA 遷移の実機確認は [実ブラウザ検証](verification-browser.md) に沿って記録する。現在の候補ワークフローには手動検証の申告入力はなく、記録を自動収集する仕組みもない。自動検証と実機で確認した範囲を分けて、リリースの記録に残す。

## ストア掲載文と画像

- [掲載文](../store-listing/) は各言語の原稿。`yarn store:check` が文字数・必須表記・URL・構成を検査する。このチェックは `yarn verify` に含まれ、`yarn check` には含まれない。
- [画像の作業リスト](../store-listing/asset-work-list.md) はスクリーンショットと promo タイルのバックログ。
- [画像コンセプト](../store-assets/concepts/) は検討用の参考資産。

公開ワークフローが提出するのは拡張 ZIP と Firefox のソース ZIP。ストアの掲載文や画像はダッシュボードで手動更新し、公開後に表示を確認する。
