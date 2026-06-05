import { useState, useEffect } from "react";
import { useCourseStore } from "../../stores/course-store";
import { useCommandStore } from "../../stores/command-store";
import CourseForm from "./CourseForm";

interface CourseListProps {
  horizontal?: boolean;
}

export default function CourseList({ horizontal }: CourseListProps) {
  const courses = useCourseStore((s) => s.courses);
  const selectedCourseId = useCourseStore((s) => s.selectedCourseId);
  const selectCourse = useCourseStore((s) => s.selectCourse);
  const deleteCourse = useCourseStore((s) => s.deleteCourse);
  const isLoading = useCourseStore((s) => s.isLoading);
  const [formOpen, setFormOpen] = useState(false);
  const command = useCommandStore((s) => s.pending);

  useEffect(() => {
    if (command?.type === "open-new-course") {
      setFormOpen(true);
    }
  }, [command]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this course and all its data?")) {
      await deleteCourse(id);
    }
  };

  if (horizontal) {
    return (
      <>
        <div className="flex items-center gap-2">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => selectCourse(course.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedCourseId === course.id
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {course.name}
            </button>
          ))}
          <button
            onClick={() => setFormOpen(true)}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + New
          </button>
        </div>
        <CourseForm open={formOpen} onClose={() => setFormOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="p-3">
        <button
          onClick={() => setFormOpen(true)}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + New Course
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && courses.length === 0 && (
          <p className="mt-4 text-center text-sm text-gray-400">Loading...</p>
        )}

        {!isLoading && courses.length === 0 && (
          <p className="mt-4 text-center text-sm text-gray-400">
            No courses yet
          </p>
        )}

        <div className="space-y-1">
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => selectCourse(course.id)}
              className={`group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                selectedCourseId === course.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{course.name}</p>
                {course.description && (
                  <p className="truncate text-xs text-gray-400">
                    {course.description}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => handleDelete(e, course.id)}
                className="ml-2 shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                title="Delete course"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <CourseForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
