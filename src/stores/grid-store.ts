import { create } from "zustand";
import * as api from "../lib/api";
import type { SeatingLayout, SeatPosition } from "../types";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extract the student IDs that are placed in the active layout. */
export function getPlacedStudentIds(
  placements: Record<string, SeatPosition>,
): string[] {
  return Object.keys(placements);
}

/** Return placements keyed by `"row,col"` for O(1) lookup. */
export function indexPlacements(
  placements: Record<string, SeatPosition>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [studentId, pos] of Object.entries(placements)) {
    map.set(`${pos.row},${pos.col}`, studentId);
  }
  return map;
}

/** Clamp a number between min and max (inclusive). */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── State shape ────────────────────────────────────────────────────────────

interface DragState {
  activeId: string | null;
  overId: string | null;
}

interface GridState {
  // Layout list for selected course
  layouts: SeatingLayout[];
  activeLayout: SeatingLayout | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Drag-and-drop transient state
  dragState: DragState;

  // Layout actions
  loadLayouts: (courseId: string) => Promise<void>;
  createLayout: (
    courseId: string,
    name: string,
    rows: number,
    cols: number,
  ) => Promise<void>;
  selectLayout: (layout: SeatingLayout | null) => void;
  updateLayout: (
    id: string,
    courseId: string,
    name: string,
    rows: number,
    cols: number,
    placements: Record<string, SeatPosition>,
  ) => Promise<void>;
  deleteLayout: (id: string) => Promise<void>;

  // Grid dimension actions
  setRows: (rows: number) => void;
  setCols: (cols: number) => void;

  // Placement actions
  placeStudent: (studentId: string, row: number, col: number) => void;
  removeStudent: (studentId: string) => void;
  swapStudents: (studentIdA: string, studentIdB: string) => void;
  clearPlacements: () => void;

  // Drag-and-drop handlers
  handleDragStart: (activeId: string) => void;
  handleDragOver: (overId: string | null) => void;
  handleDragEnd: (
    activeId: string,
    overId: string | null,
    overData?: { row: number; col: number } | null,
    rosterDrop?: boolean,
  ) => void;
  handleDragCancel: () => void;

  // Persistence
  saveActiveLayout: () => Promise<void>;

  // UI state
  clearError: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useGridStore = create<GridState>((set, get) => ({
  // Initial state
  layouts: [],
  activeLayout: null,
  isLoading: false,
  isSaving: false,
  error: null,
  dragState: { activeId: null, overId: null },

  // ── Layout actions ─────────────────────────────────────────────────────

  loadLayouts: async (courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const layouts = await api.listLayouts(courseId);
      set({ layouts, isLoading: false });
      // If a layout was active and still exists in the list, keep it selected
      const current = get().activeLayout;
      if (current && !layouts.some((l) => l.id === current.id)) {
        set({ activeLayout: null });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  createLayout: async (
    courseId: string,
    name: string,
    rows: number,
    cols: number,
  ) => {
    set({ error: null });
    try {
      const layout = await api.saveLayout(
        courseId,
        name,
        clamp(rows, 1, 20),
        clamp(cols, 1, 20),
        {},
      );
      set((state) => ({
        layouts: [layout, ...state.layouts],
        activeLayout: layout,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  selectLayout: (layout: SeatingLayout | null) => {
    set({ activeLayout: layout });
  },

  updateLayout: async (
    id: string,
    courseId: string,
    name: string,
    rows: number,
    cols: number,
    placements: Record<string, SeatPosition>,
  ) => {
    set({ error: null });
    try {
      const updated = await api.saveLayout(
        courseId,
        name,
        clamp(rows, 1, 20),
        clamp(cols, 1, 20),
        placements,
        id,
      );
      set((state) => ({
        layouts: state.layouts.map((l) => (l.id === id ? updated : l)),
        activeLayout: state.activeLayout?.id === id ? updated : state.activeLayout,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  deleteLayout: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteLayout(id);
      set((state) => ({
        layouts: state.layouts.filter((l) => l.id !== id),
        activeLayout:
          state.activeLayout?.id === id ? null : state.activeLayout,
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  // ── Grid dimension actions ─────────────────────────────────────────────

  setRows: (rows: number) => {
    const layout = get().activeLayout;
    if (!layout) return;
    const clamped = clamp(rows, 1, 20);
    // Remove placements that would be out of bounds
    const placements = { ...layout.placements };
    for (const [studentId, pos] of Object.entries(placements)) {
      if (pos.row > clamped) {
        delete placements[studentId];
      }
    }
    set({
      activeLayout: { ...layout, rows: clamped, placements },
    });
  },

  setCols: (cols: number) => {
    const layout = get().activeLayout;
    if (!layout) return;
    const clamped = clamp(cols, 1, 20);
    // Remove placements that would be out of bounds
    const placements = { ...layout.placements };
    for (const [studentId, pos] of Object.entries(placements)) {
      if (pos.col > clamped) {
        delete placements[studentId];
      }
    }
    set({
      activeLayout: { ...layout, cols: clamped, placements },
    });
  },

  // ── Placement actions ──────────────────────────────────────────────────

  placeStudent: (studentId: string, row: number, col: number) => {
    const layout = get().activeLayout;
    if (!layout) return;
    if (row < 1 || row > layout.rows || col < 1 || col > layout.cols) return;

    const placements = { ...layout.placements };
    placements[studentId] = { row, col };
    set({ activeLayout: { ...layout, placements } });
  },

  removeStudent: (studentId: string) => {
    const layout = get().activeLayout;
    if (!layout) return;
    const placements = { ...layout.placements };
    delete placements[studentId];
    set({ activeLayout: { ...layout, placements } });
  },

  swapStudents: (studentIdA: string, studentIdB: string) => {
    const layout = get().activeLayout;
    if (!layout) return;

    const placements = { ...layout.placements };
    const posA = placements[studentIdA];
    const posB = placements[studentIdB];

    if (!posA || !posB) return;

    placements[studentIdA] = posB;
    placements[studentIdB] = posA;
    set({ activeLayout: { ...layout, placements } });
  },

  clearPlacements: () => {
    const layout = get().activeLayout;
    if (!layout) return;
    set({ activeLayout: { ...layout, placements: {} } });
  },

  // ── Drag-and-drop handlers ─────────────────────────────────────────────

  handleDragStart: (activeId: string) => {
    set({ dragState: { activeId, overId: null } });
  },

  handleDragOver: (overId: string | null) => {
    set((state) => ({
      dragState: { ...state.dragState, overId },
    }));
  },

  handleDragEnd: (
    activeId: string,
    overId: string | null,
    overData?: { row: number; col: number } | null,
    rosterDrop?: boolean,
  ) => {
    const { activeLayout } = get();

    // Reset drag state
    set({ dragState: { activeId: null, overId: null } });

    if (!activeLayout) return;

    // Dropped on roster → remove from grid
    if (rosterDrop) {
      get().removeStudent(activeId);
      return;
    }

    // Dropped on a grid cell
    if (overData) {
      const { row, col } = overData;

      // Check if cell is occupied
      const index = indexPlacements(activeLayout.placements);
      const occupant = index.get(`${row},${col}`);

      if (occupant && occupant !== activeId) {
        // Swap
        get().swapStudents(activeId, occupant);
      } else if (!occupant) {
        // Place or move
        get().placeStudent(activeId, row, col);
      }
      // If occupant === activeId, no-op (dropped on own cell)
    }
  },

  handleDragCancel: () => {
    set({ dragState: { activeId: null, overId: null } });
  },

  // ── Persistence ────────────────────────────────────────────────────────

  saveActiveLayout: async () => {
    const layout = get().activeLayout;
    if (!layout) return;

    set({ isSaving: true, error: null });
    try {
      const updated = await api.saveLayout(
        layout.course_id,
        layout.name,
        layout.rows,
        layout.cols,
        layout.placements,
        layout.id,
      );
      set((state) => ({
        layouts: state.layouts.map((l) => (l.id === layout.id ? updated : l)),
        activeLayout: updated,
        isSaving: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isSaving: false,
      });
    }
  },

  // ── UI state ───────────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
}));
