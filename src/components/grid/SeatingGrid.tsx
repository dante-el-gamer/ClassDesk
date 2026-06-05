import { useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useGridStore, indexPlacements } from "../../stores/grid-store";
import { useCourseStore } from "../../stores/course-store";
import { useCommandStore } from "../../stores/command-store";
import GridCell from "./GridCell";
import StudentCard from "./StudentCard";
import GridConfig from "./GridConfig";
import type { Student } from "../../types";

interface SeatingGridProps {
  courseId: string;
}

/** A droppable wrapper for the roster area (used for removing placed students). */
function RosterDropArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "roster-drop-area",
    data: { type: "roster" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border min-h-[100px] transition-colors ${
        isOver ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Render the full seating grid area: dimension configurator + grid + roster palette.
 * Relies on the grid-store having an activeLayout set.
 */
export default function SeatingGrid({ courseId }: SeatingGridProps) {
  const activeLayout = useGridStore((s) => s.activeLayout);
  const layouts = useGridStore((s) => s.layouts);
  const loadLayouts = useGridStore((s) => s.loadLayouts);
  const createLayout = useGridStore((s) => s.createLayout);
  const selectLayout = useGridStore((s) => s.selectLayout);
  const deleteLayout = useGridStore((s) => s.deleteLayout);
  const saveActiveLayout = useGridStore((s) => s.saveActiveLayout);
  const isSaving = useGridStore((s) => s.isSaving);
  const gridError = useGridStore((s) => s.error);
  const clearGridError = useGridStore((s) => s.clearError);
  const handleDragStart = useGridStore((s) => s.handleDragStart);
  const handleDragOver = useGridStore((s) => s.handleDragOver);
  const handleDragEnd = useGridStore((s) => s.handleDragEnd);
  const handleDragCancel = useGridStore((s) => s.handleDragCancel);
  const dragState = useGridStore((s) => s.dragState);
  const command = useCommandStore((s) => s.pending);

  useEffect(() => {
    if (command?.type === "save-active-layout" && activeLayout) {
      saveActiveLayout();
    }
  }, [command, activeLayout, saveActiveLayout]);

  const courseStudents: Student[] = useCourseStore(
    (s) => s.students[courseId] || [],
  );

  const layoutName = activeLayout?.name ?? "Unnamed Layout";

  // ── DnD sensors ──────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // ── Placement index for O(1) cell lookup ────────────────────────────────

  const placementIndex = useMemo(
    () =>
      activeLayout
        ? indexPlacements(activeLayout.placements)
        : new Map<string, string>(),
    [activeLayout],
  );

  const getStudentName = useCallback(
    (studentId: string): string => {
      const student = courseStudents.find((s) => s.id === studentId);
      return student?.name ?? "Unknown";
    },
    [courseStudents],
  );

  const getStudentAt = useCallback(
    (row: number, col: number): { id: string; name: string } | null => {
      const studentId = placementIndex.get(`${row},${col}`);
      if (!studentId) return null;
      return { id: studentId, name: getStudentName(studentId) };
    },
    [placementIndex, getStudentName],
  );

  // Unplaced students (not in any cell of the active layout)
  const unplacedStudents = useMemo(() => {
    if (!activeLayout) return courseStudents;
    const placedIds = new Set(Object.keys(activeLayout.placements));
    return courseStudents.filter((s) => !placedIds.has(s.id));
  }, [activeLayout, courseStudents]);

  // Currently dragging student
  const draggingStudent = dragState.activeId
    ? courseStudents.find((s) => s.id === dragState.activeId)
    : null;

  // ── Event handlers ───────────────────────────────────────────────────────

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      handleDragStart(String(event.active.id));
    },
    [handleDragStart],
  );

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      handleDragOver(event.over ? String(event.over.id) : null);
    },
    [handleDragOver],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) {
        handleDragCancel();
        return;
      }

      const overId = String(over.id);

      // Dropped on roster area → remove from grid
      if (overId === "roster-drop-area") {
        handleDragEnd(String(active.id), overId, null, true);
        return;
      }

      // Dropped on a grid cell
      const overData = over.data.current as
        | { row: number; col: number; type: string }
        | undefined;

      if (overData?.type === "grid-cell") {
        handleDragEnd(
          String(active.id),
          overId,
          { row: overData.row, col: overData.col },
          false,
        );
      } else {
        handleDragCancel();
      }
    },
    [handleDragEnd, handleDragCancel],
  );

  // ── Layout management ───────────────────────────────────────────────────

  const handleCreateLayout = useCallback(async () => {
    await createLayout(courseId, "Default Layout", 4, 4);
  }, [courseId, createLayout]);

  // ── No active layout state ────────────────────────────────────────────────

  if (!activeLayout) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-lg font-medium">No seating layout selected</p>
        <p className="mt-1 text-sm">
          Create a new layout to start arranging students
        </p>
        <button
          onClick={handleCreateLayout}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Create Default Layout (4×4)
        </button>
      </div>
    );
  }

  // ── Render grid ──────────────────────────────────────────────────────────

  const { rows, cols } = activeLayout;
  const gridCells: React.ReactNode[] = [];

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const occupant = getStudentAt(r, c);
      const cellKey = `cell-${r}-${c}`;
      const isOverCell = dragState.overId === cellKey;

      gridCells.push(
        <GridCell
          key={cellKey}
          row={r}
          col={c}
          isOccupied={!!occupant}
          isOver={isOverCell}
          studentName={occupant?.name}
          studentId={occupant?.id}
        >
          {occupant && (
            <StudentCard
              studentId={occupant.id}
              name={occupant.name}
              isPlaced
            />
          )}
        </GridCell>,
      );
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full gap-6">
        {/* ── Left: Grid area ─────────────────────────────────────────── */}
        <div className="flex-1">
          {/* Error banner */}
          {gridError && (
            <div className="mb-3 flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              <span>{gridError}</span>
              <button
                onClick={clearGridError}
                className="ml-2 font-bold text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {layoutName}
              </h2>
              <p className="text-xs text-gray-400">
                {rows} × {cols} grid ·{" "}
                {Object.keys(activeLayout.placements).length} placed
              </p>
            </div>

            <div className="flex items-center gap-2">
              <GridConfig />
              <button
                onClick={saveActiveLayout}
                disabled={isSaving}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {/* Grid */}
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(72px, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(72px, auto))`,
            }}
          >
            {gridCells}
          </div>
        </div>

        {/* ── Right: Unplaced student palette (draggable) ──────────────── */}
        <div className="w-56 shrink-0 flex flex-col gap-2">
          <RosterDropArea>
            <div className="border-b border-gray-200 px-3 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Unplaced Students ({unplacedStudents.length})
              </h3>
            </div>

            <div className="space-y-1 p-2">
              {unplacedStudents.length === 0 && (
                <p className="py-4 text-center text-xs text-gray-400">
                  All students placed
                </p>
              )}

              {unplacedStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  studentId={student.id}
                  name={student.name}
                  isPlaced={false}
                />
              ))}
            </div>
          </RosterDropArea>

          {/* Layout selector (shown when multiple layouts exist) */}
          {layouts.length > 1 && (
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Layout
              </label>
              <select
                value={activeLayout.id}
                onChange={(e) => {
                  const layout = layouts.find(
                    (l) => l.id === e.target.value,
                  );
                  selectLayout(layout ?? null);
                }}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              >
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Delete layout */}
          <button
            onClick={() => deleteLayout(activeLayout.id)}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
          >
            Delete Layout
          </button>
        </div>
      </div>

      {/* ── Drag overlay ─────────────────────────────────────────────────── */}
      <DragOverlay>
        {draggingStudent ? (
          <div className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-xl ring-2 ring-blue-400 cursor-grabbing">
            {draggingStudent.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
