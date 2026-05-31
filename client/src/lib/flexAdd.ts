import { produce } from "immer";
import { getAtPath, type FlexPath } from "./flexPath";

export const BOX_ADDABLE_TYPES = ["box", "text", "image", "button", "separator", "spacer", "icon"] as const;
export const CAROUSEL_ADDABLE_TYPES = ["bubble"] as const;
export const BUBBLE_SLOT_TYPES = ["header", "hero", "body", "footer"] as const;
export const ADDABLE_TYPES = [...BOX_ADDABLE_TYPES, ...CAROUSEL_ADDABLE_TYPES, ...BUBBLE_SLOT_TYPES] as const;

export type BoxAddableType = (typeof BOX_ADDABLE_TYPES)[number];
export type CarouselAddableType = (typeof CAROUSEL_ADDABLE_TYPES)[number];
export type BubbleSlotType = (typeof BUBBLE_SLOT_TYPES)[number];
export type AddableType = BoxAddableType | CarouselAddableType | BubbleSlotType;
export type AddActionKind = "contents-item" | "bubble-slot";

export type AddAction = {
  id: string;
  label: string;
  type: AddableType;
  kind: AddActionKind;
  targetPath: FlexPath;
  selectionPath: FlexPath;
  node: unknown;
};

const PLACEHOLDER_IMAGE_URL =
  "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png";

function isObjectNode(node: unknown): node is Record<string, unknown> {
  return Boolean(node && typeof node === "object" && !Array.isArray(node));
}

export function getAddableTypesForNode(node: unknown): readonly AddableType[] {
  if (!isObjectNode(node)) return [];
  if (node.type === "box") return BOX_ADDABLE_TYPES;
  if (node.type === "carousel") return CAROUSEL_ADDABLE_TYPES;
  return [];
}

export function createDefaultNode(type: AddableType) {
  switch (type) {
    case "bubble":
      return { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } };
    case "box":
      return { type: "box", layout: "vertical", contents: [] };
    case "text":
      return { type: "text", text: "New text" };
    case "image":
      return { type: "image", url: PLACEHOLDER_IMAGE_URL };
    case "button":
      return { type: "button", action: { type: "uri", label: "Open", uri: "https://example.com" } };
    case "separator":
      return { type: "separator" };
    case "spacer":
      return { type: "spacer", size: "md" };
    case "icon":
      return { type: "icon", url: PLACEHOLDER_IMAGE_URL };
    case "header":
    case "body":
    case "footer":
      return { type: "box", layout: "vertical", contents: [] };
    case "hero":
      return createDefaultNode("image");
  }
}

function getContentsLength(node: Record<string, unknown>): number {
  return Array.isArray(node.contents) ? node.contents.length : 0;
}

function toContentsAction(
  selectedPath: FlexPath,
  node: Record<string, unknown>,
  type: BoxAddableType | CarouselAddableType,
): AddAction {
  const index = getContentsLength(node);
  return {
    id: `add-${type}`,
    label: `${type} 追加`,
    type,
    kind: "contents-item",
    targetPath: [...selectedPath, "contents"],
    selectionPath: [...selectedPath, "contents", index],
    node: createDefaultNode(type),
  };
}

function toBubbleSlotAction(selectedPath: FlexPath, slot: BubbleSlotType): AddAction {
  return {
    id: `add-${slot}`,
    label: `${slot} 追加`,
    type: slot,
    kind: "bubble-slot",
    targetPath: [...selectedPath, slot],
    selectionPath: [...selectedPath, slot],
    node: createDefaultNode(slot),
  };
}

export function getAddableActions(root: unknown, selectedPath: FlexPath | null): readonly AddAction[] {
  if (!selectedPath) return [];

  const selected = getAtPath(root, selectedPath);
  if (!isObjectNode(selected)) return [];

  if (selected.type === "box") {
    return BOX_ADDABLE_TYPES.map((type) => toContentsAction(selectedPath, selected, type));
  }

  if (selected.type === "carousel") {
    return CAROUSEL_ADDABLE_TYPES.map((type) => toContentsAction(selectedPath, selected, type));
  }

  if (selected.type === "bubble") {
    return BUBBLE_SLOT_TYPES
      .filter((slot) => selected[slot] === undefined)
      .map((slot) => toBubbleSlotAction(selectedPath, slot));
  }

  return [];
}

export function addNodeByAction<T>(root: T, action: AddAction): T {
  return produce(root, (draft: any) => {
    if (action.kind === "contents-item") {
      const parent = getAtPath(draft, action.targetPath.slice(0, -1));
      if (!isObjectNode(parent)) return;
      parent.contents = Array.isArray(parent.contents) ? [...parent.contents, action.node] : [action.node];
      return;
    }

    if (action.kind === "bubble-slot") {
      const parent = getAtPath(draft, action.targetPath.slice(0, -1));
      if (!isObjectNode(parent)) return;
      const slot = action.targetPath[action.targetPath.length - 1];
      if (typeof slot !== "string") return;
      if (parent[slot] !== undefined) return;
      parent[slot] = action.node;
    }
  });
}
