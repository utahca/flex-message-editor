import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { type FlexPath } from "@/lib/flexPath";

type Node = {
  type?: string;
  text?: string;
  url?: string;
  layout?: string;
  contents?: Node[];
  hero?: Node;
  body?: Node;
  footer?: Node;
  header?: Node;
  [k: string]: unknown;
};

type Props = {
  root: any;
  selectedPath: FlexPath | null;
  onSelect: (path: FlexPath) => void;
};

const TYPE_COLORS: Record<string, string> = {
  bubble: "text-purple-600 dark:text-purple-400",
  carousel: "text-purple-600 dark:text-purple-400",
  box: "text-sky-600 dark:text-sky-400",
  text: "text-emerald-600 dark:text-emerald-400",
  image: "text-amber-600 dark:text-amber-400",
  button: "text-rose-600 dark:text-rose-400",
  icon: "text-orange-600 dark:text-orange-400",
  separator: "text-zinc-500 dark:text-zinc-400",
  spacer: "text-zinc-500 dark:text-zinc-400",
};

function pathEq(a: FlexPath | null, b: FlexPath): boolean {
  if (!a) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function summarize(node: Node): string {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return `“${(node.text as string) ?? ""}”`;
  if (node.type === "image") return (node.url as string) ? "image" : "";
  if (node.type === "button") {
    const action = (node as any).action;
    return action?.label ? `“${action.label}”` : "";
  }
  if (node.type === "icon") return "";
  if (node.type === "box") return node.layout ? `layout: ${node.layout}` : "";
  return "";
}

function TreeRow({
  node,
  path,
  selectedPath,
  onSelect,
  label,
  depth,
}: {
  node: Node;
  path: FlexPath;
  selectedPath: FlexPath | null;
  onSelect: (p: FlexPath) => void;
  label?: string;
  depth: number;
}) {
  const [open, setOpen] = useState(true);

  if (!node || typeof node !== "object") return null;

  // Determine children sub-nodes
  const childEntries: { key: string | number; subPath: FlexPath; child: Node; label?: string }[] = [];
  if (Array.isArray(node.contents)) {
    node.contents.forEach((c, i) => {
      childEntries.push({ key: i, subPath: [...path, "contents", i], child: c });
    });
  }
  // For bubble: hero/header/body/footer slots
  (["header", "hero", "body", "footer"] as const).forEach((slot) => {
    const v = (node as any)[slot];
    if (v && typeof v === "object") {
      childEntries.push({ key: slot, subPath: [...path, slot], child: v, label: slot });
    }
  });
  // For carousel: contents handled above (bubbles)

  const hasChildren = childEntries.length > 0;
  const isSelected = pathEq(selectedPath, path);
  const typeName = (node.type as string) ?? "unknown";

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(path)}
        className={cn(
          "group flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm hover-elevate",
          isSelected && "bg-primary/10 ring-1 ring-primary/40",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        data-testid={`tree-node-${typeName}`}
      >
        {hasChildren ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        ) : (
          <span className="inline-block h-4 w-4" />
        )}
        {label && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
            {label}
          </span>
        )}
        <span className={cn("font-mono text-xs font-semibold", TYPE_COLORS[typeName] ?? "text-foreground")}>
          {typeName}
        </span>
        <span className="ml-1 truncate text-xs text-muted-foreground">{summarize(node)}</span>
      </button>
      {hasChildren && open && (
        <div>
          {childEntries.map((c) => (
            <TreeRow
              key={`${c.key}-${c.label ?? ""}`}
              node={c.child}
              path={c.subPath}
              selectedPath={selectedPath}
              onSelect={onSelect}
              label={c.label}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FlexTreeView({ root, selectedPath, onSelect }: Props) {
  if (!root || typeof root !== "object") {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        JSON が無効なため、ツリーを表示できません。
      </div>
    );
  }

  // carousel: top is { type: "carousel", contents: [bubble, ...] }
  if (root.type === "carousel" && Array.isArray(root.contents)) {
    return (
      <div className="p-2">
        <TreeRow node={root} path={[]} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
      </div>
    );
  }

  return (
    <div className="p-2">
      <TreeRow node={root} path={[]} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
    </div>
  );
}
