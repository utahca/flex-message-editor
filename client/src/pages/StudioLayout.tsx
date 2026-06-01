import type { ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

type StudioLayoutProps = {
  desktop: boolean;
  treeOpen: boolean;
  editor: ReactNode;
  preview: ReactNode;
  treeToolbar: ReactNode;
  tree: ReactNode;
  property: ReactNode | null;
  mobileProperty: ReactNode;
};

function TreePanel({
  toolbar,
  tree,
  property,
  desktop,
  open,
}: {
  toolbar: ReactNode;
  tree: ReactNode;
  property: ReactNode | null;
  desktop: boolean;
  open: boolean;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col border-t border-border bg-card ${open ? "h-full" : "shrink-0"}`}
      data-testid="pane-tree"
    >
      {toolbar}
      {open && (
        <div className="flex min-h-0 flex-1">
          {desktop && property ? (
            <ResizablePanelGroup direction="horizontal" className="min-h-0">
              <ResizablePanel defaultSize={65} minSize={35}>
                <div className="min-h-0 flex-1 overflow-y-auto">{tree}</div>
              </ResizablePanel>
              <ResizableHandle withHandle data-testid="resize-handle-tree-property" />
              <ResizablePanel defaultSize={35} minSize={25}>
                <div className="min-h-0 min-w-[260px]">{property}</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">{tree}</div>
          )}
        </div>
      )}
    </section>
  );
}

export function StudioLayout({
  desktop,
  treeOpen,
  editor,
  preview,
  treeToolbar,
  tree,
  property,
  mobileProperty,
}: StudioLayoutProps) {
  if (!desktop) {
    return (
      <main className="flex min-h-0 flex-1 flex-col lg:hidden" data-testid="studio-mobile-layout">
        {editor}
        {preview}
        <TreePanel toolbar={treeToolbar} tree={tree} property={null} desktop={false} open={treeOpen} />
        {mobileProperty}
      </main>
    );
  }

  return (
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
          {treeOpen ? (
            <ResizablePanelGroup direction="vertical" className="min-h-0">
              <ResizablePanel defaultSize={60} minSize={35}>
                {preview}
              </ResizablePanel>
              <ResizableHandle withHandle data-testid="resize-handle-preview-tree" />
              <ResizablePanel defaultSize={40} minSize={25}>
                <TreePanel toolbar={treeToolbar} tree={tree} property={property} desktop={true} open={treeOpen} />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1">
                {preview}
              </div>
              <TreePanel toolbar={treeToolbar} tree={tree} property={null} desktop={true} open={treeOpen} />
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
