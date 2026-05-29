export type CopyStatus = "idle" | "success" | "error";

export async function copyTextToClipboard(
  writeText: (text: string) => Promise<void>,
  text: string,
): Promise<Exclude<CopyStatus, "idle">> {
  try {
    await writeText(text);
    return "success";
  } catch {
    return "error";
  }
}

export function getCopyButtonLabel(status: CopyStatus): string {
  if (status === "success") return "コピー済み";
  if (status === "error") return "コピー失敗";
  return "コピー";
}
