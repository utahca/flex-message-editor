import { Check, Copy, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { JsonEditor } from "@/components/JsonEditor";
import { FlexPreview } from "@/components/FlexPreview";
import { FlexTreeView, type MoveDirection } from "@/components/FlexTreeView";
import { PropertyPanel } from "@/components/PropertyPanel";
import { TreeActionBar } from "@/components/TreeActionBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FlexStudioLogo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { SAMPLE_BUBBLE, SAMPLE_JSON } from "@/lib/sample";
import { copyTextToClipboard, getCopyButtonLabel, type CopyStatus } from "@/lib/clipboard";
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
import { createDefaultNode, getAddableTypesForNode, type AddableType } from "@/lib/flexAdd";

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

export default function Studio() {
  const [jsonText, setJsonText] = useState<string>(() => {
    if (typeof window === "undefined") return SAMPLE_JSON;
    try {
      const saved = window.localStorage.getItem("flex-studio:json");
      return saved ?? SAMPLE_JSON;
    } catch {
      return SAMPLE_JSON;
    }
  });
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

  const parsed = useMemo(() => tryParse(jsonText), [jsonText]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("flex-studio:json", jsonText);
    } catch {
      // Ignore storage errors (e.g. SecurityError in sandboxed/private contexts)
    }
  }, [jsonText]);

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
      setJsonText(JSON.stringify(next, null, 2));
    },
    [parsed],
  );

  const resetSample = useCallback(() => {
    setJsonText(SAMPLE_JSON);
    setSelectedPath(null);
  }, []);

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
  const addableTypes = useMemo((): readonly AddableType[] => {
    if (!selectedPath || !parsed.ok) return [];
    const selected = getAtPath(parsed.value, selectedPath) as any;
    return getAddableTypesForNode(selected);
  }, [selectedPath, parsed]);
  const canAddChild = addableTypes.length > 0;

  const addChild = useCallback((newType: AddableType) => {
    if (!selectedPath || !parsed.ok) return;
    const selected = getAtPath(parsed.value, selectedPath) as any;
    if (!selected || typeof selected !== "object") return;
    if (!getAddableTypesForNode(selected).includes(newType)) return;
    const contents = Array.isArray(selected.contents) ? selected.contents : [];
    const next = setAtPath(parsed.value, [...selectedPath, "contents"], [...contents, createDefaultNode(newType)]);
    setJsonText(JSON.stringify(next, null, 2));
    setSelectedPath([...selectedPath, "contents", contents.length]);
  }, [selectedPath, parsed]);

  const deleteSelected = useCallback(() => {
    if (!selectedPath || !parsed.ok) return;
    const nextSelection = getSelectionAfterDelete(parsed.value, selectedPath);
    const next = deleteNodeAtPath(parsed.value, selectedPath);
    if (next === parsed.value) return;
    setJsonText(JSON.stringify(next, null, 2));
    setSelectedPath(nextSelection);
  }, [selectedPath, parsed]);

  const duplicateSelected = useCallback(() => {
    if (!selectedPath || !parsed.ok) return;
    const next = duplicateNodeAtPath(parsed.value, selectedPath);
    if (next === parsed.value) return;
    setJsonText(JSON.stringify(next, null, 2));
    setSelectedPath(getSelectionAfterDuplicate(selectedPath));
  }, [selectedPath, parsed]);

  const copySelectedNode = useCallback(() => {
    if (!parsed.ok) return;
    setCopiedNode(getCopiedNode(parsed.value, selectedPath));
  }, [parsed, selectedPath]);

  const pasteCopiedNode = useCallback(() => {
    if (!selectedPath || !parsed.ok) return;
    const nextSelection = getSelectionAfterPaste(parsed.value, selectedPath, copiedNode);
    const next = pasteNodeAtPath(parsed.value, selectedPath, copiedNode);
    if (next === parsed.value) return;
    setJsonText(JSON.stringify(next, null, 2));
    setSelectedPath(nextSelection);
  }, [selectedPath, parsed, copiedNode]);

  const convertRootToCarousel = useCallback(() => {
    if (!parsed.ok || !canWrapRootBubbleFromSelection(parsed.value, selectedPath)) return;
    const next = wrapBubbleInCarousel(parsed.value);
    setJsonText(JSON.stringify(next, null, 2));
    setSelectedPath((current) => getSelectionAfterCarouselWrap(current));
  }, [parsed, selectedPath]);

  const moveTreeRow = useCallback((path: FlexPath, direction: MoveDirection) => {
    if (!parsed.ok) return;

    const offset: ArrayMoveOffset = direction === "up" ? -1 : 1;
    const next = moveArrayItemAtPath(parsed.value, path, offset);
    if (next === parsed.value) return;

    setJsonText(JSON.stringify(next, null, 2));
    setSelectedPath((current) =>
      current ? remapPathAfterArrayMove(current, path, offset) : current,
    );
  }, [parsed]);

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

      {/* MAIN */}
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* LEFT: JSON EDITOR */}
        <section
          className="flex h-[40vh] min-h-0 shrink-0 flex-col border-b border-border lg:h-auto lg:w-1/2 lg:flex-1 lg:border-b-0 lg:border-r"
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
            <JsonEditor value={jsonText} onChange={setJsonText} dark={dark} />
          </div>
        </section>

        {/* RIGHT: PREVIEW + TREE */}
        <section className="flex min-h-0 flex-1 flex-col lg:w-1/2 lg:flex-1">
          {/* Preview */}
          <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
            <div className="flex h-9 shrink-0 items-center border-b border-border bg-muted/40 px-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Preview
              </span>
            </div>
            {/* LINE-talk-style framing */}
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
          </div>

          {/* Tree */}
          <div
            className={
              "flex shrink-0 flex-col border-t border-border bg-card transition-[max-height] " +
              (treeOpen ? "max-h-[45vh]" : "max-h-9")
            }
            data-testid="pane-tree"
          >
            <TreeActionBar
              selectedPathLabel={selectedPath ? formatPath(selectedPath) : undefined}
              copiedLabel={operationState.copiedLabel}
              treeOpen={treeOpen}
              canWrapRootBubble={canConvertRootToCarousel}
              canAddChild={canAddChild}
              addableTypes={addableTypes}
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
              onAddChild={addChild}
              onDuplicate={duplicateSelected}
              onCopy={copySelectedNode}
              onPaste={pasteCopiedNode}
              onDelete={deleteSelected}
            />
            {treeOpen && (
              <div className="flex min-h-0 flex-1">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <FlexTreeView
                    root={parsed.ok ? parsed.value : null}
                    selectedPath={selectedPath}
                    onSelect={handleSelect}
                    onMove={moveTreeRow}
                  />
                </div>
                {selectedPath && selectedNode != null && (
                  <div className="hidden w-[280px] shrink-0 md:block">
                    <PropertyPanel
                      node={selectedNode as any}
                      path={selectedPath}
                      root={parsed.ok ? parsed.value : null}
                      onChange={handlePropertyChange}
                      onSelectPath={handleSelect}
                      onClose={() => setSelectedPath(null)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Mobile property panel — full-screen overlay */}
      {selectedPath && selectedNode != null && (
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
      )}
    </div>
  );
}
