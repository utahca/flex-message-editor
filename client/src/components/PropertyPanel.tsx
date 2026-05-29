import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatPath, type FlexPath } from "@/lib/flexPath";
import { formatSelectOptionLabel, getDefaultSelectValue } from "@/lib/propertyDefaults";

type Props = {
  node: any;
  path: FlexPath;
  root?: any;
  onChange: (path: FlexPath, value: unknown) => void;
  onSelectPath?: (path: FlexPath) => void;
  onClose: () => void;
};

// Per-type field schema. Keep it focused; deeper editing happens in the JSON editor.
type FieldKind = "text" | "longtext" | "color" | "url" | "select" | "boolean";
type FieldDef = { key: string; label: string; kind: FieldKind; options?: string[]; placeholder?: string };

const TYPE_FIELDS: Record<string, FieldDef[]> = {
  text: [
    { key: "text", label: "Text", kind: "longtext" },
    { key: "size", label: "Size", kind: "select", options: ["xxs", "xs", "sm", "md", "lg", "xl", "xxl", "3xl", "4xl", "5xl"] },
    { key: "weight", label: "Weight", kind: "select", options: ["regular", "bold"] },
    { key: "color", label: "Color", kind: "color" },
    { key: "align", label: "Align", kind: "select", options: ["start", "center", "end"] },
    { key: "wrap", label: "Wrap", kind: "boolean" },
    { key: "margin", label: "Margin", kind: "select", options: ["none", "xs", "sm", "md", "lg", "xl", "xxl"] },
  ],
  box: [
    { key: "layout", label: "Layout", kind: "select", options: ["horizontal", "vertical", "baseline"] },
    { key: "spacing", label: "Spacing", kind: "select", options: ["none", "xs", "sm", "md", "lg", "xl", "xxl"] },
    { key: "margin", label: "Margin", kind: "select", options: ["none", "xs", "sm", "md", "lg", "xl", "xxl"] },
    { key: "backgroundColor", label: "Background", kind: "color" },
    { key: "paddingAll", label: "Padding (all)", kind: "select", options: ["none", "xs", "sm", "md", "lg", "xl", "xxl"] },
  ],
  image: [
    { key: "url", label: "URL", kind: "url" },
    { key: "size", label: "Size", kind: "select", options: ["xxs", "xs", "sm", "md", "lg", "xl", "xxl", "3xl", "4xl", "5xl", "full"] },
    { key: "aspectRatio", label: "Aspect Ratio", kind: "text", placeholder: "20:13" },
    { key: "aspectMode", label: "Aspect Mode", kind: "select", options: ["cover", "fit"] },
    { key: "margin", label: "Margin", kind: "select", options: ["none", "xs", "sm", "md", "lg", "xl", "xxl"] },
  ],
  button: [
    { key: "style", label: "Style", kind: "select", options: ["primary", "secondary", "link"] },
    { key: "color", label: "Color", kind: "color" },
    { key: "height", label: "Height", kind: "select", options: ["sm", "md"] },
    { key: "margin", label: "Margin", kind: "select", options: ["none", "xs", "sm", "md", "lg", "xl", "xxl"] },
  ],
  icon: [
    { key: "url", label: "URL", kind: "url" },
    { key: "size", label: "Size", kind: "select", options: ["xxs", "xs", "sm", "md", "lg", "xl", "xxl", "3xl", "4xl", "5xl"] },
    { key: "margin", label: "Margin", kind: "select", options: ["none", "xs", "sm", "md", "lg", "xl", "xxl"] },
  ],
  separator: [
    { key: "margin", label: "Margin", kind: "select", options: ["none", "xs", "sm", "md", "lg", "xl", "xxl"] },
    { key: "color", label: "Color", kind: "color" },
  ],
  spacer: [
    { key: "size", label: "Size", kind: "select", options: ["xs", "sm", "md", "lg", "xl", "xxl"] },
  ],
  bubble: [
    { key: "size", label: "Size", kind: "select", options: ["nano", "micro", "kilo", "mega", "giga"] },
    { key: "direction", label: "Direction", kind: "select", options: ["ltr", "rtl"] },
  ],
};

const NONE_VALUE = "__none__";

export function PropertyPanel({ node, path, root, onChange, onSelectPath, onClose }: Props) {
  const type = node?.type as string | undefined;
  const fields = (type && TYPE_FIELDS[type]) || [];

  return (
    <aside
      className="flex h-full w-full flex-col border-l border-border bg-card"
      data-testid="property-panel"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">プロパティ</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
              {type ?? "unknown"}
            </span>
            <span className="truncate font-mono text-xs text-muted-foreground" title={formatPath(path)}>
              {formatPath(path)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="閉じる"
          data-testid="button-close-property-panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {fields.length === 0 && (
          <div className="text-sm text-muted-foreground">
            この要素 ({type ?? "unknown"}) 用の編集フィールドはありません。JSON エディタから直接編集してください。
          </div>
        )}

        {type === "carousel" && Array.isArray(root?.contents) && (
          <div className="space-y-2 rounded-md border border-border bg-background p-3">
            <Label className="text-xs">Bubbles</Label>
            <div className="flex flex-wrap gap-2">
              {root.contents.map((_: unknown, i: number) => (
                <Button
                  key={i}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onSelectPath?.(["contents", i])}
                  data-testid={`button-select-bubble-${i}`}
                >
                  bubble[{i}]
                </Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              編集したいバブルを選択してください。
            </div>
          </div>
        )}

        {fields.map((f) => {
          const value = node?.[f.key];
          const fieldPath: FlexPath = [...path, f.key];

          if (f.kind === "longtext") {
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`prop-${f.key}`} className="text-xs">
                  {f.label}
                </Label>
                <Textarea
                  id={`prop-${f.key}`}
                  data-testid={`input-prop-${f.key}`}
                  value={(value as string) ?? ""}
                  rows={3}
                  onChange={(e) => onChange(fieldPath, e.target.value)}
                />
              </div>
            );
          }

          if (f.kind === "select") {
            const cur = (value as string) ?? "";
            const defaultValue = getDefaultSelectValue(type, f.key);
            return (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs">{f.label}</Label>
                <Select
                  value={cur === "" ? NONE_VALUE : cur}
                  onValueChange={(v) =>
                    onChange(fieldPath, v === NONE_VALUE ? undefined : v)
                  }
                >
                  <SelectTrigger data-testid={`select-prop-${f.key}`}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>—</SelectItem>
                    {f.options!.map((o) => (
                      <SelectItem key={o} value={o}>
                        {formatSelectOptionLabel(o, defaultValue)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          if (f.kind === "color") {
            const cur = (value as string) ?? "";
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`prop-${f.key}`} className="text-xs">
                  {f.label}
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={`${f.label} color picker`}
                    value={/^#[0-9a-fA-F]{6}$/.test(cur) ? cur : "#000000"}
                    onChange={(e) => onChange(fieldPath, e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent"
                    data-testid={`color-prop-${f.key}`}
                  />
                  <Input
                    id={`prop-${f.key}`}
                    data-testid={`input-prop-${f.key}`}
                    value={cur}
                    placeholder="#06C755"
                    onChange={(e) =>
                      onChange(fieldPath, e.target.value === "" ? undefined : e.target.value)
                    }
                  />
                </div>
              </div>
            );
          }

          if (f.kind === "boolean") {
            const cur = Boolean(value);
            return (
              <div key={f.key} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                <Label className="text-xs">{f.label}</Label>
                <input
                  type="checkbox"
                  checked={cur}
                  onChange={(e) => onChange(fieldPath, e.target.checked ? true : undefined)}
                  className="h-4 w-4 accent-primary"
                  data-testid={`check-prop-${f.key}`}
                />
              </div>
            );
          }

          // text / url
          return (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`prop-${f.key}`} className="text-xs">
                {f.label}
              </Label>
              <Input
                id={`prop-${f.key}`}
                data-testid={`input-prop-${f.key}`}
                value={(value as string) ?? ""}
                placeholder={f.placeholder}
                onChange={(e) =>
                  onChange(fieldPath, e.target.value === "" ? undefined : e.target.value)
                }
              />
            </div>
          );
        })}

        {/* Button action.label is a special case (nested action) */}
        {type === "button" && node?.action && typeof node.action === "object" && (
          <div className="space-y-1.5 rounded-md border border-border bg-background p-3">
            <Label htmlFor="prop-action-label" className="text-xs">
              Action Label
            </Label>
            <Input
              id="prop-action-label"
              data-testid="input-prop-action-label"
              value={(node.action.label as string) ?? ""}
              onChange={(e) => onChange([...path, "action", "label"], e.target.value)}
            />
            <Label htmlFor="prop-action-uri" className="text-xs">
              Action URI
            </Label>
            <Input
              id="prop-action-uri"
              data-testid="input-prop-action-uri"
              value={(node.action.uri as string) ?? ""}
              onChange={(e) => onChange([...path, "action", "uri"], e.target.value)}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
