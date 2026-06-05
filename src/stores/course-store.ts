import { create } from "zustand";
import * as api from "../lib/api";
import type { Course, Student } from "../types";

// ── Validation ─────────────────────────────────────────────────────────────

export function validateName(
  name: string,
  label: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return `${label} name cannot be empty.`;
  if (trimmed.length > 100)
    return `${label} name must be 100 characters or fewer.`;
  return null;
}

// ── State shape ────────────────────────────────────────────────────────────

interface CourseState {
  courses: Course[];
  selectedCourseId: string | null;
  students: Record<string, Student[]>;
  isLoading: boolean;
  error: string | null;

  // Course actions
  loadCourses: () => Promise<void>;
  createCourse: (name: string, description?: string) => Promise<void>;
  updateCourse: (
    id: string,
    name: string,
    description?: string | null,
  ) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  selectCourse: (id: string | null) => void;

  // Student actions
  loadStudents: (courseId: string) => Promise<void>;
  createStudent: (
    courseId: string,
    name: string,
    studentId?: string,
  ) => Promise<void>;
  updateStudent: (
    id: string,
    name: string,
    studentId?: string | null,
  ) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;

  // UI state
  clearError: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useCourseStore = create<CourseState>((set, get) => ({
  // Initial state
  courses: [],
  selectedCourseId: null,
  students: {},
  isLoading: false,
  error: null,

  // ── Course actions ────────────────────────────────────────────────────

  loadCourses: async () => {
    set({ isLoading: true, error: null });
    try {
      const courses = await api.listCourses();
      set({ courses, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  createCourse: async (name: string, description?: string) => {
    const validationError = validateName(name, "Course");
    if (validationError) {
      set({ error: validationError });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const course = await api.createCourse(name, description);
      set((state) => ({
        courses: [course, ...state.courses],
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  updateCourse: async (
    id: string,
    name: string,
    description?: string | null,
  ) => {
    const validationError = validateName(name, "Course");
    if (validationError) {
      set({ error: validationError });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const updated = await api.updateCourse(id, name, description);
      set((state) => ({
        courses: state.courses.map((c) => (c.id === id ? updated : c)),
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  deleteCourse: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteCourse(id);
      set((state) => {
        const newStudents = { ...state.students };
        delete newStudents[id];
        return {
          courses: state.courses.filter((c) => c.id !== id),
          selectedCourseId:
            state.selectedCourseId === id ? null : state.selectedCourseId,
          students: newStudents,
          isLoading: false,
        };
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  selectCourse: (id: string | null) => {
    set({ selectedCourseId: id });
    if (id && !get().students[id]) {
      get().loadStudents(id);
    }
  },

  // ── Student actions ───────────────────────────────────────────────────

  loadStudents: async (courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const students = await api.listStudents(courseId);
      set((state) => ({
        students: { ...state.students, [courseId]: students },
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  createStudent: async (
    courseId: string,
    name: string,
    studentId?: string,
  ) => {
    const validationError = validateName(name, "Student");
    if (validationError) {
      set({ error: validationError });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const student = await api.createStudent(courseId, name, studentId);
      set((state) => ({
        students: {
          ...state.students,
          [courseId]: [
            ...(state.students[courseId] || []),
            student,
          ],
        },
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  updateStudent: async (
    id: string,
    name: string,
    studentId?: string | null,
  ) => {
    const validationError = validateName(name, "Student");
    if (validationError) {
      set({ error: validationError });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const updated = await api.updateStudent(id, name, studentId);
      set((state) => ({
        students: {
          ...state.students,
          [updated.course_id]: (state.students[updated.course_id] || []).map(
            (s) => (s.id === id ? updated : s),
          ),
        },
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  deleteStudent: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteStudent(id);
      // Find which course this student belonged to
      const state = get();
      let courseId: string | undefined;
      for (const [cid, students] of Object.entries(state.students)) {
        if (students.some((s) => s.id === id)) {
          courseId = cid;
          break;
        }
      }
      if (courseId) {
        set((s) => ({
          students: {
            ...s.students,
            [courseId]: (s.students[courseId] || []).filter(
              (st) => st.id !== id,
            ),
          },
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  // ── UI state ──────────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
}));
