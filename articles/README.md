# articles/

Zenn など外部プラットフォームに公開する日本語記事の下書きを置く。

拡張の使い方や開発手順は [ドキュメント一覧](../docs/README.md) を参照する。

| ファイル | 公開先 | 状態 |
| --- | --- | --- |
| `e2e-browser-extension-playwright.md` | Zenn | 下書き（frontmatter は `published: false`） |

## 公開前の確認

- 記事の内容は `yarn check` では検証しない。ストア掲載文に対する `yarn store:check` の対象にも含まれない。
- 公開前に、記事中の事実やリンクを確認する。拡張 ID、ユーザー数、`package.json` のスクリプト名、Playwright のプロジェクト名は、現在の公開情報やリポジトリと照合する。
- 確認を終えた記事を公開するときに、frontmatter を `published: true` に変える。
