import { useDroppable } from "@dnd-kit/core";

interface GridCellProps {
  row: number;
  col: number;
  isOccupied: boolean;
  isOver: boolean;
  studentName?: string;
  studentId?: string;
  children?: React.ReactNode;
}

export default function GridCell({
  row,
  col,
  isOccupied,
  isOver,
  studentName,
  studentId,
  children,
}: GridCellProps) {
  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col, type: "grid-cell" },
  });

  const highlight = isDropOver || isOver;

  return (
    <div
      ref={setNodeRef}
      data-row={row}
      data-col={col}
      data-student-id={studentId ?? null}
      className={`
        relative flex items-center justify-center rounded-lg border-2
        min-h-[72px] min-w-[72px] transition-all duration-150
        ${
          isOccupied
            ? "border-blue-200 bg-blue-50"
            : "border-dashed border-gray-300 bg-gray-50"
        }
        ${
          highlight && isOccupied
            ? "border-amber-400 bg-amber-50 shadow-md"
            : ""
        }
        ${
          highlight && !isOccupied
            ? "border-blue-400 bg-blue-100 shadow-md"
            : ""
        }
      `}
    >
      {/* Student card or empty indicator */}
      {children}

      {/* Coordinate label (tiny, bottom-right) */}
      <span className="absolute bottom-0.5 right-1 text-[10px] font-medium text-gray-400 select-none">
        {row},{col}
      </span>

      {/* Student name in tooltip style */}
      {studentName && (
        <span className="absolute -top-2 left-1 rounded bg-blue-100 px-1 text-[10px] text-blue-600 truncate max-w-[60px]">
          {studentName}
        </span>
      )}
    </div>
  );
}
