import { create } from "zustand";
import type { ThemeMode } from "../types";

const STORAGE_KEY = "csm-theme";

function getStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "darker") return v;
  } catch {}
  return "light";
}

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "light") {
    root.classList.remove("dark", "darker");
  } else if (mode === "dark") {
    root.classList.add("dark");
    root.classList.remove("darker");
  } else {
    root.classList.add("dark", "darker");
  }
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getStored();
  if (typeof document !== "undefined") apply(initial);

  return {
    mode: initial,
    setMode: (mode) => {
      localStorage.setItem(STORAGE_KEY, mode);
      apply(mode);
      set({ mode });
    },
    toggle: () => {
      const cycle: Record<ThemeMode, ThemeMode> = {
        light: "dark",
        dark: "darker",
        darker: "light",
      };
      const mode = cycle[get().mode];
      localStorage.setItem(STORAGE_KEY, mode);
      apply(mode);
      set({ mode });
    },
  };
});
