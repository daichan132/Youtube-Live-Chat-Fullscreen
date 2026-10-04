# Storybook で設定 UI を確認する

Storybook は設定 UI の開発用プレビュー。実際のコンポーネントを、再現できる設定値とブラウザ API の mock で表示し、タブ切替、入力、保存状態を確認する。

## 起動とビルド

Node 24 と `package.json` の Yarn を使う。依存関係をまだ入れていない checkout では、先に `yarn install --immutable` を実行する。

```bash
yarn storybook
```

ターミナルに表示された URL を開き、サイドバーから確認する story を選ぶ。設定画面の見た目だけでなく、タブ切替、キーボード操作、入力、閉じて再表示したときの状態も確認する。

```bash
yarn storybook:build
```

静的プレビューはルートの `storybook-static/` に生成する。CI の `quality` job は `yarn verify` の後にこのビルドを行う。ビルド成功は story の読み込みと生成の確認であり、すべての操作を実行した結果ではない。

## コンポーネントと CSS の境界

Story はルートの `stories/`、設定は `.storybook/` に置く。`entrypoints/` や `shared/` に Storybook 専用コードを追加しない。

プレビューは本番の設定コンポーネントと CSS を import して使う。似た UI を story 内に作り直したり、本番と異なる utility や token を定義したりすると、実際の変更を確認できない。プレビューの枠や mock データは story 側で用意する。

Tailwind の story 用 class はプレビュー専用 CSS の `@source` で探索する。本番 CSS の探索範囲を Storybook のために広げない。静的出力を `public/` に置かない。

production output と Chrome/Firefox ZIP には `.storybook/`、`stories/`、`storybook-static/`、`*.stories.*` を含めない。Firefox source ZIP も同じ境界を守る。`scripts/verify/check-package-contracts.mjs` が混入を拒否する。WXT の source archive は明示的な include で選ぶため、`.gitignore` への追加だけを除外の根拠にしない。

## 設定値と storage の分離

各 story は専用の Jotai store と設定 fixture から開始する。設定 repository や extension API を使うコンポーネントには、story 内で完結する memory mock を渡す。実際の拡張の storage、ユーザーの設定、他の story が書いた値を読み書きしない。

保存済み、変更中、保存待ち、書き込み失敗などの状態は明示的な fixture で再現する。story を切り替えたり再表示したりするときは、状態と mock の呼び出し履歴を初期化する。コンポーネントを再利用するために本番の repository や storage 契約を簡略化しない。

## 実ブラウザ検証との関係

Storybook は設定 UI の状態と操作を確認する場所。YouTube の動画、native chat iframe、content runtime は実行しない。ライブ・アーカイブ・チャットなし、fullscreen の開始と終了、SPA 遷移、iframe replacement と返却は、[実ブラウザ検証](verification-browser.md)で確認する。

通常変更の最終ゲートは `yarn verify`。パッケージ境界を変更したときは、Storybook の静的出力が存在する状態でも `yarn test:package` と `yarn verify:firefox-source` を実行し、production ZIP と再構築可能な source ZIP の両方を確認する。
