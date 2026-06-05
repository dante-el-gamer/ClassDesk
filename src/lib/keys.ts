import type { KeyBinding } from "../types";

export function formatKeyBinding(b: KeyBinding): string {
  if (!b.key) return "\u2014";
  const parts: string[] = [];
  if (b.ctrl) parts.push("Ctrl");
  if (b.alt) parts.push("Alt");
  if (b.shift) parts.push("Shift");
  parts.push(b.key.length === 1 ? b.key.toUpperCase() : b.key);
  return parts.join("+");
}
