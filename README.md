# Flex Studio

LINE Flex Message を、ログイン不要・ブラウザだけで編集してプレビューできるオープンな代替シミュレータ。

公式の [LINE Flex Message Simulator](https://developers.line.biz/flex-simulator/) は良いツールだが、ログイン必須・近年メンテ停止気味・UI がとっつきにくい、という問題がある。本プロジェクトは公式仕様に沿った OSS レンダラーを使い、ログイン不要で誰でも使える代替を目指す。最終的に GitHub Pages で配信して個人/チームで運用できることをゴールとする。

> 状態: **MVP**（最小限の双方向エディタ）。詳細な機能ロードマップと既知の制限は [`plan.md`](./plan.md) を参照。

---

## 機能（MVP）

- **Monaco エディタ** で Flex Message JSON を直接編集（シンタックスハイライト・JSON エラー検出付き）
- **ライブプレビュー**: JSON が valid な間、リアルタイムで再レンダリング
- **ツリービュー**: Bubble / Carousel の構造を階層表示。各要素クリックで選択
- **プロパティパネル**: 選択した要素の主要プロパティ（`text` / `color` / `size` / `weight` / `layout` / `spacing` / `margin` / `url` 等）を GUI で編集
- **JSON ↔ GUI 双方向同期**: どちらを編集しても他方に即反映
- **ダーク/ライトモード**
- **ローカル/サーバーへの依存なし**: フロントエンドのみで完結（後述の "Express 同梱だが未使用" を参照）

明示的に**入れていない**機能（v1 候補・`plan.md` 参照）: テンプレート集、URL 共有、Undo/Redo、ローカル自動保存、エクスポート（PNG/HTML）、リサイズ可能ペイン、Carousel 編集 UI、より広いプロパティカバレッジ、GitHub Pages 用ビルド設定。

---

## 技術スタック

| レイヤ | 採用 |
|---|---|
| ビルド | Vite 7 |
| UI | React 19 + TypeScript |
| スタイル | Tailwind CSS v3 + shadcn/ui (Radix) |
| エディタ | `@monaco-editor/react` |
| Flex レンダラ | [`flex-render-react`](https://www.npmjs.com/package/flex-render-react) |
| 状態書き換え | `immer`（不変なディープ更新用） |
| ルーティング | `wouter`（ハッシュロケーション） |
| サーバ（同梱だが本アプリでは未使用） | Express 5 |

### 重要: レンダラーは1ファイルに隔離してある

外部の Flex レンダラーは `client/src/components/FlexPreview.tsx` 内でのみ import している。
他コンポーネントは必ず `<FlexPreview json={...} />` 経由で呼び出すこと。
将来別のレンダラーに差し替える場合、原則このファイルだけを書き換えれば済む。

---

## ローカルでの起動

前提: Node.js 20+ / npm 10+

```bash
npm install   # または npm ci
npm run dev
```

> `flex-render-react@0.1.8` の peer dependency が React 18 を要求しているが、実際には React 19 でしか動かないため、`.npmrc` に `legacy-peer-deps=true` を仕込んである。詳細は [`plan.md` §2.4](./plan.md)。

`http://localhost:5000` がフロントエンド（Vite が Express にマウントされる構成）。
本アプリは API を呼ばないので、サーバを切り離しても動くが、現状は同梱の Express で配信している。

### ビルド

```bash
npm run build
```

成果物:
- `dist/public/` — クライアント側の静的ファイル一式（**これだけで動く**。GitHub Pages 化時はこれを配信する）
- `dist/index.cjs` — Express 本体（GitHub Pages では不要）

---

## プロジェクト構造

```
flex-studio/
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── pages/
│       │   ├── Studio.tsx          ← メイン画面 (左: エディタ / 右: プレビュー＋ツリー)
│       │   └── not-found.tsx
│       ├── components/
│       │   ├── FlexPreview.tsx     ← 唯一 flex-render-react を import する場所
│       │   ├── JsonEditor.tsx      ← Monaco ラッパ
│       │   ├── FlexTreeView.tsx    ← ツリー UI（クリックで選択 path を上に通知）
│       │   ├── PropertyPanel.tsx   ← 選択 path のプロパティ編集 UI
│       │   ├── Logo.tsx
│       │   ├── ThemeToggle.tsx
│       │   └── ui/                 ← shadcn/ui コンポーネント
│       ├── lib/
│       │   ├── flexPath.ts         ← JSON への path 参照と immer ベースの不変更新
│       │   ├── sample.ts           ← 起動時に表示する Brown Cafe サンプル
│       │   ├── utils.ts
│       │   └── queryClient.ts      ← (現状未使用)
│       └── hooks/
├── server/                          ← Express + Vite 開発/production server。API は未使用
├── plan.md                          ← 設計意図・既知制約・次タスクのロードマップ
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 状態管理の流れ（重要）

メイン状態は `Studio.tsx` の React state にだけ存在する。`localStorage` 等は**使っていない**（webapp テンプレートのサンドボックス制約に合わせる方針 — `plan.md` 参照）。

```
[Monaco エディタの文字列]  ←→  [パース済み JSON オブジェクト] ──→ [FlexPreview]
                                       │
                                       ├──→ [FlexTreeView] (path を選択して上に通知)
                                       │
                                       └──→ [PropertyPanel] (path のサブツリーを編集)
                                                  │
                                                  └─ immer で path に setAtPath → 新 JSON
```

JSON への path は `(string | number)[]` 型（例: `["body", "contents", 0, "text"]`）。`lib/flexPath.ts` 参照。

---

## GitHub に push する

`.gitignore` は既に設定済み（`node_modules/`, `dist/`, `.env`, SQLite ファイル）。

```bash
cd flex-studio
git init
git add .
git commit -m "Initial commit: Flex Studio MVP"
git branch -M main
git remote add origin git@github.com:<yourname>/flex-studio.git
git push -u origin main
```

## GitHub Pages で公開する

このリポジトリには `.github/workflows/deploy.yml` を追加済み。`main` へ push すると自動で Pages にデプロイされる。

1. GitHub リポジトリの **Settings → Pages** を開く
2. **Build and deployment** を **GitHub Actions** にする
3. `main` ブランチへ push する
4. Actions の `Deploy to GitHub Pages` が成功したら公開 URL で確認する

> Vite の `base` は `GITHUB_PAGES=1` のとき `/<repo-name>/`（このリポジトリでは `/flex-message-editor/`）になるため、サブパス配信でもアセット参照が壊れない。

GitHub Pages 化の詳細方針は [`plan.md` の Phase 2](./plan.md#phase-2-github-pages-対応) を参照。

---

## ライセンスとサードパーティ

- 本リポジトリのコード: [MIT](./LICENSE)
- `flex-render-react` (MIT) を利用してプレビューをレンダリング
- LINE 公式の Flex Message 仕様: <https://developers.line.biz/en/docs/messaging-api/flex-message-elements/>
- 本プロジェクトは LINE 公式シミュレータのコードを一切流用していない（仕様書ベースで OSS レンダラーを使った独立実装）

---

## 引き継ぎ・コントリビュート

別の AI エージェントや開発者に作業を引き継ぐ場合、**まず [`plan.md`](./plan.md) を読んでください**。設計判断の背景、既知の落とし穴、優先順位付きのタスクリストが書かれています。
