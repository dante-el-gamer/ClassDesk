# Course Management Specification

## Purpose

Manage courses, groups, and student rosters. Each course MAY have one or more seating layouts and a configurable student roster.

## Requirements

### Requirement: Course CRUD

The system MUST support creating, reading, updating, and deleting courses. Course names MUST be unique within a user's scope.

#### Scenario: Create a course

- GIVEN the user is authenticated
- WHEN the user creates a course with name "Math 301" and optional description
- THEN the course MUST appear in the course list
- AND it MUST have a unique identifier

#### Scenario: Rename an existing course

- GIVEN an existing course "Physics 101"
- WHEN the user renames it to "Physics I"
- THEN the course name MUST be updated
- AND all associated data MUST remain intact

#### Scenario: Delete course with confirmation

- GIVEN a course with enrolled students and seating layouts
- WHEN the user deletes the course after confirming
- THEN the course, its students, and its layouts MUST be removed

### Requirement: Student Roster Management

The system MUST support adding, editing, and removing students within a course. Each student MUST have a name and MAY have an optional identifier (e.g., student ID).

#### Scenario: Add students to a course

- GIVEN a course "History 202" with no students
- WHEN the user adds three students: "Alice", "Bob", "Charlie"
- THEN all three MUST appear in the student roster
- AND each student MUST be assigned a unique per-course identifier

#### Scenario: Edit student name

- GIVEN a student "Charlie" in "History 202"
- WHEN the user changes the name to "Charles"
- THEN the student roster MUST reflect the updated name

#### Scenario: Remove student from roster

- GIVEN a course with student "Alice" placed on the seating grid
- WHEN the user removes Alice from the roster
- THEN Alice MUST be removed from the roster
- AND her position on the seating grid MUST be cleared

### Requirement: Per-Course Layout Association

The system MUST allow associating one or more seating layouts with a course. A course SHALL have at most one active layout at a time.

#### Scenario: Assign layout to course

- GIVEN a course "Biology 101" with no active layout
- WHEN the user selects an existing seating layout for this course
- THEN the layout MUST be associated as the active layout
- AND subsequent grid views MUST load this layout

#### Scenario: Switch active layout

- GIVEN a course with an existing active layout
- WHEN the user assigns a different layout
- THEN the new layout MUST become active
- AND the previous layout MUST remain accessible

### Requirement: Input Validation

The system MUST validate course and student inputs. Empty names MUST be rejected. Names exceeding 100 characters MUST be rejected.

#### Scenario: Reject empty course name

- GIVEN the course creation form
- WHEN the user submits with an empty name
- THEN the system MUST show a validation error
- AND MUST NOT persist the course

#### Scenario: Reject overly long name

- GIVEN the course creation form
- WHEN the user submits a name with 150 characters
- THEN the system MUST reject the input
- AND MUST display a character limit message
