import { useDraggable } from "@dnd-kit/core";

interface StudentCardProps {
  studentId: string;
  name: string;
  isPlaced: boolean;
}

export default function StudentCard({
  studentId,
  name,
  isPlaced,
}: StudentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: studentId,
      data: { studentId, name, type: "student", isPlaced },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`
        flex cursor-grab items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium
        transition-shadow duration-150 select-none
        ${
          isDragging
            ? "shadow-xl opacity-90 ring-2 ring-blue-400 cursor-grabbing"
            : "shadow-sm hover:shadow-md"
        }
        ${
          isPlaced
            ? "bg-white text-gray-800 border border-blue-200"
            : "bg-blue-600 text-white"
        }
      `}
    >
      <span className="truncate max-w-[56px]">{name}</span>
    </div>
  );
}
