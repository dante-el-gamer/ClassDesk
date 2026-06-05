import { create } from "zustand";

export type Command =
  | "open-settings"
  | "open-new-course"
  | "save-active-layout"
  | "undo";

interface CommandState {
  pending: { type: Command; ts: number } | null;
  dispatch: (type: Command) => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  pending: null,
  dispatch: (type) => set({ pending: { type, ts: Date.now() } }),
}));
