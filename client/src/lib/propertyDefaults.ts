const DEFAULT_SELECT_VALUES: Record<string, Record<string, string>> = {
  text: {
    size: "md",
    weight: "regular",
    align: "start",
    margin: "none",
  },
  box: {
    spacing: "none",
    margin: "none",
    paddingAll: "none",
  },
  image: {
    size: "md",
    aspectMode: "fit",
    margin: "none",
  },
  button: {
    style: "link",
    height: "md",
    margin: "none",
  },
  icon: {
    size: "md",
    margin: "none",
  },
  separator: {
    margin: "none",
  },
  spacer: {
    size: "md",
  },
  bubble: {
    size: "mega",
    direction: "ltr",
  },
};

export function getDefaultSelectValue(type: string | undefined, key: string): string | undefined {
  if (!type) return undefined;
  return DEFAULT_SELECT_VALUES[type]?.[key];
}

export function formatSelectOptionLabel(option: string, defaultValue?: string): string {
  return defaultValue === option ? `${option} <default>` : option;
}
