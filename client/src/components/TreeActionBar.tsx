import { ChevronDown, ChevronUp, ClipboardPaste, Copy, Files, Layers3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddableType } from "@/lib/flexAdd";

type TreeActionBarProps = {
  selectedPathLabel?: string;
  copiedLabel?: string;
  treeOpen: boolean;
  canWrapRootBubble: boolean;
  canAddChild: boolean;
  addableTypes: readonly AddableType[];
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
  onAddChild: (type: AddableType) => void;
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
  canAddChild,
  addableTypes,
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
  onAddChild,
  onDuplicate,
  onCopy,
  onPaste,
  onDelete,
}: TreeActionBarProps) {
  const ToggleIcon = treeOpen ? ChevronDown : ChevronUp;

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

      {canAddChild &&
        addableTypes.map((type) => (
          <Button key={type} type="button" variant="outline" size="sm" onClick={() => onAddChild(type)}>
            <Plus className="h-4 w-4" />
            {type} 追加
          </Button>
        ))}

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
