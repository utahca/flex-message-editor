import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPath, type FlexPath } from "@/lib/flexPath";

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
  onMove?: (path: FlexPath, direction: MoveDirection) => void;
};

export type MoveDirection = "up" | "down";

type ReorderBounds = {
  index: number;
  count: number;
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
  onMove,
  label,
  depth,
  reorderBounds,
}: {
  node: Node;
  path: FlexPath;
  selectedPath: FlexPath | null;
  onSelect: (p: FlexPath) => void;
  onMove?: (path: FlexPath, direction: MoveDirection) => void;
  label?: string;
  depth: number;
  reorderBounds?: ReorderBounds;
}) {
  const [open, setOpen] = useState(true);

  if (!node || typeof node !== "object") return null;

  // Determine children sub-nodes
  const childEntries: { key: string | number; subPath: FlexPath; child: Node; label?: string; reorderBounds?: ReorderBounds }[] = [];
  if (Array.isArray(node.contents)) {
    node.contents.forEach((c, i) => {
      childEntries.push({
        key: i,
        subPath: [...path, "contents", i],
        child: c,
        reorderBounds: { index: i, count: node.contents!.length },
      });
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
  const moveLabel = formatPath(path);

  return (
    <div>
      <div className="group flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSelect(path)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1 text-left text-sm hover-elevate",
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
        {onMove && reorderBounds && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={`${moveLabel} を上へ移動`}
              title="上へ移動"
              data-testid={`button-move-up-${moveLabel}`}
              disabled={reorderBounds.index === 0}
              onClick={() => onMove(path, "up")}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={`${moveLabel} を下へ移動`}
              title="下へ移動"
              data-testid={`button-move-down-${moveLabel}`}
              disabled={reorderBounds.index === reorderBounds.count - 1}
              onClick={() => onMove(path, "down")}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      {hasChildren && open && (
        <div>
          {childEntries.map((c) => (
            <TreeRow
              key={`${c.key}-${c.label ?? ""}`}
              node={c.child}
              path={c.subPath}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onMove={onMove}
              label={c.label}
              depth={depth + 1}
              reorderBounds={c.reorderBounds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FlexTreeView({ root, selectedPath, onSelect, onMove }: Props) {
  if (!root || typeof root !== "object") {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        JSON が無効なため、ツリーを表示できません。
      </div>
    );
  }

  return (
    <div className="p-2">
      <TreeRow node={root} path={[]} selectedPath={selectedPath} onSelect={onSelect} onMove={onMove} depth={0} />
    </div>
  );
}
