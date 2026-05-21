export const BOX_ADDABLE_TYPES = ["box", "text", "image", "button", "separator", "spacer", "icon"] as const;
export const CAROUSEL_ADDABLE_TYPES = ["bubble"] as const;
export const ADDABLE_TYPES = [...BOX_ADDABLE_TYPES, ...CAROUSEL_ADDABLE_TYPES] as const;

export type AddableType = (typeof ADDABLE_TYPES)[number];

export function getAddableTypesForNode(node: unknown): readonly AddableType[] {
  if (!node || typeof node !== "object") return [];
  const type = (node as any).type;
  if (type === "box") return BOX_ADDABLE_TYPES;
  if (type === "carousel") return CAROUSEL_ADDABLE_TYPES;
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
      return { type: "image", url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png" };
    case "button":
      return { type: "button", action: { type: "uri", label: "Open", uri: "https://example.com" } };
    case "separator":
      return { type: "separator" };
    case "spacer":
      return { type: "spacer", size: "md" };
    case "icon":
      return { type: "icon", url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png" };
  }
}
