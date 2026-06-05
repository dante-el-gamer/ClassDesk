import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGridStore, indexPlacements, getPlacedStudentIds } from "./grid-store";
import type { SeatingLayout } from "../types";

// Mock the entire API module
vi.mock("../lib/api", () => ({
  saveLayout: vi.fn(),
  getLayout: vi.fn(),
  listLayouts: vi.fn(),
  deleteLayout: vi.fn(),
}));

import * as api from "../lib/api";
const mockedApi = vi.mocked(api);

// ── Fixtures ──────────────────────────────────────────────────────────────

const makeLayout = (
  overrides: Partial<SeatingLayout> = {},
): SeatingLayout => ({
  id: "layout-001",
  course_id: "course-001",
  name: "Default Layout",
  rows: 4,
  cols: 4,
  placements: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const defaultState = {
  layouts: [],
  activeLayout: null,
  isLoading: false,
  isSaving: false,
  error: null,
  dragState: { activeId: null, overId: null },
};

// ── indexPlacements ───────────────────────────────────────────────────────

describe("indexPlacements", () => {
  it("returns an empty map for empty placements", () => {
    const index = indexPlacements({});
    expect(index.size).toBe(0);
  });

  it("indexes placements by row,col key", () => {
    const placements = {
      "student-1": { row: 1, col: 1 },
      "student-2": { row: 1, col: 2 },
    };
    const index = indexPlacements(placements);
    expect(index.get("1,1")).toBe("student-1");
    expect(index.get("1,2")).toBe("student-2");
  });
});

describe("getPlacedStudentIds", () => {
  it("returns empty array for empty placements", () => {
    expect(getPlacedStudentIds({})).toEqual([]);
  });

  it("returns all placed student IDs", () => {
    const placements = {
      "s1": { row: 1, col: 1 },
      "s2": { row: 2, col: 2 },
    };
    const ids = getPlacedStudentIds(placements);
    expect(ids).toHaveLength(2);
    expect(ids).toContain("s1");
    expect(ids).toContain("s2");
  });
});

// ── Grid store ────────────────────────────────────────────────────────────

describe("gridStore", () => {
  beforeEach(() => {
    useGridStore.setState(defaultState);
    vi.clearAllMocks();
  });

  // ── Load/Create/Select Layout ──────────────────────────────────────────

  describe("loadLayouts", () => {
    it("loads layouts from API and updates state", async () => {
      const layouts = [makeLayout({ name: "Physics Layout" })];
      mockedApi.listLayouts.mockResolvedValue(layouts);

      await useGridStore.getState().loadLayouts("course-001");

      const state = useGridStore.getState();
      expect(state.layouts).toEqual(layouts);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("handles API errors gracefully", async () => {
      mockedApi.listLayouts.mockRejectedValue(new Error("Network error"));

      await useGridStore.getState().loadLayouts("course-001");

      const state = useGridStore.getState();
      expect(state.layouts).toEqual([]);
      expect(state.error).toBe("Network error");
      expect(state.isLoading).toBe(false);
    });

    it("clears activeLayout if it no longer exists in loaded layouts", async () => {
      const staleLayout = makeLayout({ id: "stale-id" });
      useGridStore.setState({
        activeLayout: staleLayout,
      });
      mockedApi.listLayouts.mockResolvedValue([
        makeLayout({ id: "other-layout" }),
      ]);

      await useGridStore.getState().loadLayouts("course-001");

      expect(useGridStore.getState().activeLayout).toBeNull();
    });
  });

  describe("createLayout", () => {
    it("calls API and sets as active layout", async () => {
      const layout = makeLayout();
      mockedApi.saveLayout.mockResolvedValue(layout);

      await useGridStore.getState().createLayout(
        "course-001",
        "Default Layout",
        4,
        4,
      );

      expect(mockedApi.saveLayout).toHaveBeenCalledWith(
        "course-001",
        "Default Layout",
        4,
        4,
        {},
      );
      const state = useGridStore.getState();
      expect(state.layouts).toHaveLength(1);
      expect(state.activeLayout?.id).toBe("layout-001");
      expect(state.error).toBeNull();
    });

    it("clamps out-of-range dimensions", async () => {
      const layout = makeLayout({ rows: 1, cols: 20 });
      mockedApi.saveLayout.mockResolvedValue(layout);

      await useGridStore.getState().createLayout(
        "course-001",
        "Clamped",
        0,
        25,
      );

      // The API receives clamped values
      expect(mockedApi.saveLayout).toHaveBeenCalledWith(
        "course-001",
        "Clamped",
        1,
        20,
        {},
      );
    });
  });

  describe("selectLayout", () => {
    it("sets the active layout", () => {
      const layout = makeLayout();
      useGridStore.getState().selectLayout(layout);
      expect(useGridStore.getState().activeLayout).toBe(layout);
    });

    it("clears active layout when passing null", () => {
      useGridStore.setState({ activeLayout: makeLayout() });
      useGridStore.getState().selectLayout(null);
      expect(useGridStore.getState().activeLayout).toBeNull();
    });
  });

  describe("deleteLayout", () => {
    it("removes layout and clears active if deleted", async () => {
      const layout = makeLayout();
      useGridStore.setState({
        layouts: [layout],
        activeLayout: layout,
      });
      mockedApi.deleteLayout.mockResolvedValue(undefined);

      await useGridStore.getState().deleteLayout(layout.id);

      expect(mockedApi.deleteLayout).toHaveBeenCalledWith(layout.id);
      const state = useGridStore.getState();
      expect(state.layouts).toHaveLength(0);
      expect(state.activeLayout).toBeNull();
    });
  });

  // ── Grid dimensions ─────────────────────────────────────────────────────

  describe("setRows / setCols", () => {
    it("clamps rows to 1-20 range", () => {
      const layout = makeLayout();
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().setRows(0);
      expect(useGridStore.getState().activeLayout?.rows).toBe(1);

      useGridStore.getState().setRows(25);
      expect(useGridStore.getState().activeLayout?.rows).toBe(20);
    });

    it("clamps cols to 1-20 range", () => {
      const layout = makeLayout();
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().setCols(0);
      expect(useGridStore.getState().activeLayout?.cols).toBe(1);

      useGridStore.getState().setCols(25);
      expect(useGridStore.getState().activeLayout?.cols).toBe(20);
    });

    it("removes placements that exceed the new row boundary", () => {
      const layout = makeLayout({
        rows: 5,
        cols: 5,
        placements: {
          "s1": { row: 5, col: 1 },
          "s2": { row: 3, col: 3 },
        },
      });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().setRows(4);

      const placements = useGridStore.getState().activeLayout!.placements;
      expect(placements["s1"]).toBeUndefined();
      expect(placements["s2"]).toEqual({ row: 3, col: 3 });
    });

    it("removes placements that exceed the new col boundary", () => {
      const layout = makeLayout({
        rows: 5,
        cols: 5,
        placements: {
          "s1": { row: 1, col: 5 },
          "s2": { row: 3, col: 3 },
        },
      });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().setCols(4);

      const placements = useGridStore.getState().activeLayout!.placements;
      expect(placements["s1"]).toBeUndefined();
      expect(placements["s2"]).toEqual({ row: 3, col: 3 });
    });
  });

  // ── Placements ──────────────────────────────────────────────────────────

  describe("placeStudent", () => {
    it("places a student in an empty cell", () => {
      const layout = makeLayout({ rows: 4, cols: 4 });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().placeStudent("student-1", 2, 3);

      const placements =
        useGridStore.getState().activeLayout!.placements;
      expect(placements["student-1"]).toEqual({ row: 2, col: 3 });
    });

    it("ignores placement outside grid bounds", () => {
      const layout = makeLayout({ rows: 4, cols: 4 });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().placeStudent("student-1", 5, 5);

      expect(
        useGridStore.getState().activeLayout!.placements,
      ).toEqual({});
    });

    it("replaces existing placement when same student is re-placed", () => {
      const layout = makeLayout({
        rows: 4,
        cols: 4,
        placements: { "student-1": { row: 1, col: 1 } },
      });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().placeStudent("student-1", 3, 2);

      expect(
        useGridStore.getState().activeLayout!.placements["student-1"],
      ).toEqual({ row: 3, col: 2 });
    });
  });

  describe("removeStudent", () => {
    it("removes a student from the grid", () => {
      const layout = makeLayout({
        placements: { "student-1": { row: 1, col: 1 } },
      });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().removeStudent("student-1");

      expect(
        useGridStore.getState().activeLayout!.placements,
      ).toEqual({});
    });
  });

  describe("swapStudents", () => {
    it("swaps positions of two placed students", () => {
      const layout = makeLayout({
        placements: {
          "alice": { row: 2, col: 3 },
          "bob": { row: 4, col: 1 },
        },
      });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().swapStudents("alice", "bob");

      const placements =
        useGridStore.getState().activeLayout!.placements;
      expect(placements["alice"]).toEqual({ row: 4, col: 1 });
      expect(placements["bob"]).toEqual({ row: 2, col: 3 });
    });
  });

  describe("clearPlacements", () => {
    it("clears all placements from the active layout", () => {
      useGridStore.setState({
        activeLayout: makeLayout({
          placements: {
            "s1": { row: 1, col: 1 },
            "s2": { row: 2, col: 2 },
          },
        }),
      });

      useGridStore.getState().clearPlacements();

      expect(
        useGridStore.getState().activeLayout!.placements,
      ).toEqual({});
    });
  });

  // ── Drag-and-drop handlers ──────────────────────────────────────────────

  describe("handleDragStart", () => {
    it("sets the active drag id", () => {
      useGridStore.getState().handleDragStart("student-1");

      expect(useGridStore.getState().dragState).toEqual({
        activeId: "student-1",
        overId: null,
      });
    });
  });

  describe("handleDragOver", () => {
    it("sets the over id", () => {
      useGridStore.setState({
        dragState: { activeId: "student-1", overId: null },
      });

      useGridStore.getState().handleDragOver("cell-2-3");

      expect(useGridStore.getState().dragState).toEqual({
        activeId: "student-1",
        overId: "cell-2-3",
      });
    });

    it("clears the over id when null", () => {
      useGridStore.setState({
        dragState: { activeId: "student-1", overId: "cell-2-3" },
      });

      useGridStore.getState().handleDragOver(null);

      expect(useGridStore.getState().dragState.overId).toBeNull();
    });
  });

  describe("handleDragEnd", () => {
    it("places student when dropped on empty cell", () => {
      const layout = makeLayout({ rows: 4, cols: 4 });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().handleDragEnd(
        "student-1",
        "cell-2-3",
        { row: 2, col: 3 },
        false,
      );

      expect(
        useGridStore.getState().activeLayout!.placements["student-1"],
      ).toEqual({ row: 2, col: 3 });
      expect(
        useGridStore.getState().dragState,
      ).toEqual({ activeId: null, overId: null });
    });

    it("swaps students when dropped on occupied cell", () => {
      const layout = makeLayout({
        rows: 4,
        cols: 4,
        placements: {
          "alice": { row: 2, col: 3 },
          "bob": { row: 4, col: 1 },
        },
      });
      useGridStore.setState({ activeLayout: layout });

      // Drag alice onto bob's cell
      useGridStore.getState().handleDragEnd(
        "alice",
        "cell-4-1",
        { row: 4, col: 1 },
        false,
      );

      const placements =
        useGridStore.getState().activeLayout!.placements;
      expect(placements["alice"]).toEqual({ row: 4, col: 1 });
      expect(placements["bob"]).toEqual({ row: 2, col: 3 });
    });

    it("removes student when dropped on roster", () => {
      const layout = makeLayout({
        placements: { "charlie": { row: 1, col: 1 } },
      });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().handleDragEnd(
        "charlie",
        "roster-drop-area",
        null,
        true,
      );

      expect(
        useGridStore.getState().activeLayout!.placements["charlie"],
      ).toBeUndefined();
    });

    it("resets drag state even on no-op (drop on own cell)", () => {
      const layout = makeLayout({
        placements: { "student-1": { row: 1, col: 1 } },
      });
      useGridStore.setState({ activeLayout: layout });

      useGridStore.getState().handleDragEnd(
        "student-1",
        "cell-1-1",
        { row: 1, col: 1 },
        false,
      );

      // Placement unchanged, drag state reset
      expect(
        useGridStore.getState().activeLayout!.placements["student-1"],
      ).toEqual({ row: 1, col: 1 });
      expect(
        useGridStore.getState().dragState,
      ).toEqual({ activeId: null, overId: null });
    });

    it("does nothing when no activeLayout is set", () => {
      useGridStore.setState({ activeLayout: null });

      // Should not throw
      useGridStore.getState().handleDragEnd(
        "student-1",
        "cell-1-1",
        { row: 1, col: 1 },
        false,
      );

      expect(useGridStore.getState().activeLayout).toBeNull();
    });
  });

  describe("handleDragCancel", () => {
    it("resets drag state", () => {
      useGridStore.setState({
        dragState: { activeId: "student-1", overId: "cell-2-2" },
      });

      useGridStore.getState().handleDragCancel();

      expect(useGridStore.getState().dragState).toEqual({
        activeId: null,
        overId: null,
      });
    });
  });

  // ── Persistence ─────────────────────────────────────────────────────────

  describe("saveActiveLayout", () => {
    it("saves the active layout via API", async () => {
      const layout = makeLayout();
      useGridStore.setState({ activeLayout: layout });
      mockedApi.saveLayout.mockResolvedValue(layout);

      await useGridStore.getState().saveActiveLayout();

      expect(mockedApi.saveLayout).toHaveBeenCalledWith(
        layout.course_id,
        layout.name,
        layout.rows,
        layout.cols,
        layout.placements,
        layout.id,
      );
    });

    it("does nothing if no active layout", async () => {
      useGridStore.setState({ activeLayout: null });

      await useGridStore.getState().saveActiveLayout();

      expect(mockedApi.saveLayout).not.toHaveBeenCalled();
    });
  });
});
