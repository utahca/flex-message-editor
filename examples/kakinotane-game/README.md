# 🥜 KAKINOTANE SHOOTER

Flex Message の **レイアウト機能だけ**（`Box`, `Text`, `Button`, `Separator`, `Filler`, `Image` の `padding` / `flex` / `layout` プロパティ）を使って作った **動かないシューティングゲーム** のスクリーンショット風 Flex Message。

## これは何

Flex Message で本物のゲームは作れません。アニメーションも状態管理もないからです。
**だからこそ「ゲームっぽい一瞬を切り取った静止画」を Flex Message のレイアウトだけで再現する**という、無意味なことをやりました。

## 含まれているもの

- インベーダー風の敵キャラ配置（3-2 フォーメーション）
- プレイヤー機（🚀）が画面下部に
- 飛んでいる柿の種（🥜🥜）
- HUD: スコア表示・ライフ表示・レベル表示
- 操作ボタン（◀ 左 / 🥜 FIRE! / 右 ▶）
- 操作ボタンの下の注意書き

## 動きません

操作ボタンを押しても、画面遷移用の `action.type: "message"` が発火するだけで、絵は1ミリも動きません。Yutaka さんが LINE Bot のサーバを書いて、`move_left` / `move_right` / `fire` のメッセージを受けて Flex Message を再送信する仕組みを作れば**一応動かせます**が、1手ごとに Flex Message を push する LINE 公式の rate limit と通信遅延で、たぶん遊べたものではありません。

## 使い方

1. Flex Studio を起動
2. `kakinotane-shooter.json` の中身をコピー
3. **`_comment` キーを削除**（Flex Message 仕様にこのフィールドは無いのでエラーになります）
4. 左ペインの JSON エディタに貼り付け
5. プレビューを眺めて「ふ〜ん」と言う

## 学術的価値

`padding` + `paddingStart` のパーセント指定で「画面内の絶対位置」を擬似的に表現できる、ということが分かります。本当に必要になる日は来ないでしょう。

## ライセンス

このディレクトリ配下も Flex Studio 本体と同じく MIT。改造して **動く** 版を作った人がいたら教えてください。
