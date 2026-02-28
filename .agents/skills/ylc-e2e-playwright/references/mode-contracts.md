# Mode Contracts Reference

---

## 4 モード概要

| モード | Native iframe | Switch | 拡張 iframe | `data-ylc-owned` |
|--------|--------------|--------|------------|-----------------|
| **live** | `live_chat?v=<id>` (playable) | 表示 (auto-open) | 新規作成 | `"true"` |
| **archive** | `live_chat_replay` (playable) | 表示 (手動 toggle) | borrow | `!= "true"` |
| **no-chat** | なし or 無関係 | **非表示** | **なし** | — |
| **replay-unavailable** | unavailable renderer | **非表示** | **なし** | — |

各モードの実行時契約の詳細は **fullscreen-chat-contracts** スキルを参照。

---

## Skip vs Fail decision tree

テスト失敗時に「skip（環境問題）」か「fail（拡張のバグ）」かを判定する基準。

```
テスト失敗
├── URL が null / 取得失敗
│   └── SKIP: URL ドリフト → testTargets.ts を更新
│
├── ページロード / native chat 不成立
│   └── SKIP: YouTube 側の変更 or 一時障害
│
├── Switch 未出現
│   ├── native chat が playable でない → SKIP: 環境問題
│   └── native chat は playable だが switch が出ない → FAIL: switch 表示ロジックのバグ
│
├── 拡張チャット未ロード
│   ├── shouldSkipArchiveFlowFailure → true → SKIP: native frame 問題
│   ├── native.playable === false → SKIP: ソース不成立
│   └── native.playable === true → FAIL: iframe ソース解決のバグ
│
└── Assert 失敗 → FAIL: 拡張の振る舞いが契約に違反
```

### 具体例

| シナリオ | 判定 | 理由 |
|---------|------|------|
| live 検索で playable な live 動画が 0 件 | skip | YouTube の供給不足 |
| archive URL の動画が削除されていた | skip | URL ドリフト |
| native chat は playable だが拡張 iframe が blank | **fail** | iframe ソース解決のバグ |
| フルスクリーンで switch が `aria-pressed="true"` にならない | **fail** | auto-open ロジックのバグ |
| archive toggle on 後に `data-ylc-owned === "true"` | **fail** | borrow ではなく新規作成している |
| video transition 後に stale iframe が残る | **fail** | SPA 遷移時の cleanup バグ |
| no-chat 動画で switch が表示される | skip or **fail** | URL が実は chat ありなら skip。正しい URL なら fail |
