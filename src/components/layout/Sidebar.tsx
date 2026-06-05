import CourseList from "../course/CourseList";
import type { SidebarPosition } from "../../types";

interface SidebarProps {
  position: SidebarPosition;
}

export default function Sidebar({ position }: SidebarProps) {
  const isHorizontal = position === "top" || position === "bottom";

  if (isHorizontal) {
    return (
      <aside className="flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Courses
        </h2>
        <div className="flex-1 overflow-x-auto">
          <CourseList horizontal />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Courses
        </h2>
      </div>
      <CourseList horizontal={false} />
    </aside>
  );
}
