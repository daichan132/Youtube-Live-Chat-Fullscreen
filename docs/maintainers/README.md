# メンテナ向けドキュメント

リポジトリの管理者だけが実行する手順。コントリビューターが読む必要はない。公開ドキュメント（[`../README.md`](../README.md) 以下）が英語なのに対して、ここは自分の運用手順なので日本語で書く。

| ドキュメント | 内容 |
| --- | --- |
| [リリース Runbook](release-runbook.md) | リリース候補の作り方、ストアへの昇格、canary が degraded / unavailable のときの判断 |
| [実ブラウザ検証](verification-browser.md) | 実 Chrome / Opera を YouTube に向けて動かし、リリースが要求する証拠を作る手順 |
| [リポジトリの見せ方](repository-presentation.md) | GitHub の About・Topics・Social preview をプロダクトの位置づけに揃える |

## この 2 つは対で使う

リリース候補ワークフローは Chrome・Firefox・Opera を実 YouTube 上で検証したという申告を必須入力として要求し、20 文字未満の文字列を拒否する。その証拠を作る手順が [実ブラウザ検証](verification-browser.md)、貼り先の説明が [リリース Runbook](release-runbook.md) の手順 4 と 5。

## ストア関連

- [`../store-listing/`](../store-listing/) — 55 言語の掲載文。`yarn check` の中の `yarn store:check` が文字数・必須トークン・必須 URL・ブロック数を検査する。
- [`../store-listing/asset-work-list.md`](../store-listing/asset-work-list.md) — スクリーンショットと promo タイルのバックログ。
- [`../store-assets/concepts/`](../store-assets/concepts/) — ストア画像のコンセプト案 100 件。

掲載文はリリースパイプラインに乗っていない。ZIP だけが自動で提出され、ダッシュボードのテキストとスクリーンショットは手作業のまま残る。
