# #22 Contextual Add Menu Design

## 日本語サマリー

Issue #22 では、選択中 node の文脈に応じて追加可能な要素だけを表示する追加メニューを実装する。
既存の `TreeActionBar` に並んでいる個別の追加ボタンは、`+ 追加` ボタン 1 つに集約する。
メニュー内には box / carousel / bubble など、現在の選択位置で valid に追加できる候補だけを表示する。

## Goals

- Show only valid add options for the currently selected Flex Message node.
- Prevent invalid structures from being created through the GUI.
- Keep the tree action bar compact by replacing many direct add buttons with one menu trigger.
- Select the newly added node after insertion so the user can edit it immediately.
- Preserve existing tree operations: delete, duplicate, copy, paste, move, and root bubble carousel conversion.

## Non-Goals

- Drag and drop reordering. That remains tracked by #9.
- Template-driven message creation. That remains tracked by #8.
- A full visual builder outside the existing tree/action bar flow.
- Adding every possible LINE Flex Message property or component type in one pass.

## UI Design

`TreeActionBar` will expose a single `+ 追加` button for contextual additions.

The button behavior:

- Enabled when the selected node has one or more valid add actions.
- Disabled when no add action is available.
- Uses a short disabled reason through `title`, matching the existing unavailable action pattern.
- Opens a menu containing only valid add candidates for the current selection.

The menu candidates for the first scope:

- Selected `box`: add `box`, `text`, `image`, `button`, `separator`, `spacer`, or `icon` into `contents`.
- Selected `carousel`: add `bubble` into `contents`.
- Selected `bubble`: add missing optional slots: `header`, `hero`, `body`, or `footer`.

The existing `Carousel 追加` root conversion action remains separate because it changes the root bubble into a carousel rather than adding a child to the selected node.

## Interaction Flow

1. User selects a node in `FlexTreeView`.
2. Studio derives contextual add actions from the parsed JSON root and `selectedPath`.
3. `TreeActionBar` receives those actions and renders a single menu trigger.
4. User opens the `+ 追加` menu.
5. User chooses one add action.
6. Studio inserts the default node at the action target.
7. JSON editor, tree, preview, and property panel update from the new JSON.
8. The inserted node becomes the selected node.

If the selected path disappears or JSON is invalid, no add action is available and the menu trigger stays disabled.

## Internal Design

Extend `client/src/lib/flexAdd.ts` so Flex Message add rules live outside UI components.

Add a helper shaped like:

```ts
type AddActionKind = "contents-item" | "bubble-slot";

type AddAction = {
  id: string;
  label: string;
  type: AddableType;
  kind: AddActionKind;
  targetPath: FlexPath;
  selectionPath: FlexPath;
  node: unknown;
};

function getAddableActions(root: unknown, selectedPath: FlexPath | null): readonly AddAction[];
```

The exact exported names can change during implementation if the codebase suggests a clearer local pattern, but the responsibility should stay the same: the UI asks for add actions and does not duplicate Flex Message structure rules.

`contents-item` actions append to a node's `contents` array. If `contents` is missing or not an array, the behavior should stay consistent with the existing add helper behavior and create or replace it with an array containing the new node.

`bubble-slot` actions set a missing bubble slot directly on the selected bubble object.

Default slot nodes:

- `header`: `{ type: "box", layout: "vertical", contents: [] }`
- `body`: `{ type: "box", layout: "vertical", contents: [] }`
- `footer`: `{ type: "box", layout: "vertical", contents: [] }`
- `hero`: image default using the existing placeholder image convention from `createDefaultNode("image")`

## Component Changes

`TreeActionBar` should change from receiving `canAddChild` and `addableTypes` to receiving contextual add actions.

Expected prop direction:

```ts
type TreeActionBarProps = {
  addActions: readonly AddAction[];
  addReason?: string;
  onAddAction: (action: AddAction) => void;
  // existing operation props remain
};
```

The menu UI can use the project's existing Radix/shadcn-style primitives if present. If no local menu wrapper exists, add the smallest local component needed and keep styling consistent with existing buttons.

## Error Handling

- Invalid JSON: no actions are shown; no add handler runs.
- Missing selected path: no actions are shown.
- Selected node type unsupported: no actions are shown.
- Existing bubble slot: the matching slot action is omitted.
- Action target becomes invalid between render and click: the add handler should no-op rather than throwing.

## Testing

Add or update focused tests:

- `flexAdd` helper tests:
  - box selection returns contents-item actions for supported child types.
  - carousel selection returns only a bubble contents-item action.
  - bubble selection returns only missing slot actions.
  - existing bubble slots are omitted.
  - target path and selection path point to the inserted node.
  - unsupported nodes return no actions.
- `TreeActionBar` component tests:
  - `+ 追加` is enabled when actions exist.
  - `+ 追加` is disabled with a useful reason when no actions exist.
  - menu renders contextual candidates.
  - selecting a candidate calls `onAddAction`.
- Studio/browser smoke:
  - add text to a box.
  - add bubble to a carousel.
  - add header or footer to a bubble.
  - confirm JSON editor, tree, preview, and selection stay synchronized.

## Acceptance Criteria

- The UI shows only add options valid for the selected context.
- Invalid add operations cannot be created through the menu.
- Adding a node updates JSON editor, tree, preview, and property panel.
- The added node becomes selected.
- The action bar stays compact by using one `+ 追加` trigger instead of many direct add buttons.
- Existing delete, duplicate, copy, paste, move, and root carousel conversion behavior remains intact.
