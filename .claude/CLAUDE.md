# モーニングルーティン - プロジェクト設定

> グローバル設定（`~/.claude/CLAUDE.md`）との併用前提。このファイルはプロジェクト固有の設定。

---

## プロジェクト概要

毎朝のルーティンを支援する**個人専用のPWAウェブアプリ**。  
バックエンドなし・ログインなし・完全ローカル動作。スマホのホーム画面からアプリとして使うことを想定。

---

## 技術スタック

| 分類 | 採用技術 |
|------|---------|
| 言語 | HTML / CSS / JavaScript（バニラまたは軽量ライブラリ） |
| データ永続化 | `localStorage`（設定・テキスト）、`IndexedDB`（音声バイナリ） |
| PWA | `manifest.json` + Service Worker |
| 外部サービス | **なし**（完全ローカル動作） |
| デプロイ | GitHub Pages、Netlify、Vercel 静的ホスティングなど（任意） |

**注意:** このプロジェクトにはNext.js / Supabase / Stripe / 認証は**使用しない**。  
サーバー通信を行うコードを書かないこと。

---

## ディレクトリ構成

```
morning-routin/
├── index.html           # シングルページアプリ本体
├── manifest.json        # PWA マニフェスト
├── sw.js               # Service Worker（オフライン・キャッシュ）
├── css/
│   ├── main.css        # ベーススタイル（ミント・パステル基調）
│   └── animations.css  # マイクロインタラクション・トランジション
├── js/
│   ├── app.js          # アプリ初期化・タブルーティング
│   ├── storage.js      # localStorage / IndexedDB の統一ラッパー
│   ├── home.js         # ホームタブ（ダッシュボード）
│   ├── article.js      # 記事タブ
│   ├── tasks.js        # タスク管理
│   ├── timer.js        # タイマー
│   ├── records.js      # 記録・統計・ストリーク
│   └── settings.js     # 設定・BGM・データ管理
└── assets/
    └── icons/          # PWA アイコン（各サイズ）
```

---

## コーディング規約

- バニラJSを基本とし、依存ライブラリは最小限に留める
- モジュールは `type="module"` でESModules形式で記述
- グローバル変数を汚染しない（モジュールスコープに閉じる）
- 非同期処理は `async/await` で統一
- localStorage のキー名は `mr_` プレフィックスで統一（例: `mr_tasks`）
- IndexedDB の DB名は `MorningRoutineDB`、バージョン管理を行う
- エラーは `console.error` で記録し、UIには「再試行」を促す表示
- コメントは「なぜ」が非自明なときのみ記述（「何をするか」は書かない）

---

## UI・デザイン規約

- **テーマカラー:** ミント系パステル（例: `#B2DFDB`, `#E0F7FA`）
- **モバイルファースト:** タップ領域は最低 44px × 44px
- **タブバー:** 画面下部固定、6タブ（ホーム → 記事 → タスク → タイマー → 記録 → 設定）
- アニメーションは `CSS transition` / `CSS animation` を優先し、JSアニメは最小限に
- バッテリー消費を考慮し、常時アニメーションは避ける（`prefers-reduced-motion` 対応）

---

## タスクの状態管理（確定）

| 状態 | 値 | 表示 |
|------|-----|------|
| 未着手 | `"todo"` | グレー |
| 進行中 | `"in-progress"` | 黄色・オレンジ |
| 完了 | `"done"` | グリーン |

---

## データモデル（localStorage キー設計）

```js
mr_settings    // { theme, notifications, reminders: [] }
mr_tasks       // Task[]
mr_habits      // Habit[]
mr_templates   // Template[]
mr_wakeup_logs // { [date: "YYYY-MM-DD"]: "HH:MM" }
mr_timer_logs  // TimerLog[]
mr_article     // { content: string }
mr_daily_stats // DailyStat[]
```

音声バイナリのみ IndexedDB（`MorningRoutineDB` / `sounds` ストア）に保存。

---

## 通知の実装方針

- Notification API で許可リクエストを行う
- Service Worker 経由で通知を表示
- **iOSでの完全な予約通知は保証しない**（アプリ起動中・直近利用時に動作）
- 「必ず鳴る」は約束せず、ベストエフォートとしてUIで説明する

---

## 開発フロー

```
要件確認
  → index.html のタブ骨格作成
  → storage.js で読み書き層を先に実装
  → 各タブのJS・CSSを追加
  → Service Worker でキャッシュ設定
  → manifest.json で PWA 化
  → 実機ブラウザで動作確認（iOS Safari / Android Chrome）
```

---

## 禁止事項

- サーバーAPIへの通信（fetch / XHR でリモートエンドポイントを叩く）
- ユーザーデータの外部送信
- APIキー・シークレットのコード埋め込み（そもそも外部サービス不使用）
- `document.write` の使用
- インラインスクリプト（CSP 対応のため）

---

## マイルストーン

| # | 内容 |
|---|------|
| 1 | 画面骨格・タブ切り替え・パステルデザイン土台 |
| 2 | タスク管理・習慣トラッカー・起床時刻記録・ホーム集約 |
| 3 | タイマー（ゲージ・タスク連携） |
| 4 | ルーティンテンプレート |
| 5 | 記録・統計・エクスポート／インポート |
| 6 | BGMアップロード・設定タブ |
| 7 | PWA化・通知（ベストエフォート） |
| 8 | アニメーション・仕上げ |
