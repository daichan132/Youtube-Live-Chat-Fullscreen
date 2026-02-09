# Fullscreen Chat Regression Postmortem (2026-02-09)

## Summary
- 対象コミット:
  - `47c8a0a` `fix(content): stabilize fullscreen overlay visibility and iframe transition`
  - `99fe2c5` `fix(content): treat expanded native chat as actually open state`
  - `7e3dc77` `test(e2e): align fullscreen chat specs with runtime preconditions`
- これら3コミットはすでにリバート済み:
  - `7336d7e`, `095a295`, `a95409f`
- 主要な失敗は「runtime挙動の仕様ズレ」と「E2Eの判定をskip寄りにしすぎて回帰を見逃したこと」。

## Impact
- fullscreen中に拡張チャットが出るべき場面で出ない、または状態遷移が不安定になるリスクが上がった。
- E2E結果が `skip` 中心になり、壊れているケースを `failed` として検知できなくなった。
- 実際に `yarn e2e` で `failed=0` でも `skipped` が多数となり、品質シグナルが弱くなった。

## What Went Wrong

### 1) Overlay表示条件を強くしすぎて仕様を壊した
- `47c8a0a` で `shouldShowOverlay` を導入し、`isNativeChatCurrentlyOpen` のときは常に overlay 非表示にした。
- 変更前は fullscreenパスで `native open` を直接ブロックしていなかったが、変更後は fullscreen/通常表示の両方で一律ブロックになった。
- その結果、「native stateがopen判定のまま残るケース」で overlay が抑止され続ける回帰を引き起こした。

### 2) native chat open判定の意味が曖昧なままゲートに使った
- `isNativeChatCurrentlyOpen = isNativeChatUsable || isNativeChatExpanded` を overlayゲートの一次判定に使った。
- `isNativeChatExpanded` は YouTube属性ベースで変動し、UIの実表示状態やユーザー意図と乖離することがある。
- `99fe2c5` で `isNativeChatExpanded` の定義を `isNativeChatOpen()` に寄せたが、根本の「native openなら常にoverlay禁止」という方針自体が強すぎたため、破綻を解消しきれなかった。

### 3) E2Eで「前提未成立」の範囲を広げすぎた
- `7e3dc77` で archive/live系specに skip分岐を大量導入した。
- 本来は「動画自体の外部前提不足」のみ skip にすべきところ、アプリ不具合由来の状態も precondition failure として skip し得る設計になった。
- これにより回帰が `failed` ではなく `skipped` に吸収され、CIシグナルが劣化した。

### 4) 検証の完了条件を実質緩めてしまった
- `failed=0` のみを重視し、`skip` の質(何を理由に skip したか)の精査が不足した。
- 結果として「失敗していないが、重要シナリオが実行されていない」状態を許容してしまった。

### 5) ユーザー報告症状との対応: 「開いた直後に強制的に閉じる」
- 該当箇所は `useNativeChatAutoDisable`。
- `nativeChatOpen` が `false -> true` に遷移したとき、`isFullscreen` が `false` 判定だと `setYTDLiveChat(false)` が走る。
- fullscreen遷移直後は `nativeChatOpen` の更新と `isFullscreen` 状態更新のタイミングがズレる可能性があり、短時間の誤判定で自動OFFが発火し得る。
- 実際にこの条件分岐は現在も `isFullscreen` のReact state値に依存しており、DOMの `document.fullscreenElement` を併用したガードになっていない。

## Why It Was Not Caught Earlier
- Runtime修正とE2E修正を同時期に進め、テストの期待値変更がruntime回帰を隠した。
- E2Eのskip理由が「外部要因」か「実装修正の副作用」かを厳密に区別できていなかった。
- overlay表示ロジックに対するシナリオ単位のユニットテストが不足していた。

## Corrective Actions (for next attempt)

### A. Runtime設計
- overlay可視条件を分解する:
  - `source attachability`
  - `user intent (toggle state)`
  - `native chat visibility/ownership state`
- 「native openなら常時禁止」のような単純ルールを避け、fullscreen時は特に source ownership を重視する。

### B. 判定ロジックの厳密化
- `native usable` / `native expanded` / `native open` の意味を定義し、用途を分離する。
- ゲート条件は「UI表示状態」と「チャットsource状態」を混ぜずに判定する。

### C. E2Eポリシー
- skipは「動画前提不足」のみに限定する。
- アプリ状態由来(スイッチONなのにiframe未生成など)はfailに残す。
- skip理由を定型化し、CIで件数と理由を監視する。

### D. 検証基準
- `failed=0` だけでなく、主要シナリオの `executed count` もDoDに含める。
- 重要specがskipされたら「合格」ではなく「要再評価」とする運用に変える。

## Closing Note
- 今回の本質は「バグ修正」よりも「仕様境界の扱い」と「テストの真偽判定設計」の問題だった。
- したがって次回は、まず仕様の境界条件を固定してから runtime を直し、その後 E2E は fail/skip境界を最小変更で合わせる。

---

## Follow-up Learnings (2026-02-09, NoChat/Archive pass)

### 1) `switch disabled` を `source ready` に直結すると archive で deadlock する
- 起きたこと:
  - archive で「source未解決中は switch disabled」にすると、ユーザーが ON にできず native chat を開くトリガーが走らない。
  - その結果 `resolveArchiveSource()` が永遠に `null` のままになり、開けないまま固定される。
- 学んだこと:
  - switch 有効判定と overlay 表示判定は分離する必要がある。
  - 実装上は `canToggleFullscreenChat`（操作可否）と `hasFullscreenChatSource`（表示可否）を分けるのが安全。

### 2) archive fallback 判定は「チャット系UI」のみに限定する
- 起きたこと:
  - player control の汎用 selector を広く取りすぎると、NoChat動画でも誤って switch enabled になる。
- 学んだこと:
  - fallback 判定は `aria-label/title` の chat 文言を必須化する。
  - 「ボタンがある」ではなく「チャットを開くボタンがある」を判定する。

### 3) live は `isLiveNow` fail-open を使わない
- 起きたこと:
  - `isLiveNow` だけで source を許可すると、チャット無効ライブでも ON できてしまう。
- 学んだこと:
  - live source 解決は `hasLiveChatSignals()` を基準に統一する。
  - `isLiveNow` は mode 判定の補助に留め、source 判定には使わない。

### 4) E2Eは「前提不成立」と「不具合」を分けるが、待機には必ず timeout を付ける
- 起きたこと:
  - `waitForFunction` の timeout 未指定で spec timeout までハングし、原因切り分けが難しくなった。
- 学んだこと:
  - すべての `waitForFunction/expect.poll` に短めの個別 timeout を付ける。
  - 前提不成立は `skip`、前提成立後の崩れは `fail` の境界を明示して維持する。

### 5) NoChat spec は URL drift を考慮して precondition を明示する
- 起きたこと:
  - 固定URLが将来チャット有効化されると、NoChat想定の assert が偽陽性で落ちる。
- 学んだこと:
  - NoChat spec では「本当に no-chat 前提か」を実行時に確認し、前提不成立は `skip` に倒す。
  - `disabled expected` を即断定せず、収束待ち + 前提チェックで安定化する。
