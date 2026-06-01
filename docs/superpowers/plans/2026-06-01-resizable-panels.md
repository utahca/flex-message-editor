# Resizable Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Issue #15 by adding desktop drag-resizable Studio panel boundaries while preserving the current mobile layout.

**Architecture:** Use the existing `react-resizable-panels` wrapper in `client/src/components/ui/resizable.tsx`. Keep application state in `Studio.tsx`; resizing changes layout only and never mutates the Flex Message JSON.

**Tech Stack:** React, TypeScript, Tailwind CSS, `react-resizable-panels`, Node test runner, React server rendering tests.

---

## File Structure

- Modify `client/src/components/ui/resizable.tsx`
  - Make resize handles visibly interactive on hover/focus/drag.
  - Add stable test IDs through existing props.
- Modify `client/src/pages/Studio.tsx`
  - Track the active desktop/mobile breakpoint so Monaco and preview are not mounted twice.
  - Pass existing editor, preview, tree, and property content into `StudioLayout`.
- Create `client/src/pages/StudioLayout.tsx`
  - Own the nested resizable panel structure and mobile fallback.
- Create `client/src/pages/StudioLayout.test.tsx`
  - Server-render `StudioLayout` and assert the resizable layout contract.
- Delete `client/src/lib/treeLayout.ts` and `client/src/lib/treeLayout.test.ts`
  - The old max-height helper is no longer used once panel height is controlled by `react-resizable-panels`.

## Task 1: Add failing layout contract tests

**Files:**
- Create: `client/src/pages/StudioLayout.test.tsx`

- [ ] **Step 1: Write tests that describe the desktop resizable contract**

Create `client/src/pages/StudioLayout.test.tsx` with server-render assertions for:

- `data-testid="studio-desktop-resizable-layout"` exists.
- `data-testid="resize-handle-main"` exists.
- `data-testid="resize-handle-preview-tree"` exists.
- `data-testid="resize-handle-tree-property"` exists.
- `data-testid="studio-mobile-layout"` still exists.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --import tsx --test client/src/pages/StudioLayout.test.tsx
```

Expected: FAIL because `StudioLayout` does not exist yet.

## Task 2: Implement desktop resizable panels

**Files:**
- Modify: `client/src/pages/Studio.tsx`
- Create: `client/src/pages/StudioLayout.tsx`
- Modify: `client/src/components/ui/resizable.tsx`
- Delete: `client/src/lib/treeLayout.ts`
- Delete: `client/src/lib/treeLayout.test.ts`

- [ ] **Step 1: Add `ResizablePanelGroup`, `ResizablePanel`, and `ResizableHandle` imports in `Studio.tsx`**

Use:

```ts
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
```

- [ ] **Step 2: Add `StudioLayout` with desktop-only resizable panels and mobile fallback**

Create `client/src/pages/StudioLayout.tsx`. It should accept `desktop`, `editor`, `preview`, `treeToolbar`, `tree`, `property`, and `mobileProperty` props. When `desktop` is true, render the nested `ResizablePanelGroup` structure. When false, render only the mobile fallback so Monaco and preview are not mounted twice.

- [ ] **Step 3: Extract repeated JSX into local render values inside `Studio`**

Create local render values for:

- `editorPane`
- `previewPane`
- `treeToolbar`
- `treePane`
- `propertyPane`
- `mobilePropertyPane`

These helpers should reuse the existing JSX and handlers without changing behavior.

- [ ] **Step 4: Replace the existing `main` content with `StudioLayout`**

Track the breakpoint in `Studio`:

```ts
const [isDesktop, setIsDesktop] = useState<boolean>(() =>
  typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches,
);

useEffect(() => {
  if (typeof window === "undefined") return;
  const mediaQuery = window.matchMedia("(min-width: 1024px)");
  const updateDesktop = () => setIsDesktop(mediaQuery.matches);
  updateDesktop();
  mediaQuery.addEventListener("change", updateDesktop);
  return () => mediaQuery.removeEventListener("change", updateDesktop);
}, []);
```

Then render:

```tsx
<StudioLayout
  desktop={isDesktop}
  editor={editorPane}
  preview={previewPane}
  treeToolbar={treeToolbar}
  tree={treePane}
  property={propertyPane}
  mobileProperty={mobilePropertyPane}
/>
```

- [ ] **Step 5: Implement nested desktop resizing inside `StudioLayout`**

Use a desktop-only wrapper:

```tsx
<main className="min-h-0 flex-1">
  <ResizablePanelGroup
    direction="horizontal"
    className="min-h-0"
    data-testid="studio-desktop-resizable-layout"
  >
    <ResizablePanel defaultSize={50} minSize={30}>
      {editor}
    </ResizablePanel>
    <ResizableHandle withHandle data-testid="resize-handle-main" />
    <ResizablePanel defaultSize={50} minSize={35}>
      <ResizablePanelGroup direction="vertical" className="min-h-0">
        <ResizablePanel defaultSize={60} minSize={35}>
          {preview}
        </ResizablePanel>
        <ResizableHandle withHandle data-testid="resize-handle-preview-tree" />
        <ResizablePanel defaultSize={40} minSize={25}>
          <TreePanel toolbar={treeToolbar} tree={tree} property={property} desktop={true} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </ResizablePanel>
  </ResizablePanelGroup>
</main>
```

- [ ] **Step 6: Add tree/property nested resizing for desktop selected nodes**

Inside `TreePanel`, when `desktop && property`, render:

```tsx
<ResizablePanelGroup direction="horizontal" className="min-h-0">
  <ResizablePanel defaultSize={65} minSize={35}>
    <div className="min-h-0 flex-1 overflow-y-auto">...</div>
  </ResizablePanel>
  <ResizableHandle withHandle data-testid="resize-handle-tree-property" />
  <ResizablePanel defaultSize={35} minSize={25}>
    <div className="min-h-0 min-w-[260px]">...</div>
  </ResizablePanel>
</ResizablePanelGroup>
```

When no node is selected, render only the tree view without the property handle.

- [ ] **Step 7: Improve handle affordance**

In `client/src/components/ui/resizable.tsx`, extend the handle class with hover/focus/drag styling:

```ts
"transition-colors hover:bg-primary/60 focus-visible:bg-primary/60 data-[resize-handle-state=drag]:bg-primary/70"
```

Keep the existing `withHandle` icon behavior.

## Task 3: Verify and browser-test

**Files:**
- Test: `client/src/pages/StudioLayout.test.tsx`
- Test: existing component and lib tests

- [ ] **Step 1: Run focused test**

```bash
node --import tsx --test client/src/pages/StudioLayout.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

```bash
node --import tsx --test client/src/lib/*.test.ts client/src/components/*.test.tsx client/src/pages/*.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Run type check**

```bash
/Users/yutakakawai/Development/flex-message-editor/node_modules/.bin/tsc -p tsconfig.json
```

Expected: exit 0.

- [ ] **Step 4: Browser verification**

Run the dev server, open the Studio, and verify the three desktop handles drag correctly without breaking editor, preview, tree, or property panel behavior.
