# #15 Resizable Panels Design

## 日本語サマリー

Issue #15 では、Studio の desktop レイアウトにドラッグ可能なパネル境界線を追加する。
初回スコープはブラウザで確認した Option A とし、JSON Editor / Preview / Tree / Property の作業領域をユーザーが調整できるようにする。
mobile では既存の縦積みレイアウトと Property overlay を維持し、無理にドラッグ操作を提供しない。

## Goals

- JSON Editor と右側作業領域の横幅をドラッグで変更できる。
- Preview と Tree 領域の高さをドラッグで変更できる。
- Tree と Property 領域の横幅をドラッグで変更できる。
- パネルが小さくなりすぎないように最小サイズを設定する。
- hover / focus 時に境界線が resize handle であることが分かる。
- JSON 編集、ツリー選択、プレビュー、Property 編集の既存挙動を維持する。

## Non-Goals

- #13 の定義済みレイアウト切り替え。
- リサイズ状態の永続化。
- mobile でのドラッグリサイズ。
- Preview 内のデバイス幅切り替え。これは #27 で扱う。

## UI Design

Desktop (`lg` 以上) では既存の 2 カラム構成を `react-resizable-panels` の `PanelGroup` に置き換える。
左パネルは JSON Editor、右パネルは Preview と Tree を含む作業領域とする。
右パネルの内部は縦方向の `PanelGroup` にし、上を Preview、下を Tree/Property に分割する。
Tree が開いていて選択 node がある場合、Tree と Property の間にも横方向の `PanelGroup` を使う。

Resize handle は既存の `client/src/components/ui/resizable.tsx` を使う。
handle は通常時に細い境界線として見え、hover/focus/drag 中に色が濃くなる。
`withHandle` を使い、つまめる位置が分かる視覚的な affordance を出す。

Mobile (`lg` 未満) は現状の縦積み構成を維持する。
Property panel も既存通り下部 overlay のままにする。

## Internal Design

`Studio.tsx` の JSX を、desktop 用 resizable layout と mobile fallback layout に分ける。
状態や handler は既存の `Studio` state を共有するため、JSON 本体には一切影響しない。
初期サイズは現在の見え方に近い値にする。

- Main horizontal: editor `50%`, workspace `50%`, min `30%` / `35%`
- Workspace vertical: preview `60%`, tree `40%`, min `35%` / `25%`
- Tree/property horizontal: tree `65%`, property `35%`, min `35%` / `260px` 相当

`react-resizable-panels` の `minSize` は percentage 指定なので、Property panel には既存 `min-w-[260px]` を併用する。

## Testing

Focused tests should cover the rendered contract rather than browser drag physics:

- Desktop layout renders resizable panel groups.
- Main editor/workspace split exposes a resize handle.
- Preview/tree split exposes a resize handle.
- Tree/property split exposes a resize handle when a node is selected.
- Mobile fallback remains present and does not expose desktop handles.
- Existing tree layout tests and component tests keep passing.

Manual/browser verification should confirm:

- Dragging the editor/workspace handle changes widths.
- Dragging the preview/tree handle changes heights.
- Dragging the tree/property handle changes widths.
- Panels do not collapse into unusable states.
- JSON Editor, tree selection, preview, and Property editing still work.

## Acceptance Criteria

- パネル境界線に hover するとリサイズ可能であることが分かる。
- 境界線をドラッグしてパネルサイズを変更できる。
- パネルが極端に小さくなって操作不能にならない。
- リサイズしても JSON 編集、ツリー選択、プレビュー表示が壊れない。
- 既存の mobile レイアウトを壊さない。
