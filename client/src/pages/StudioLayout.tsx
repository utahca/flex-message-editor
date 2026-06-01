import type { ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

type StudioLayoutProps = {
  desktop: boolean;
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
}: {
  toolbar: ReactNode;
  tree: ReactNode;
  property: ReactNode | null;
  desktop: boolean;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col border-t border-border bg-card" data-testid="pane-tree">
      {toolbar}
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
    </section>
  );
}

export function StudioLayout({
  desktop,
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
        <TreePanel toolbar={treeToolbar} tree={tree} property={null} desktop={false} />
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
  );
}
