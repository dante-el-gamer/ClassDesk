import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useCourseStore } from "../../stores/course-store";
import { validateName } from "../../stores/course-store";
import type { Student } from "../../types";

interface StudentFormProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  student?: Student | null;
}

export default function StudentForm({
  open,
  onClose,
  courseId,
  student,
}: StudentFormProps) {
  const createStudent = useCourseStore((s) => s.createStudent);
  const updateStudent = useCourseStore((s) => s.updateStudent);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!student;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(student?.name ?? "");
      setStudentId(student?.student_id ?? "");
      setError(null);
      setIsSubmitting(false);
    }
  }, [open, student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateName(name, "Student");
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && student) {
        await updateStudent(
          student.id,
          name.trim(),
          studentId.trim() || null,
        );
      } else {
        await createStudent(
          courseId,
          name.trim(),
          studentId.trim() || undefined,
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-gray-800">
            {isEditing ? "Edit Student" : "Add Student"}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="student-name"
                className="block text-sm font-medium text-gray-700"
              >
                Student Name
              </label>
              <input
                id="student-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Alice"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="student-id"
                className="block text-sm font-medium text-gray-700"
              >
                Student ID (optional)
              </label>
              <input
                id="student-id"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. S1001"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Update Student"
                    : "Add Student"}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
