import { useEffect, useState } from "react";
import { useCourseStore } from "../../stores/course-store";
import StudentForm from "./StudentForm";
import type { Student } from "../../types";

interface StudentRosterProps {
  courseId: string;
}

export default function StudentRoster({ courseId }: StudentRosterProps) {
  const courses = useCourseStore((s) => s.courses);
  const students = useCourseStore((s) => s.students[courseId] || []);
  const loadStudents = useCourseStore((s) => s.loadStudents);
  const deleteStudent = useCourseStore((s) => s.deleteStudent);
  const isLoading = useCourseStore((s) => s.isLoading);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const course = courses.find((c) => c.id === courseId);

  useEffect(() => {
    loadStudents(courseId);
  }, [courseId, loadStudents]);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingStudent(null);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Remove this student from the roster?")) {
      await deleteStudent(id);
    }
  };

  return (
    <div>
      {/* Course header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {course?.name ?? "Unknown Course"}
        </h2>
        {course?.description && (
          <p className="mt-1 text-sm text-gray-500">{course.description}</p>
        )}
      </div>

      {/* Student roster */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Students ({students.length})
          </h3>
          <button
            onClick={handleAdd}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Add Student
          </button>
        </div>

        {isLoading && students.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            Loading...
          </div>
        )}

        {!isLoading && students.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No students enrolled yet. Add a student to get started.
          </div>
        )}

        {students.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {students.map((student) => (
              <li
                key={student.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {student.name}
                    </p>
                    {student.student_id && (
                      <p className="text-xs text-gray-400">
                        ID: {student.student_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(student)}
                    className="rounded p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Edit student"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="rounded p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove student"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <StudentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingStudent(null);
        }}
        courseId={courseId}
        student={editingStudent}
      />
    </div>
  );
}
