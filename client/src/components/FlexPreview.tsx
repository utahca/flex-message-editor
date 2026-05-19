/**
 * Thin wrapper around the third-party Flex renderer.
 * All other components import this — never `flex-render-react` directly.
 * That way we can swap the renderer later without touching the UI.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { FlexPreview as FlexPreviewBase } from "flex-render-react";
import "flex-render-react/css";

type FlexPreviewProps = {
  json: unknown;
  className?: string;
};

type ErrorBoundaryState = { error: Error | null };

class FlexErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.warn("FlexPreview render error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-testid="text-render-error"
        >
          <div className="font-medium">Invalid Flex Message</div>
          <div className="mt-1 font-mono text-xs opacity-80">{this.state.error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function FlexPreview({ json, className }: FlexPreviewProps) {
  // Stable string key so the ErrorBoundary resets whenever the input changes.
  const key = JSON.stringify(json);
  return (
    <FlexErrorBoundary resetKey={key}>
      <div className={className} data-testid="flex-preview-host">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <FlexPreviewBase json={json as any} />
      </div>
    </FlexErrorBoundary>
  );
}
