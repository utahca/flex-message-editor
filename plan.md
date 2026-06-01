# Flex Studio — 設計と次タスクの引き継ぎドキュメント

このドキュメントは、新しいコントリビュータ（人間または AI エージェント）が Flex Studio の開発を引き継ぐためのものです。**コードを触る前にこのファイル全体に目を通してください。**

---

## 1. ゴール

LINE 公式 [Flex Message Simulator](https://developers.line.biz/flex-simulator/) の以下の問題点を解消した、オープンな代替シミュレータを作る。

| 公式の問題 | 本プロジェクトでの解決 |
|---|---|
| LINE Business ID ログイン必須 | ログイン完全不要、純粋なクライアントサイドアプリ |
| 近年メンテが活発でない | OSS としてコミュニティでメンテ可能 |
| UI がリテラシー依存 | ツリービュー + プロパティパネルで初学者にも直感的 |
| カスタマイズ不可 | GitHub で fork して自社ニーズに合わせて改造可 |

最終形態: **GitHub Pages 上で配信される静的サイト**。バックエンド不要。

---

## 2. 設計判断とその理由

### 2.1 「リバースエンジニアリングしない」方針

当初は公式サイトのリバースエンジニアリングを検討したが却下した。理由:

1. 公式サイトはログイン背後にあり、ミニファイ済み Vue.js コード。解析コストが高い
2. LINE の利用規約・著作権的にグレー〜黒
3. **そもそも Flex Message の JSON 仕様は LINE が公開している**。仕様書に基づいた独立実装で十分目的を達成できる

代わりに、仕様書ベースの OSS レンダラー [`flex-render-react`](https://www.npmjs.com/package/flex-render-react) を採用した。

### 2.2 レンダラー選定

候補と評価:

| ライブラリ | 評価 |
|---|---|
| `flex-render` / `flex-render-react` | **採用**。2024 年更新あり、TypeScript・React 19 対応、framework-agnostic 設計 |
| `PamornT/flex2html` | 2021 年で更新停止。新プロパティ未対応の可能性大 |
| `chentsulin/line-flex-ui` | 2020 年で更新停止。事前定義テンプレ呼び出し型で本用途に不適 |
| 自前実装 | 仕様が広範（Box layout, baseline, offset, padding, aspectRatio 等）で初期コスト過大 |

### 2.3 ベンダーロックインを避ける設計

**外部レンダラーへの依存は `client/src/components/FlexPreview.tsx` の 1 ファイルにだけ集中させている**。

```tsx
// FlexPreview.tsx の中だけ:
import { FlexPreview as FlexPreviewBase } from "flex-render-react";
import "flex-render-react/css";
```

他コンポーネントは必ず `<FlexPreview json={...} />` 経由でアクセスする。
将来 `flex-render-react` がメンテ停止したり、より良い実装が出てきた場合、原則このファイルだけ書き換えれば済む。

**このルールは必ず守ること。** PR でこの境界が破られていたらリジェクト推奨。

### 2.4 React 19 と `legacy-peer-deps`

`flex-render-react@0.1.8` が React 19 の JSX runtime を bundle しているため、React 18 では `recentlyCreatedOwnerStacks` 未定義エラーで落ちる。webapp テンプレートを React 19 にアップグレード済み。

ただし `flex-render-react@0.1.8` の `package.json` には peer として React 18 が宣言されているため、`npm ci` / クリーンクローンした環境で `npm install` が ERESOLVE エラーで落ちる。
それを避けるためリポジトリルートに **`.npmrc`** を置いて `legacy-peer-deps=true` を有効化している。上流が peer レンジを React 19 に上げたら `.npmrc` は削除して OK。

### 2.5 状態の保存方式

**`localStorage` / `sessionStorage` / `indexedDB` / `cookie` は使っていない。**
理由: 元の webapp テンプレートが Perplexity のサンドボックス iframe で動作することを想定しており、これらが**ブロックされてページがクラッシュする**ためテンプレートで明示的に禁止されている。

GitHub Pages 化後はこの制約は無くなる。Phase 2 で `localStorage` ベースの自動保存を入れる予定（後述）。

### 2.6 Express の扱い

`server/` ディレクトリは Vite の開発サーバと production static 配信を担う Express サーバとして維持する。**本 MVP では API は使っていない**ため、テンプレート由来の DB/auth/storage コードは削除済み。

GitHub Pages 化 (Phase 2) では、Actions から `client/` を静的ビルドして配信する構成へ移行できる。その場合もローカル開発用サーバを残すかは別途判断する。

---

## 3. アーキテクチャ詳細

### 3.1 状態フロー

メイン状態は `client/src/pages/Studio.tsx` の React state に集約。`localStorage` 等は不使用。

```
User edits JSON in Monaco
  └─→ onChange → setJsonText
       └─→ try JSON.parse
            ├─ ok  → setFlexJson(parsed) → re-render Preview / Tree
            └─ ng  → setParseError(message) → Preview shows error
                                            (tree keeps last valid)

User clicks tree node
  └─→ onSelect(path: FlexPath) → setSelectedPath(path)
       └─→ PropertyPanel re-renders for that path

User edits a property in PropertyPanel
  └─→ onChange(value) → setAtPath(flexJson, selectedPath.concat(field), value)
       └─→ setFlexJson(next) AND setJsonText(JSON.stringify(next, null, 2))
            └─→ Monaco が controlled で更新される
```

### 3.2 `FlexPath` 型

JSON ツリーへの参照は `(string | number)[]`。

例:
```ts
// Brown Cafe サンプルの最初の text 要素「Brown Cafe」を指す path
["body", "contents", 0]

// ↑ の text プロパティを指す path
["body", "contents", 0, "text"]
```

操作 API は `client/src/lib/flexPath.ts`:
- `getAtPath(root, path)` — 値の取得
- `setAtPath(root, path, value)` — `immer` でディープに不変更新（`value === undefined` でフィールド削除）
- `formatPath(path)` — `body.contents[0]` 形式の表示用文字列

### 3.3 主要コンポーネントの責務

| コンポーネント | 責務 | 状態を持つか |
|---|---|---|
| `Studio.tsx` | 全状態の単一ソース、レイアウト | ◎ 唯一の真実の源 |
| `JsonEditor.tsx` | Monaco の薄いラッパ | ✗ (controlled) |
| `FlexPreview.tsx` | レンダラー隔離 + ErrorBoundary | ErrorBoundary 自身の error state のみ |
| `FlexTreeView.tsx` | ツリー描画 + 選択通知 | 開閉状態のみ |
| `PropertyPanel.tsx` | 選択 path 用の編集 UI | ✗ (controlled) |

---

## 4. 既知の制約と落とし穴

1. **Carousel 編集はまだ限定的**
   ルート JSON の `type === "carousel"` はツリービューに表示され、バブル選択とバブル追加はできる。ただしテンプレートからの作成や Carousel 専用の詳細編集 UI はまだないため、複雑な編集は JSON 直編集が必要。

2. **プロパティパネルでサポートしているプロパティは限定的**
   text/color/size/weight/layout/spacing/margin/url 程度。padding, offset, position, gravity, flex, aspectRatio, aspectMode 等は JSON 直編集が必要。Phase 1 で網羅。

3. **ツリー要素の並べ替えはボタン操作のみ**
   既存ツリー要素の追加・削除と同一 `contents` 配列内の上下移動は UI からできる。ドラッグ & ドロップ並べ替えと親をまたぐ移動は未対応。

4. **画像 URL は CORS を満たすホストでないとプレビューに出ない**
   `scdn.line-apps.com` 等は OK だが、Imgur 直リンク等は出ない場合あり。`flex-render-react` の挙動に依存。

5. **`@assets/...` import エイリアス**
   webapp テンプレート由来で `vite.config.ts` に残っているが本プロジェクトでは未使用。

6. **`server/`**
   API は未使用。Vite 開発サーバと production static 配信用に Express の最小構成だけを維持している。

7. **`dist/` をコミットしない**
   `.gitignore` 済み。GitHub Pages 化は GitHub Actions でビルドする方式 (Phase 2 参照)。

---

## 5. ロードマップ

### Phase 1: 機能拡充（GitHub Pages 化の前にやるべきもの）

優先度順:

- [x] **P1: Carousel ルート対応**
  `FlexTreeView.tsx` は Carousel の `contents[]` バブルを表示し、`PropertyPanel.tsx` は carousel ルート時にバブル選択 UI を出す。

- [x] **P1: ツリーからの要素追加・削除・並べ替え**
  - 「+」: Box / Text / Image / Button / Separator / Spacer / Icon を追加
  - 「×」: 選択中の要素を削除（ルートは保護）
  - 上下ボタン: 同一 `contents` 配列内で並べ替え
  - [ ] drag & drop で並べ替え（GitHub issue #9）

- [ ] **P2: プロパティパネルのプロパティ網羅**
  Flex Message 公式仕様 ([elements](https://developers.line.biz/en/docs/messaging-api/flex-message-elements/), [layout](https://developers.line.biz/en/docs/messaging-api/flex-message-layout/)) を参照し、type ごとに以下を網羅:
  - 共通: flex, margin, padding (All/Top/Bottom/Start/End), offset (All/Top/Bottom/Start/End), position (relative/absolute), gravity, action
  - Box: layout, spacing, justifyContent, alignItems, backgroundColor, borderColor, borderWidth, cornerRadius
  - Text: text, size, color, weight, style, decoration, align, gravity, wrap, lineSpacing, maxLines, contents (span)
  - Image: url, size, aspectRatio, aspectMode, backgroundColor, animated
  - Button: action, style, color, height, adjustMode
  - Icon: url, size, aspectRatio
  - Separator: margin, color
  - Spacer (deprecated だが残す): size

- [ ] **P2: Undo / Redo**
  履歴スタックを `Studio.tsx` で保持。Ctrl/Cmd+Z, Shift+Cmd+Z。

- [ ] **P2: JSON Schema バリデーション**
  LINE が公開している [OpenAPI 仕様](https://github.com/line/line-openapi) から JSON Schema を抽出 → `ajv` で検証 → Monaco の markers にエラーを表示。
  これにより、レンダラーの追従が遅れていても**仕様変更を機械的に検知できる**。

- [ ] **P3: テンプレート集**
  公式 Showcase 相当 + 独自テンプレを `client/src/lib/templates/*.ts` に。「テンプレートから新規作成」ボタン。

- [ ] **P3: URL 共有**
  `pako` で gzip → base64url → `#data=...`。`localStorage` 不要、サーバ不要で共有可能。

- [ ] **P3: エクスポート**
  - JSON ファイルとしてダウンロード
  - PNG として保存 (`html-to-image`)
  - HTML スニペットとして取得（メール送信などに）

### Phase 2: GitHub Pages 対応

- [x] **未使用 DB/auth/storage コードと関連依存の削除**
  本アプリは API 不要。`shared/`, `drizzle.config.ts`, storage 実装, Drizzle, better-sqlite3, passport, supabase などは削除済み。Express は開発/静的配信用に維持。

- [ ] **`vite.config.ts` の `base` を `/<repo-name>/` に**
  GitHub Pages のサブパス配信のため。
  ```ts
  // vite.config.ts
  export default defineConfig({
    base: process.env.GITHUB_PAGES ? '/flex-studio/' : '/',
    // ...
  });
  ```

- [ ] **`wouter` を `useHashLocation` のままにする**
  GitHub Pages の SPA ルーティングはハッシュ式が無難。現状 `App.tsx` で既に hash ロケーションを使っているので変更不要のはず（要確認）。

- [ ] **`localStorage` 自動保存を導入**
  Pages 環境ではサンドボックスではないので解禁。`Studio.tsx` で `useEffect` を仕掛けて JSON を localStorage に保存・復元。

- [ ] **GitHub Actions ワークフローを追加**
  `.github/workflows/deploy.yml`:
  ```yaml
  name: Deploy to GitHub Pages
  on:
    push:
      branches: [main]
  permissions:
    contents: read
    pages: write
    id-token: write
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20' }
        - run: npm ci
        - run: GITHUB_PAGES=1 npm run build
        - uses: actions/upload-pages-artifact@v3
          with: { path: dist/public }
    deploy:
      needs: build
      runs-on: ubuntu-latest
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      steps:
        - id: deployment
          uses: actions/deploy-pages@v4
  ```

- [ ] **README に Pages URL を追記**

### Phase 3: 品質と運用

- [ ] **テスト**
  - Vitest + Testing Library で `flexPath.ts` と `PropertyPanel` のスナップショット
  - Playwright で「JSON 編集 → プレビュー更新」「ツリー選択 → プロパティ編集 → JSON 反映」の E2E

- [ ] **i18n**
  現状日本語ハードコード。`i18next` で日本語/英語切替できるように。

- [ ] **アクセシビリティ**
  ツリーノードのキーボード操作（矢印キーで移動、Enter で展開）。WCAG AA コントラスト確認。

- [ ] **LINE API 直接送信機能**（実装は注意深く）
  公式と同様、チャネルアクセストークンを入力したら自分の LINE に push できる機能。ただしブラウザから直接 LINE API を叩くと CORS で失敗するため、ユーザー側で簡易プロキシ (Cloudflare Workers 等) を建てる前提のドキュメントを用意するのが現実的。

---

## 6. 開発上の注意

### コマンド

```bash
npm install          # 初回のみ
npm run dev          # 開発サーバ (Express + Vite, http://localhost:5000)
npm run build        # 本番ビルド (dist/public に静的ファイル)
npm run check        # TypeScript 型チェック
```

### コミット粒度

- 機能単位で 1 コミット
- まず動くものを小さく入れる、その後リファクタ、の順を守る

### 依存追加の判断

新しい依存を追加する場合は、実際に使う機能に限定する。DB/auth 系など public repo に不要な実行面を増やす依存は避け、`<200KB` gzipped の軽量ライブラリを優先する。

### レンダラーのアップグレード

`flex-render-react` を更新する際:

1. npm の changelog を確認
2. `FlexPreview.tsx` の API シグネチャに変更がないか確認
3. Brown Cafe サンプル + Carousel サンプルを開いて目視確認
4. ダーク/ライト両方で確認

---

## 7. 引き継ぎチェックリスト

新規コントリビュータ向け:

- [ ] このファイルを読んだ
- [ ] `README.md` を読んだ
- [ ] `npm install && npm run dev` で動くことを確認した
- [ ] `client/src/pages/Studio.tsx` を読んで状態の流れを理解した
- [ ] `client/src/components/FlexPreview.tsx` の隔離方針を理解した
- [ ] `client/src/lib/flexPath.ts` の path 表現を理解した
- [ ] 上記 Phase 1 のタスクから 1 つピックして PR を出した

---

## 8. 参考リンク

- [LINE Flex Message 公式仕様](https://developers.line.biz/en/docs/messaging-api/flex-message-elements/)
- [LINE Flex Message レイアウトガイド](https://developers.line.biz/en/docs/messaging-api/flex-message-layout/)
- [LINE OpenAPI (JSON Schema 抽出用)](https://github.com/line/line-openapi)
- [flex-render-react (npm)](https://www.npmjs.com/package/flex-render-react)
- [Monaco Editor for React](https://github.com/suren-atoyan/monaco-react)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS v3 docs](https://v3.tailwindcss.com/)
