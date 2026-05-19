import Editor from "@monaco-editor/react";
import { useMemo } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  dark: boolean;
};

export function JsonEditor({ value, onChange, dark }: Props) {
  const options = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily:
        'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace',
      tabSize: 2,
      wordWrap: "on" as const,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      renderLineHighlight: "line" as const,
      padding: { top: 12, bottom: 12 },
      lineNumbersMinChars: 3,
    }),
    [],
  );

  return (
    <div className="h-full w-full" data-testid="json-editor">
      <Editor
        height="100%"
        defaultLanguage="json"
        value={value}
        theme={dark ? "vs-dark" : "vs"}
        onChange={(v) => onChange(v ?? "")}
        options={options}
      />
    </div>
  );
}
