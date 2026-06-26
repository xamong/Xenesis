export type PermissionMode =
  | "default"
  | "plan"
  | "acceptEdits"
  | "bypassPermissions"
  | "dontAsk"
  | "auto";

export type PermissionModeInput = PermissionMode | "readonly" | "safe";

export function normalizePermissionMode(mode: PermissionModeInput): PermissionMode {
  if (mode === "readonly") return "plan";
  if (mode === "safe") return "default";
  return mode;
}
