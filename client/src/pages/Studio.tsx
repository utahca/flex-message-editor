import { Check, Copy, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { JsonEditor } from "@/components/JsonEditor";
import { FlexPreview } from "@/components/FlexPreview";
import { FlexTreeView, type MoveDirection } from "@/components/FlexTreeView";
import { PropertyPanel } from "@/components/PropertyPanel";
import { TreeActionBar } from "@/components/TreeActionBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FlexStudioLogo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { StudioLayout } from "./StudioLayout";
import { SAMPLE_BUBBLE, SAMPLE_JSON } from "@/lib/sample";
import { copyTextToClipboard, getCopyButtonLabel, type CopyStatus } from "@/lib/clipboard";
import {
  createEditHistory,
  pushEditHistory,
  redoEditHistory,
  undoEditHistory,
} from "@/lib/editHistory";
import { getSelectionAfterCarouselWrap, wrapBubbleInCarousel } from "@/lib/flexRoot";
import {
  canWrapRootBubbleFromSelection,
  deleteNodeAtPath,
  duplicateNodeAtPath,
  getCopiedNode,
  getNodeOperationState,
  getSelectionAfterDelete,
  getSelectionAfterDuplicate,
  getSelectionAfterPaste,
  pasteNodeAtPath,
} from "@/lib/flexOperations";
import {
  formatPath,
  getAtPath,
  moveArrayItemAtPath,
  remapPathAfterArrayMove,
  setAtPath,
  type ArrayMoveOffset,
  type FlexPath,
} from "@/lib/flexPath";
import { addNodeByAction, getAddableActions, type AddAction } from "@/lib/flexAdd";

type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

function tryParse(text: string): ParseResult {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function getInitialJsonText(): string {
  if (typeof window === "undefined") return SAMPLE_JSON;
  try {
    const saved = window.localStorage.getItem("flex-studio:json");
    return saved ?? SAMPLE_JSON;
  } catch {
    return SAMPLE_JSON;
  }
}

export default function Studio() {
  const [jsonHistory, setJsonHistory] = useState(() => createEditHistory(getInitialJsonText()));
  const jsonText = jsonHistory.present;
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches,
  );
  const [dark, setDark] = useState<boolean>(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches,
  );
  const [treeOpen, setTreeOpen] = useState(true);
  const [selectedPath, setSelectedPath] = useState<FlexPath | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [copiedNode, setCopiedNode] = useState<unknown>(null);

  // Apply theme class.
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateDesktop = () => setIsDesktop(mediaQuery.matches);
    updateDesktop();
    mediaQuery.addEventListener("change", updateDesktop);
    return () => mediaQuery.removeEventListener("change", updateDesktop);
  }, []);

  const parsed = useMemo(() => tryParse(jsonText), [jsonText]);
  const canUndo = jsonHistory.past.length > 0;
  const canRedo = jsonHistory.future.length > 0;

  const commitJsonText = useCallback((nextText: string) => {
    setJsonHistory((current) => pushEditHistory(current, nextText));
  }, []);

  const undoJsonText = useCallback(() => {
    setJsonHistory((current) => undoEditHistory(current).history);
  }, []);

  const redoJsonText = useCallback(() => {
    setJsonHistory((current) => redoEditHistory(current).history);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("flex-studio:json", jsonText);
    } catch {
      // Ignore storage errors (e.g. SecurityError in sandboxed/private contexts)
    }
  }, [jsonText]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;
      if (!isModifierPressed || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redoJsonText();
        return;
      }
      if (key === "z") {
        event.preventDefault();
        undoJsonText();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        redoJsonText();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redoJsonText, undoJsonText]);

  // The parsed object — only updated when JSON is valid.
  const [lastValidValue, setLastValidValue] = useState<any>(SAMPLE_BUBBLE);
  useEffect(() => {
    if (parsed.ok) {
      setLastValidValue(parsed.value);
    }
  }, [parsed]);

  // The node currently selected via tree (derived from selected path).
  const selectedNode = useMemo(() => {
    if (!selectedPath) return null;
    if (!parsed.ok) return null;
    return getAtPath(parsed.value, selectedPath);
  }, [selectedPath, parsed]);

  // Auto-clear selection if path no longer exists.
  useEffect(() => {
    if (selectedPath && parsed.ok) {
      const v = getAtPath(parsed.value, selectedPath);
      if (v === undefined) setSelectedPath(null);
    }
  }, [selectedPath, parsed]);

  const handleSelect = useCallback((p: FlexPath) => {
    setSelectedPath(p);
  }, []);

  const handlePropertyChange = useCallback(
    (p: FlexPath, value: unknown) => {
      if (!parsed.ok) return;
      const next = setAtPath(parsed.value, p, value);
      commitJsonText(JSON.stringify(next, null, 2));
    },
    [commitJsonText, parsed],
  );

  const resetSample = useCallback(() => {
    commitJsonText(SAMPLE_JSON);
    setSelectedPath(null);
  }, [commitJsonText]);

  const copyJsonToClipboard = useCallback(async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("error");
      return;
    }

    const status = await copyTextToClipboard(
      (text) => navigator.clipboard.writeText(text),
      jsonText,
    );
    setCopyStatus(status);
  }, [jsonText]);

  useEffect(() => {
    if (copyStatus === "idle") return;
    const timeoutId = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copyStatus]);

  const operationState = useMemo(
    () =>
      parsed.ok
        ? getNodeOperationState(parsed.value, selectedPath, copiedNode)
        : getNodeOperationState(null, null, copiedNode),
    [parsed, selectedPath, copiedNode],
  );
  const canConvertRootToCarousel = Boolean(
    parsed.ok && canWrapRootBubbleFromSelection(parsed.value, selectedPath),
  );
  const addActions = useMemo(
    () => (parsed.ok ? getAddableActions(parsed.value, selectedPath) : []),
    [parsed, selectedPath],
  );
  const addReason = selectedPath ? "この場所には追加できません" : "追加先を選択してください";

  const addByAction = useCallback((action: AddAction) => {
    if (!parsed.ok) return;
    const available = getAddableActions(parsed.value, selectedPath);
    if (!available.some((candidate) => candidate.id === action.id)) return;
    const next = addNodeByAction(parsed.value, action);
    if (next === parsed.value) return;
    commitJsonText(JSON.stringify(next, null, 2));
    setSelectedPath(action.selectionPath);
  }, [commitJsonText, parsed, selectedPath]);

  const deleteSelected = useCallback(() => {
    if (!selectedPath || !parsed.ok) return;
    const nextSelection = getSelectionAfterDelete(parsed.value, selectedPath);
    const next = deleteNodeAtPath(parsed.value, selectedPath);
    if (next === parsed.value) return;
    commitJsonText(JSON.stringify(next, null, 2));
    setSelectedPath(nextSelection);
  }, [commitJsonText, selectedPath, parsed]);

  const duplicateSelected = useCallback(() => {
    if (!selectedPath || !parsed.ok) return;
    const next = duplicateNodeAtPath(parsed.value, selectedPath);
    if (next === parsed.value) return;
    commitJsonText(JSON.stringify(next, null, 2));
    setSelectedPath(getSelectionAfterDuplicate(selectedPath));
  }, [commitJsonText, selectedPath, parsed]);

  const copySelectedNode = useCallback(() => {
    if (!parsed.ok) return;
    setCopiedNode(getCopiedNode(parsed.value, selectedPath));
  }, [parsed, selectedPath]);

  const pasteCopiedNode = useCallback(() => {
    if (!selectedPath || !parsed.ok) return;
    const nextSelection = getSelectionAfterPaste(parsed.value, selectedPath, copiedNode);
    const next = pasteNodeAtPath(parsed.value, selectedPath, copiedNode);
    if (next === parsed.value) return;
    commitJsonText(JSON.stringify(next, null, 2));
    setSelectedPath(nextSelection);
  }, [commitJsonText, selectedPath, parsed, copiedNode]);

  const convertRootToCarousel = useCallback(() => {
    if (!parsed.ok || !canWrapRootBubbleFromSelection(parsed.value, selectedPath)) return;
    const next = wrapBubbleInCarousel(parsed.value);
    commitJsonText(JSON.stringify(next, null, 2));
    setSelectedPath((current) => getSelectionAfterCarouselWrap(current));
  }, [commitJsonText, parsed, selectedPath]);

  const moveTreeRow = useCallback((path: FlexPath, direction: MoveDirection) => {
    if (!parsed.ok) return;

    const offset: ArrayMoveOffset = direction === "up" ? -1 : 1;
    const next = moveArrayItemAtPath(parsed.value, path, offset);
    if (next === parsed.value) return;

    commitJsonText(JSON.stringify(next, null, 2));
    setSelectedPath((current) =>
      current ? remapPathAfterArrayMove(current, path, offset) : current,
    );
  }, [commitJsonText, parsed]);

  const editorPane = (
    <section
      className="flex h-[40vh] min-h-0 shrink-0 flex-col border-b border-border lg:h-full lg:border-b-0"
      data-testid="pane-editor"
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border bg-muted/40 px-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          JSON Editor
        </span>
        <div className="flex min-w-0 items-center gap-2">
          {!parsed.ok && (
            <span className="truncate rounded bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive" data-testid="text-parse-error">
              {parsed.error}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 shrink-0 gap-1.5 px-2 text-[10px]"
            onClick={copyJsonToClipboard}
            data-testid="button-copy-json"
          >
            {copyStatus === "success" ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {getCopyButtonLabel(copyStatus)}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <JsonEditor value={jsonText} onChange={commitJsonText} dark={dark} />
      </div>
    </section>
  );

  const previewPane = (
    <section className="flex h-full min-h-0 flex-col bg-muted/30">
      <div className="flex h-9 shrink-0 items-center border-b border-border bg-muted/40 px-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Preview
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-stretch overflow-auto p-4">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="flex items-center gap-2 rounded-t-xl bg-primary/90 px-3 py-2 text-xs font-medium text-primary-foreground">
            <span className="h-2 w-2 rounded-full bg-white/80" />
            Flex Studio
          </div>
          <div className="rounded-b-xl border border-t-0 border-border bg-background/80 p-3 shadow-sm">
            {parsed.ok ? (
              <FlexPreview json={lastValidValue} />
            ) : (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                data-testid="text-preview-error"
              >
                <div className="font-medium">Invalid JSON</div>
                <div className="mt-1 font-mono text-xs opacity-80">{parsed.error}</div>
              </div>
            )}
          </div>
          <div className="mt-2 text-center text-[10px] text-muted-foreground">
            Preview powered by <span className="font-mono">flex-render-react</span>
          </div>
        </div>
      </div>
    </section>
  );

  const treeToolbar = (
    <TreeActionBar
      selectedPathLabel={selectedPath ? formatPath(selectedPath) : undefined}
      copiedLabel={operationState.copiedLabel}
      treeOpen={treeOpen}
      canWrapRootBubble={canConvertRootToCarousel}
      addActions={addActions}
      addReason={addReason}
      canDuplicate={operationState.canDuplicate}
      duplicateReason={operationState.duplicateReason}
      canCopy={operationState.canCopy}
      copyReason={operationState.copyReason}
      canPaste={operationState.canPaste}
      pasteReason={operationState.pasteReason}
      canDelete={operationState.canDelete}
      deleteReason={operationState.deleteReason}
      onToggleTree={() => setTreeOpen((v) => !v)}
      onWrapRootBubble={convertRootToCarousel}
      onAddAction={addByAction}
      onDuplicate={duplicateSelected}
      onCopy={copySelectedNode}
      onPaste={pasteCopiedNode}
      onDelete={deleteSelected}
    />
  );

  const treePane = treeOpen ? (
    <FlexTreeView
      root={parsed.ok ? parsed.value : null}
      selectedPath={selectedPath}
      onSelect={handleSelect}
      onMove={moveTreeRow}
    />
  ) : null;

  const propertyPane = selectedPath && selectedNode != null ? (
    <PropertyPanel
      node={selectedNode as any}
      path={selectedPath}
      root={parsed.ok ? parsed.value : null}
      onChange={handlePropertyChange}
      onSelectPath={handleSelect}
      onClose={() => setSelectedPath(null)}
    />
  ) : null;

  const mobilePropertyPane = selectedPath && selectedNode != null ? (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card shadow-2xl md:hidden">
      <PropertyPanel
        node={selectedNode as any}
        path={selectedPath}
        root={parsed.ok ? parsed.value : null}
        onChange={handlePropertyChange}
        onSelectPath={handleSelect}
        onClose={() => setSelectedPath(null)}
      />
    </div>
  ) : null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* HEADER */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/60 px-4 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <FlexStudioLogo className="h-7 w-7" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight tracking-tight" data-testid="text-logo">
              Flex Studio
            </span>
            <span className="text-[10px] uppercase leading-tight tracking-wider text-muted-foreground">
              LINE Flex Playground
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={undoJsonText}
            disabled={!canUndo}
            title="Undo"
            aria-label="Undo"
            data-testid="button-undo"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={redoJsonText}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo"
            data-testid="button-redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetSample}
            data-testid="button-reset-sample"
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">サンプルに戻す</span>
            <span className="sm:hidden">サンプル</span>
          </Button>
          <ThemeToggle dark={dark} onToggle={() => setDark((v) => !v)} />
        </div>
      </header>

      <StudioLayout
        desktop={isDesktop}
        editor={editorPane}
        preview={previewPane}
        treeToolbar={treeToolbar}
        tree={treePane}
        property={propertyPane}
        mobileProperty={mobilePropertyPane}
      />
    </div>
  );
}
