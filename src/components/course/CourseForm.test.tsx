import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CourseForm from "./CourseForm";

// Mock the store module
vi.mock("../../stores/course-store", () => ({
  useCourseStore: vi.fn(),
  validateName: vi.fn(),
}));

import { useCourseStore, validateName } from "../../stores/course-store";

const mockStore = vi.mocked(useCourseStore);
const mockValidateName = vi.mocked(validateName);

// Shared state object that the mock hook "selects" from
const storeState: Record<string, unknown> = {};

const renderForm = (props: { open?: boolean; onClose?: () => void } = {}) => {
  return render(
    <CourseForm
      open={props.open ?? true}
      onClose={props.onClose ?? vi.fn()}
    />,
  );
};

describe("CourseForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState.createCourse = vi.fn().mockResolvedValue(undefined);
    // Zustand hook calls useCourseStore(selector) — apply the selector to the shared state
    mockStore.mockImplementation((selector: any) => {
      return selector ? selector(storeState) : storeState;
    });
  });

  it("renders the dialog title when open", () => {
    renderForm();
    expect(screen.getByText("New Course")).toBeInTheDocument();
  });

  it("renders the name input field", () => {
    renderForm();
    expect(
      screen.getByPlaceholderText("e.g. Math 301"),
    ).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderForm({ open: false });
    expect(screen.queryByText("New Course")).not.toBeInTheDocument();
  });

  it("calls createCourse on valid submit", async () => {
    const createCourse = vi.fn().mockResolvedValue(undefined);
    storeState.createCourse = createCourse;
    mockValidateName.mockReturnValue(null);

    renderForm();

    fireEvent.change(screen.getByPlaceholderText("e.g. Math 301"), {
      target: { value: "Physics 101" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create course/i }));

    // Wait for the async action
    await vi.waitFor(() => {
      expect(createCourse).toHaveBeenCalledWith("Physics 101", undefined);
    });
  });

  it("shows validation error and does not submit when name is empty", async () => {
    const createCourse = vi.fn();
    storeState.createCourse = createCourse;

    mockValidateName.mockReturnValue("Course name cannot be empty.");

    renderForm();

    // Submit with empty name
    fireEvent.click(screen.getByRole("button", { name: /create course/i }));

    // The form should call validateName on submit
    expect(mockValidateName).toHaveBeenCalledWith("", "Course");

    // createCourse should NOT be called
    expect(createCourse).not.toHaveBeenCalled();
  });
});
