import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  dark: boolean;
  onToggle: () => void;
};

export function ThemeToggle({ dark, onToggle }: Props) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      aria-label={dark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      data-testid="button-theme-toggle"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
