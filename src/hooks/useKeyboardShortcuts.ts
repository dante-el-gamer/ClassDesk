import { useEffect } from "react";
import { useSettingsStore } from "../stores/settings-store";
import { useThemeStore } from "../stores/theme-store";
import { useCommandStore } from "../stores/command-store";
import type { ActionId, KeyBinding } from "../types";

const FORM_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useKeyboardShortcuts() {
  const keyBindings = useSettingsStore((s) => s.keyBindings);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const dispatch = useCommandStore((s) => s.dispatch);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (FORM_TAGS.has(target.tagName) || target.isContentEditable) return;

      for (const [id, b] of Object.entries(keyBindings) as [ActionId, KeyBinding][]) {
        if (!b.key) continue;
        if (e.key.toLowerCase() !== b.key.toLowerCase()) continue;
        if (b.ctrl !== e.ctrlKey && b.ctrl !== e.metaKey) continue;
        if (b.alt !== e.altKey) continue;
        if (b.shift !== e.shiftKey) continue;

        e.preventDefault();
        e.stopPropagation();

        switch (id) {
          case "toggleTheme":
            toggleTheme();
            break;
          case "openSettings":
            dispatch("open-settings");
            break;
          case "newCourse":
            dispatch("open-new-course");
            break;
          case "saveLayout":
            dispatch("save-active-layout");
            break;
          case "undo":
            dispatch("undo");
            break;
        }
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keyBindings, toggleTheme, dispatch]);
}
