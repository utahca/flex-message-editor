import { ChevronDown, ChevronUp, ClipboardPaste, Copy, Files, Layers3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddAction } from "@/lib/flexAdd";

type TreeActionBarProps = {
  selectedPathLabel?: string;
  copiedLabel?: string;
  treeOpen: boolean;
  canWrapRootBubble: boolean;
  addActions: readonly AddAction[];
  addReason?: string;
  canDuplicate: boolean;
  duplicateReason?: string;
  canCopy: boolean;
  copyReason?: string;
  canPaste: boolean;
  pasteReason?: string;
  canDelete: boolean;
  deleteReason?: string;
  onToggleTree: () => void;
  onWrapRootBubble: () => void;
  onAddAction: (action: AddAction) => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
};

function unavailableTitle(canUse: boolean, reason?: string) {
  return canUse ? undefined : reason;
}

export function TreeActionBar({
  selectedPathLabel,
  copiedLabel,
  treeOpen,
  canWrapRootBubble,
  addActions,
  addReason,
  canDuplicate,
  duplicateReason,
  canCopy,
  copyReason,
  canPaste,
  pasteReason,
  canDelete,
  deleteReason,
  onToggleTree,
  onWrapRootBubble,
  onAddAction,
  onDuplicate,
  onCopy,
  onPaste,
  onDelete,
}: TreeActionBarProps) {
  const ToggleIcon = treeOpen ? ChevronDown : ChevronUp;
  const canAdd = addActions.length > 0;

  return (
    <div
      className="relative z-40 flex min-h-9 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2"
      data-testid="tree-action-bar"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-w-0 shrink"
        aria-expanded={treeOpen}
        onClick={onToggleTree}
        data-testid="button-toggle-tree"
      >
        <ToggleIcon className="h-4 w-4" />
        <span>ツリービュー</span>
        {selectedPathLabel && (
          <span
            className="max-w-[14rem] truncate font-mono text-[11px] text-muted-foreground"
            data-testid="text-selected-path"
          >
            {selectedPathLabel}
          </span>
        )}
      </Button>

      {copiedLabel && (
        <span
          className="min-w-0 max-w-full shrink truncate rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
          data-testid="text-copied-node"
        >
          コピー中: {copiedLabel}
        </span>
      )}

      {canWrapRootBubble && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onWrapRootBubble}
          data-testid="button-convert-carousel"
        >
          <Layers3 className="h-4 w-4" />
          Carousel 追加
        </Button>
      )}

      {canAdd ? (
        <details className="relative inline-flex">
          <Button asChild variant="outline" size="sm">
            <summary className="cursor-pointer list-none" data-testid="button-add-node">
              <Plus className="h-4 w-4" />
              + 追加
            </summary>
          </Button>
          <div
            className="absolute left-0 top-full z-50 mt-1 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            data-testid="menu-add-node"
          >
            {addActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => onAddAction(action)}
                data-testid={`menu-item-${action.id}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </details>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title={addReason}
          data-testid="button-add-node"
        >
          <Plus className="h-4 w-4" />
          + 追加
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canDuplicate}
        title={unavailableTitle(canDuplicate, duplicateReason)}
        onClick={onDuplicate}
        data-testid="button-duplicate-node"
      >
        <Files className="h-4 w-4" />
        複製
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canCopy}
        title={unavailableTitle(canCopy, copyReason)}
        onClick={onCopy}
        data-testid="button-copy-node"
      >
        <Copy className="h-4 w-4" />
        コピー
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canPaste}
        title={unavailableTitle(canPaste, pasteReason)}
        onClick={onPaste}
        data-testid="button-paste-node"
      >
        <ClipboardPaste className="h-4 w-4" />
        ペースト
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canDelete}
        title={unavailableTitle(canDelete, deleteReason)}
        onClick={onDelete}
        data-testid="button-delete-node"
      >
        <Trash2 className="h-4 w-4" />
        削除
      </Button>
    </div>
  );
}
