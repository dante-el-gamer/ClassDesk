import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useCourseStore } from "../../stores/course-store";
import { validateName } from "../../stores/course-store";

interface CourseFormProps {
  open: boolean;
  onClose: () => void;
}

export default function CourseForm({ open, onClose }: CourseFormProps) {
  const createCourse = useCourseStore((s) => s.createCourse);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateName(name, "Course");
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await createCourse(name.trim(), description.trim() || undefined);
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
            New Course
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="course-name"
                className="block text-sm font-medium text-gray-700"
              >
                Course Name
              </label>
              <input
                id="course-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Math 301"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="course-description"
                className="block text-sm font-medium text-gray-700"
              >
                Description (optional)
              </label>
              <textarea
                id="course-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Optional description"
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
                {isSubmitting ? "Creating..." : "Create Course"}
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
