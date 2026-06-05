# アーキテクチャ設計

## システム概要

```
┌──────────────────────────────────────┐
│           ブラウザ（クライアント）        │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         index.html (SPA)       │  │
│  │  ┌──────┬──────┬──────┬──── ─┐ │  │
│  │  │ home │tasks │timer │ ... │ │  │
│  │  └──────┴──────┴──────┴─────┘ │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────┐  ┌────────────────┐  │
│  │localStorage│  │  IndexedDB     │  │
│  │(テキスト系) │  │ (音声バイナリ)  │  │
│  └────────────┘  └────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │       Service Worker           │  │
│  │  ・アセットキャッシュ           │  │
│  │  ・オフライン対応               │  │
│  │  ・通知（ベストエフォート）       │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
        ↑ 外部通信なし（完全ローカル動作）
```

---

## ファイル構成

```
morning-routin/
├── index.html              # シングルページアプリ本体・タブUI骨格
├── manifest.json           # PWAマニフェスト（アイコン・名称・起動設定）
├── sw.js                   # Service Worker（キャッシュ・オフライン・通知）
│
├── css/
│   ├── main.css            # レイアウト・カラー・コンポーネント基礎スタイル
│   └── animations.css      # トランジション・マイクロインタラクション
│
├── js/
│   ├── app.js              # アプリ初期化・タブ切り替えルーティング
│   ├── storage.js          # localStorage / IndexedDB の統一ラッパー
│   ├── home.js             # ホームタブ（ダッシュボード・習慣・起床打刻）
│   ├── article.js          # 記事タブ（コンテンツ表示・編集）
│   ├── tasks.js            # タスク管理（CRUD・状態管理・テンプレート展開）
│   ├── timer.js            # タイマー（制御・ゲージ描画・タスク連携）
│   ├── records.js          # 記録・統計・ストリーク計算・グラフ描画
│   └── settings.js         # 設定（BGM管理・通知・データ管理）
│
└── assets/
    └── icons/              # PWAアイコン（192×192, 512×512 など）
```

---

## モジュール依存関係

```
app.js
  ├── storage.js       ← すべてのモジュールが参照
  ├── home.js
  ├── article.js
  ├── tasks.js
  ├── timer.js         ← tasks.js からタスク一覧を参照
  ├── records.js       ← tasks.js / home.js のログを参照
  └── settings.js      ← storage.js の IndexedDB 側を直接操作

sw.js                  ← 独立（app.jsからregisterのみ）
```

---

## データモデル

### localStorage（キープレフィックス: `mr_`）

```typescript
// 設定
mr_settings: {
  theme: "light" | "dark",
  notifications: boolean,
  reminders: Array<{ id: string, time: "HH:MM", enabled: boolean }>
}

// タスク
mr_tasks: Array<{
  id: string,
  title: string,
  status: "todo" | "in-progress" | "done",
  templateId?: string,        // テンプレート由来の場合
  date: "YYYY-MM-DD",         // 当日分
  createdAt: number,          // Unix timestamp
  updatedAt: number
}>

// 習慣定義
mr_habits: Array<{
  id: string,
  title: string,
  order: number
}>

// 習慣の日次達成状況
mr_habit_logs: {
  [date: "YYYY-MM-DD"]: string[]  // 達成済み habitId の配列
}

// ルーティンテンプレート
mr_templates: Array<{
  id: string,
  name: string,
  tasks: Array<{ title: string }>,
  habits: string[]  // habitId の配列
}>

// 起床時刻ログ
mr_wakeup_logs: {
  [date: "YYYY-MM-DD"]: "HH:MM"
}

// タイマーログ
mr_timer_logs: Array<{
  id: string,
  date: "YYYY-MM-DD",
  taskId?: string,
  duration: number,     // 秒
  startedAt: number     // Unix timestamp
}>

// 記事コンテンツ
mr_article: {
  content: string       // ユーザーが編集したHTML/Markdown
}
```

### IndexedDB（DB名: `MorningRoutineDB`）

```
Database: MorningRoutineDB (version 1)
└── Store: sounds
      ├── id: string (keyPath)
      ├── name: string
      ├── blob: Blob     // mp3バイナリ
      └── createdAt: number
```

---

## PWA設計

### manifest.json 主要設定

```json
{
  "name": "モーニングルーティン",
  "short_name": "朝活",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#B2DFDB",
  "background_color": "#E0F7FA",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

### Service Worker キャッシュ戦略

| リソース種別 | 戦略 |
|------------|------|
| HTML / CSS / JS / アイコン | Cache First（初回後はキャッシュから即応答） |
| 音声ファイル | IndexedDB管理（SW経由でなくアプリ層で処理） |
| 外部リクエスト | なし（ネットワーク通信なし） |

---

## タブ・画面フロー

```
起動
  └→ app.js 初期化
       ├→ storage.js で設定読み込み
       ├→ Service Worker 登録
       └→ アクティブタブのモジュールを初期化

タブ切り替え
  └→ URLハッシュ or data属性でタブ識別
       ├→ 非アクティブタブを非表示（CSS）
       ├→ CSSトランジションでフェード
       └→ アクティブタブのモジュールを描画更新
```

---

## タイマー設計

```
timer.js
  ├── 状態: { status: "idle" | "running" | "paused", remaining: number, total: number }
  ├── setInterval（1秒ごとに更新）
  ├── ゲージ描画: SVG円形 または CSS線形プログレスバー
  ├── タスク連携: tasks.js の当日タスク一覧をドロップダウンで参照
  └── 終了時:
        ├── Audio API でアラート音再生
        ├── Vibration API でバイブ（モバイル）
        └── Notification API で通知表示
```

---

## データエクスポート・インポート

### エクスポート形式（JSON）

```json
{
  "version": "1.0",
  "exportedAt": "2026-06-05T00:00:00.000Z",
  "data": {
    "settings": { ... },
    "tasks": [ ... ],
    "habits": [ ... ],
    "habitLogs": { ... },
    "templates": [ ... ],
    "wakeupLogs": { ... },
    "timerLogs": [ ... ],
    "article": { ... }
  }
}
```

音声ファイル（mp3バイナリ）はエクスポートに含まない。

### インポート時の処理
1. JSONファイルを選択
2. バージョン確認・バリデーション
3. 既存データとのマージ（上書き確認UIを表示）
4. 各 localStorage キーに書き込み

---

## 通知フロー

```
app.js 起動
  └→ Notification.requestPermission()

settings.js でリマインダー設定
  └→ mr_settings.reminders に保存

app.js アクティブ中（フォアグラウンド）
  └→ 1分ごとに現在時刻とリマインダーを照合
       └→ 一致したら ServiceWorker に postMessage
            └→ SW が showNotification()

タイマー終了時
  └→ timer.js から SW に postMessage
       └→ SW が showNotification()
```

> iOS SafariではSWの常時起動が制限されるため、  
> アプリを閉じた状態での時刻通知は動作しない場合があります。

---

## 統計・ストリーク計算

```
records.js
  ├── ストリーク計算:
  │     今日から過去に遡り、全習慣チェック済みの日が連続する日数
  │     （「全習慣」の定義: mr_habits に登録されたすべての習慣が完了）
  │
  ├── 完了率: 当日タスク完了数 / 当日タスク総数
  │
  └── 所要時間: mr_timer_logs を日次集計
```

---

## セキュリティ考慮事項

- 外部への通信を一切行わないため、データ漏洩リスクは最小
- mp3ファイルはブラウザ内にのみ保存
- インポート時はJSONを検証し、不正なデータを拒否
- `innerHTML` の直接操作は避け、`textContent` / DOM APIを優先
