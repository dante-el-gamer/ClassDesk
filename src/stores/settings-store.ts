import { create } from "zustand";
import type {
  SidebarPosition,
  KeyBindings,
  KeyBinding,
  ActionId,
} from "../types";

const STORAGE_KEY = "csm-settings";

export const ACTION_LABELS: Record<ActionId, string> = {
  newCourse: "New Course",
  saveLayout: "Save Layout",
  deleteCourse: "Delete Course",
  undo: "Undo",
  toggleTheme: "Toggle Theme",
  openSettings: "Open Settings",
};

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  newCourse: { key: "n", ctrl: true, alt: false, shift: false },
  saveLayout: { key: "s", ctrl: true, alt: false, shift: false },
  deleteCourse: { key: null, ctrl: false, alt: false, shift: false },
  undo: { key: "z", ctrl: true, alt: false, shift: false },
  toggleTheme: { key: "t", ctrl: true, alt: false, shift: true },
  openSettings: { key: ",", ctrl: true, alt: false, shift: false },
};

interface Persisted {
  sidebarPosition: SidebarPosition;
  keyBindings: KeyBindings;
}

function defaults(): Persisted {
  return {
    sidebarPosition: "left",
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
  };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        sidebarPosition: p.sidebarPosition ?? "left",
        keyBindings: { ...DEFAULT_KEY_BINDINGS, ...p.keyBindings },
      };
    }
  } catch {}
  return defaults();
}

function save(s: Persisted) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface SettingsState {
  sidebarPosition: SidebarPosition;
  keyBindings: KeyBindings;
  setSidebarPosition: (pos: SidebarPosition) => void;
  setKeyBinding: (action: ActionId, binding: KeyBinding) => void;
  resetKeyBindings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = load();
  return {
    sidebarPosition: initial.sidebarPosition,
    keyBindings: initial.keyBindings,
    setSidebarPosition: (pos) => {
      set({ sidebarPosition: pos });
      save({ sidebarPosition: pos, keyBindings: get().keyBindings });
    },
    setKeyBinding: (action, binding) => {
      const keyBindings = { ...get().keyBindings, [action]: binding };
      set({ keyBindings });
      save({ sidebarPosition: get().sidebarPosition, keyBindings });
    },
    resetKeyBindings: () => {
      const keyBindings = { ...DEFAULT_KEY_BINDINGS };
      set({ keyBindings });
      save({ sidebarPosition: get().sidebarPosition, keyBindings });
    },
  };
});
