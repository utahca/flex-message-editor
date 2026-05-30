# Tree Safe Actions Design

## 日本語サマリ

Issue #6 と #12 をまとめて扱い、Flex Message のツリービュー上部に操作アクションバーを追加する。対象は削除、複製、コピー、ペースト、コピー中表示。操作可否は node type と path の文脈で判定し、GUI 操作で invalid JSON を作らない。

アクションバーは項目数と画面幅に応じて高さが自然に広がる。通常幅では1行、狭い幅や操作が多い状態では折り返して複数行になり、ボタンが重なったり画面外へ消えたりしない。

## Goals

- GUI から安全に item を削除できる。
- 選択中 item を同じ親配列内へ複製できる。
- 選択中 item をアプリ内 clipboard にコピーし、貼り付け可能な場所へペーストできる。
- コピー中の node 種類や概要が画面上で分かる。
- 操作後の JSON、ツリー、プレビュー、選択状態が同期する。
- 既存の追加、削除、並べ替え、carousel 化の体験を壊さない。

## Non-Goals

- OS clipboard への node コピー。
- 複数 node の一括選択や一括操作。
- 親をまたぐ drag and drop。
- undo / redo。
- 任意 slot へのペースト候補選択 UI。

## Architecture

Create `client/src/lib/flexOperations.ts` for Flex Message aware operations. Existing `flexPath.ts` remains the low-level path utility layer. `flexOperations.ts` owns rules such as whether a selected path can be deleted, duplicated, copied, or pasted into.

Proposed helper responsibilities:

- `getNodeOperationState(root, selectedPath, copiedNode)`
  - Returns operation availability and short disabled reasons.
- `canDeleteNode(root, path)`
- `deleteNodeAtPath(root, path)`
- `getSelectionAfterDelete(root, deletedPath)`
- `canDuplicateNode(root, path)`
- `duplicateNodeAtPath(root, path)`
- `canCopyNode(root, path)`
- `canPasteNode(root, selectedPath, copiedNode)`
- `pasteNodeAtPath(root, selectedPath, copiedNode)`

`Studio.tsx` keeps UI state:

- `selectedPath`
- `copiedNode`
- parsed JSON

If the action area grows enough to make `Studio.tsx` hard to scan, extract a `TreeActionBar` component. It receives operation state and callbacks from `Studio.tsx`.

## Operation Rules

### Delete

Allowed:

- Elements under `box.contents[]`.
- Optional bubble slots: `header`, `hero`, `footer`.
- Bubbles under `carousel.contents[]` only when the carousel has at least two bubbles.

Not allowed:

- Root `bubble` or root `carousel`.
- `bubble.body`.
- The last bubble in `carousel.contents[]`.
- Missing paths or unexpected parent structures.

After delete:

- If deleting an array item and a sibling remains, select the nearest remaining sibling.
- If no sibling remains, select the parent node.
- If deleting an optional bubble slot, select the parent bubble.

### Duplicate

Allowed only for array items:

- `box.contents[]`
- `carousel.contents[]`

Duplicate inserts a deep copy immediately after the selected item. Selection moves to the newly inserted copy.

### Copy

Allowed for non-root nodes that are valid Flex Message nodes. Copy stores a deep copy in app state, not the OS clipboard.

The action bar shows a compact label such as `コピー中: text`, `コピー中: box`, or `コピー中: button "Open"`.

### Paste

Allowed targets:

- When selected node is `box`, paste into `box.contents[]` tail if copied node type is addable to box.
- When selected node is `carousel`, paste into `carousel.contents[]` tail only if copied node is `bubble`.
- When selected node is an item inside `box.contents[]`, paste immediately after it if copied node type is addable to that parent box.
- When selected node is an item inside `carousel.contents[]`, paste immediately after it only if copied node is `bubble`.

Paste is disabled for type mismatches or unexpected parent structures. Selection moves to the pasted node.

### Carousel Add

The existing root bubble to carousel conversion appears in the same action bar as `Carousel 追加`.

Allowed only when:

- Root is `bubble`.
- Selected path is root (`[]`).

Not shown when root is already `carousel`.

## UI Design

Use the selected A approach: a tree-top action bar.

The action bar contains:

- Tree heading and selected path.
- Copied node indicator.
- `Carousel 追加`
- Add child buttons from existing addable type logic.
- `複製`
- `コピー`
- `ペースト`
- `削除`

Unavailable actions are disabled by default rather than hidden, except actions that do not apply to the current root mode, such as `Carousel 追加` when root is already `carousel`.

Use concise `title` and `aria-label` copy for important disabled reasons:

- root cannot be deleted
- body cannot be deleted
- last carousel bubble cannot be deleted
- copied node cannot be pasted here

### Responsive Action Bar

The action bar must not use a fixed height such as `h-9`.

Required behavior:

- The bar has a minimum height but expands vertically with content.
- Button groups use `flex-wrap`.
- Header text, selected path, copied node indicator, and actions do not overlap.
- Normal desktop width usually renders as one row.
- Narrow widths or many visible controls wrap to two or more rows.
- Tree content keeps a usable scroll area below the expanded bar.
- Mobile widths prefer wrapping over horizontal overflow for primary actions.

## Data Flow

1. User selects a tree node.
2. `Studio.tsx` derives selected node from `parsed.value` and `selectedPath`.
3. `flexOperations.ts` computes operation availability from root, selected path, and copied node.
4. Action bar renders enabled or disabled controls.
5. User triggers an operation.
6. Operation helper returns the next root and next selection path.
7. `Studio.tsx` writes formatted JSON with `setJsonText(JSON.stringify(next, null, 2))`.
8. Preview and tree update from parsed JSON.

## Error Handling

- When JSON is invalid, tree actions are disabled because there is no reliable root object.
- Operation callbacks re-check helper predicates before mutating state.
- If a path disappears due to manual JSON editing, existing selection cleanup behavior remains active.
- If copied node is incompatible with the selected paste target, paste stays disabled.

## Testing

Add `client/src/lib/flexOperations.test.ts` covering:

- root delete is disallowed.
- `bubble.body` delete is disallowed.
- last `carousel.contents[]` bubble delete is disallowed.
- optional slot delete selects parent bubble.
- array item delete selects nearest sibling or parent.
- duplicate inserts a deep copy immediately after the selected array item.
- copy is allowed for non-root nodes and disallowed for root.
- paste into `box` appends supported copied nodes.
- paste into `carousel` accepts only copied bubbles.
- paste after a selected array item inserts after that item.
- type mismatch paste is disallowed.
- root bubble selected path is the only allowed state for `Carousel 追加`.

Keep existing focused tests:

- `client/src/lib/flexPath.test.ts`
- `client/src/lib/flexRoot.test.ts`
- `client/src/components/FlexTreeView.test.tsx`

If `TreeActionBar` is extracted, add a render test verifying:

- enabled and disabled buttons render from operation state.
- copied node indicator appears.
- disabled controls include accessible labels or titles.

Browser smoke verification:

- Delete a safe text node and confirm JSON/tree/preview update.
- Attempt states where delete is disabled: root, `bubble.body`, last carousel bubble.
- Duplicate a text node and confirm selection moves to copy.
- Copy and paste text into a box.
- Copy and paste bubble into a carousel.
- Confirm incompatible paste is disabled.
- Confirm `Carousel 追加` appears only when root bubble is selected.
- Confirm the action bar wraps and expands on a narrow viewport.

## Open Decisions

No unresolved product decisions remain. Implementation can proceed with TDD after an implementation plan is written.
