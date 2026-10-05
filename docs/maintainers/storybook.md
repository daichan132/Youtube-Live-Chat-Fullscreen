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

静的プレビューはルートの `storybook-static/` に生成する。CI の `quality` job は `yarn verify` の後に `yarn storybook:check` とこのビルドを行う。ビルド成功は story の読み込みと生成の確認であり、すべての操作を実行した結果ではない。

## カスタム CSS の12状態

カスタム CSS タブでは textarea が常に表示され、初回は空欄から始まる。本文の使用と名前付き保存は入力欄の近くにあり、保存済みの行から読み込み、使用、削除を行える。おすすめスタイルの selector は補助的な入力元として確認する。

`stories/CustomCss.stories.tsx` は次の12状態を用意している。各 story の `play` が実際のボタンや入力欄を操作するため、表示後に操作結果と assertion の成否を確認する。テーマと言語の toolbar からライト、ダーク、システム設定と日本語、English、RTL のアラビア語を選べる。

| Story | 確認する操作と状態 |
| --- | --- |
| `Initial` | 空の textarea と、空欄では無効な使用ボタン |
| `SavedStyles` | 保存済みの行から本文を読み込む |
| `Editing` | 常設の textarea に CSS を貼り付ける |
| `Paused` | 使用中の CSS をオフにし、本文を残して再開できる状態 |
| `NamedCopy` | おすすめを読み込み、名前付き保存のフォームを開く |
| `SaveFailure` | 使用時の保存失敗を表示し、本文を保持する |
| `ReplaceDraftConfirmation` | 未反映の編集を別のおすすめへ置き換える前の確認 |
| `CloseConfirmation` | 未反映の編集を残したまま設定を閉じる前の確認 |
| `NarrowSelection` | 360px 幅で保存済み一覧と入力欄を表示する |
| `NarrowEditing` | 320px 幅で CSS を入力する |
| `LibraryRoundTrip` | 貼り付けた本文を保存し、閉じて再表示した後に使う |
| `ChatLayouts` | メッセンジャー、名前ヘッダー付きカード、タイムラインを順に読み込み、使用する |

`LibraryRoundTrip` は CSS の貼り付け、名前付き保存、設定を閉じて下書きを破棄、再表示、保存済みの行から使用、使用中の表示と textarea の本文確認を順に行う。保存は新しいコピーの追加であり、読み込んだコピーを編集したり使用したりしても登録済みの本文は変わらない。同名による上書きは行わない。

おすすめは既存6種と新しい配置3種の合計9種。`ChatLayouts` は新3種を selector で読み込み、textarea の本文、説明、使用後の状態を確認する。ここで確認する使用中の表示は memory fixture の設定状態であり、YouTube のコメント配置を実際に変更した結果ではない。

別の `stories/ChatCssPresets.stories.tsx` は「設定/おすすめCSS」に `Comparison` の1状態を用意している。メッセンジャー、名前ヘッダー付きカード、タイムラインの固定の例を並べ、名前、本文、アバターの配置を比較できる。`play` は3種の見出しと各3件の例が表示されることを確認する。例には読み込んだCSS、style node、iframe、scriptを実行させず、本番の `ChatCssExample` を使う。

Escape は確認画面や名前フォームを内側から閉じ、その後は設定全体の close guard に従う。textarea を閉じる操作として扱わない。タブ切替、Undo/IME、名前付き保存、設定の再表示と合わせて手動でも確認する。

## コンポーネントと CSS の境界

Story はルートの `stories/`、設定は `.storybook/` に置く。`entrypoints/` や `shared/` に Storybook 専用コードを追加しない。

プレビューは本番の設定コンポーネントと CSS を import して使う。似た UI を story 内に作り直したり、本番と異なる utility や token を定義したりすると、実際の変更を確認できない。プレビューの枠や mock データは story 側で用意する。

Tailwind の story 用 class はプレビュー専用 CSS の `@source` で探索する。本番 CSS の探索範囲を Storybook のために広げない。静的出力を `public/` に置かない。

production output と Chrome/Firefox ZIP には `.storybook/`、`stories/`、`storybook-static/`、`*.stories.*` を含めない。Firefox source ZIP も同じ境界を守る。`scripts/verify/check-package-contracts.mjs` が混入を拒否する。WXT の source archive は明示的な include で選ぶため、`.gitignore` への追加だけを除外の根拠にしない。

## 設定値と storage の分離

各 story は専用の Jotai store と設定 fixture から開始する。本番のコンポーネント、atoms、`createCustomCssActions` を使い、repository の書き込みだけを story 内で完結する memory fixture へ置き換える。実際の拡張の storage、ユーザーの設定、他の story が書いた値を読み書きしない。

同じ story の中で設定を閉じて再表示しても、memory fixture に保存したコピーは残る。`LibraryRoundTrip` が確認するのはこの設定画面の往復であり、ブラウザの再読み込みを越える永続化ではない。別の story を開く、story を再マウントする、ページを再読み込みする場合は fixture から開始する。テーマや保存待ち時間の変更は、その story の draft を保持する。

保存待ちと書き込み失敗は Controls で再現する。実アプリでは既存 repository が extension storage の書き込み、readback、外部更新、retry を処理するため、その永続化と別ウィンドウ間の同期は repository のテストと拡張を読み込んだ実ブラウザで確認する。Storybook の memory fixture を根拠に本番の storage 契約を変更しない。CSS の上限、backup schema、Off/Resume の guard は本番と同じ仕様を保つ。

## 実ブラウザ検証との関係

Storybook は設定 UI の状態と操作を確認する場所。YouTube の動画、native chat iframe、content runtime は実行しない。ライブ・アーカイブ・チャットなし、fullscreen の開始と終了、SPA 遷移、iframe replacement と返却は、[実ブラウザ検証](verification-browser.md)で確認する。

おすすめ3種の実CSSについては、`overlayInteraction.fixture.spec.ts` が testing extension の設定から読み込み、使用ボタンを押して実際のチャットiframeへ適用する。代表的な通常コメントのDOMで、名前と本文の上下配置、paid messageや投稿欄への非干渉、managed liveからborrowed replayへの切替、fullscreen終了時の除去と再入場時の再適用を確認する。固定の例と実CSSは別々の検証対象として扱い、現在のYouTubeへの互換性は実チャットで確認する。

通常変更の最終ゲートは `yarn verify`。パッケージ境界を変更したときは、Storybook の静的出力が存在する状態でも `yarn test:package` と `yarn verify:firefox-source` を実行し、production ZIP と再構築可能な source ZIP の両方を確認する。
