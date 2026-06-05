import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCourseStore, validateName } from "./course-store";
import type { Course, Student } from "../types";

// Mock the entire API module
vi.mock("../lib/api", () => ({
  createCourse: vi.fn(),
  listCourses: vi.fn(),
  updateCourse: vi.fn(),
  deleteCourse: vi.fn(),
  createStudent: vi.fn(),
  listStudents: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
}));

import * as api from "../lib/api";
const mockedApi = vi.mocked(api);

// ── Fixtures ──────────────────────────────────────────────────────────────

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: "00000000-0000-0000-0000-000000000001",
  name: "Math 301",
  description: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  active_layout_id: null,
  ...overrides,
});

const makeStudent = (overrides: Partial<Student> = {}): Student => ({
  id: "00000000-0000-0000-0000-000000000010",
  course_id: "00000000-0000-0000-0000-000000000001",
  name: "Alice",
  student_id: null,
  created_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

// ── validateName ──────────────────────────────────────────────────────────

describe("validateName", () => {
  it("returns null for a valid name", () => {
    expect(validateName("Math 301", "Course")).toBeNull();
    expect(validateName("Alice", "Student")).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(validateName("", "Course")).toBe("Course name cannot be empty.");
    expect(validateName("  ", "Course")).toBe("Course name cannot be empty.");
  });

  it("rejects a name exceeding 100 characters", () => {
    const long = "a".repeat(101);
    expect(validateName(long, "Course")).toBe(
      "Course name must be 100 characters or fewer.",
    );
  });

  it("accepts a name at exactly 100 characters", () => {
    const exact = "a".repeat(100);
    expect(validateName(exact, "Course")).toBeNull();
  });

  it("uses the provided label in error messages", () => {
    expect(validateName("", "Student")).toBe("Student name cannot be empty.");
  });
});

// ── Course actions ────────────────────────────────────────────────────────

describe("courseStore — course actions", () => {
  beforeEach(() => {
    useCourseStore.setState({
      courses: [],
      selectedCourseId: null,
      students: {},
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("loadCourses", () => {
    it("loads courses from the API and updates state", async () => {
      const courses = [makeCourse({ name: "Physics 101" })];
      mockedApi.listCourses.mockResolvedValue(courses);

      await useCourseStore.getState().loadCourses();

      const state = useCourseStore.getState();
      expect(state.courses).toEqual(courses);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("handles API errors gracefully", async () => {
      mockedApi.listCourses.mockRejectedValue(new Error("Network error"));

      await useCourseStore.getState().loadCourses();

      const state = useCourseStore.getState();
      expect(state.courses).toEqual([]);
      expect(state.error).toBe("Network error");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("createCourse", () => {
    it("rejects an empty name without calling the API", async () => {
      await useCourseStore.getState().createCourse("  ");

      expect(mockedApi.createCourse).not.toHaveBeenCalled();
      expect(useCourseStore.getState().error).toBe(
        "Course name cannot be empty.",
      );
    });

    it("rejects a long name without calling the API", async () => {
      await useCourseStore.getState().createCourse("a".repeat(101));

      expect(mockedApi.createCourse).not.toHaveBeenCalled();
      expect(useCourseStore.getState().error).toBe(
        "Course name must be 100 characters or fewer.",
      );
    });

    it("calls the API and prepends the new course on success", async () => {
      const course = makeCourse({ name: "Biology 101" });
      mockedApi.createCourse.mockResolvedValue(course);

      await useCourseStore.getState().createCourse("Biology 101");

      expect(mockedApi.createCourse).toHaveBeenCalledWith(
        "Biology 101",
        undefined,
      );
      const state = useCourseStore.getState();
      expect(state.courses).toHaveLength(1);
      expect(state.courses[0].name).toBe("Biology 101");
      expect(state.error).toBeNull();
    });
  });

  describe("deleteCourse", () => {
    it("removes the course and its students from state", async () => {
      const course = makeCourse();
      useCourseStore.setState({
        courses: [course],
        selectedCourseId: course.id,
        students: { [course.id]: [makeStudent()] },
      });
      mockedApi.deleteCourse.mockResolvedValue(undefined);

      await useCourseStore.getState().deleteCourse(course.id);

      const state = useCourseStore.getState();
      expect(state.courses).toHaveLength(0);
      expect(state.selectedCourseId).toBeNull();
      expect(state.students[course.id]).toBeUndefined();
    });

    it("handles API errors gracefully", async () => {
      const course = makeCourse();
      useCourseStore.setState({ courses: [course] });
      mockedApi.deleteCourse.mockRejectedValue(
        new Error("Course not found."),
      );

      await useCourseStore.getState().deleteCourse(course.id);

      expect(useCourseStore.getState().error).toBe("Course not found.");
      // Course should still be in state
      expect(useCourseStore.getState().courses).toHaveLength(1);
    });
  });

  describe("selectCourse", () => {
    it("sets selectedCourseId and loads students if not cached", async () => {
      const course = makeCourse();
      const students = [makeStudent()];
      mockedApi.listStudents.mockResolvedValue(students);

      useCourseStore.getState().selectCourse(course.id);

      // Should set selected and trigger load
      expect(useCourseStore.getState().selectedCourseId).toBe(course.id);
      await vi.waitFor(() => {
        expect(useCourseStore.getState().students[course.id]).toEqual(students);
      });
    });

    it("does not reload students if already cached", async () => {
      const course = makeCourse();
      const students = [makeStudent()];
      useCourseStore.setState({
        students: { [course.id]: students },
      });

      useCourseStore.getState().selectCourse(course.id);

      expect(useCourseStore.getState().selectedCourseId).toBe(course.id);
      // Should NOT make an API call
      expect(mockedApi.listStudents).not.toHaveBeenCalled();
    });
  });
});

// ── Student actions ────────────────────────────────────────────────────────

describe("courseStore — student actions", () => {
  const courseId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    useCourseStore.setState({
      courses: [makeCourse()],
      selectedCourseId: null,
      students: {},
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("createStudent", () => {
    it("rejects an empty name without calling the API", async () => {
      await useCourseStore.getState().createStudent(courseId, "  ");

      expect(mockedApi.createStudent).not.toHaveBeenCalled();
      expect(useCourseStore.getState().error).toBe(
        "Student name cannot be empty.",
      );
    });

    it("calls the API and appends the new student on success", async () => {
      const student = makeStudent({ name: "Bob" });
      mockedApi.createStudent.mockResolvedValue(student);

      await useCourseStore.getState().createStudent(courseId, "Bob");

      expect(mockedApi.createStudent).toHaveBeenCalledWith(
        courseId,
        "Bob",
        undefined,
      );
      expect(useCourseStore.getState().students[courseId]).toHaveLength(1);
      expect(useCourseStore.getState().students[courseId][0].name).toBe("Bob");
    });
  });

  describe("deleteStudent", () => {
    it("removes the student from state and calls the API", async () => {
      const student = makeStudent();
      useCourseStore.setState({
        students: { [courseId]: [student] },
      });
      mockedApi.deleteStudent.mockResolvedValue(undefined);

      await useCourseStore.getState().deleteStudent(student.id);

      expect(mockedApi.deleteStudent).toHaveBeenCalledWith(student.id);
      expect(
        useCourseStore.getState().students[courseId],
      ).toHaveLength(0);
    });
  });
});
