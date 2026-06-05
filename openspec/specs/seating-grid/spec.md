# Seating Grid Specification

## Purpose

Interactive visual grid for arranging students in a classroom layout. Supports configurable dimensions, drag-and-drop placement, and per-course grid persistence.

## Requirements

### Requirement: Configurable Grid Dimensions

The system MUST allow the user to configure the number of rows and columns. Rows MUST be between 1 and 20. Columns MUST be between 1 and 20.

#### Scenario: Create a grid with custom dimensions

- GIVEN a new seating layout for "Physics 101"
- WHEN the user sets 6 rows and 8 columns
- THEN the grid MUST render 48 cells in a 6x8 arrangement

#### Scenario: Clamp out-of-range dimensions

- GIVEN the dimension editor
- WHEN the user sets rows to 0
- THEN the system SHOULD clamp to minimum 1
- AND display a warning

### Requirement: Drag-and-Drop Student Placement

The system MUST support dragging a student card from the roster and dropping it onto an empty grid cell. Placed students MUST be removable by dragging off the grid or to the roster area.

#### Scenario: Place student on empty cell

- GIVEN a course with student "Alice" and a 4x4 grid
- WHEN the user drags Alice from the roster to cell (2, 3)
- THEN Alice's card MUST appear in cell (2, 3)
- AND the roster MUST show Alice as placed

#### Scenario: Swap positions by drag

- GIVEN Alice at cell (2,3) and Bob at cell (4,1)
- WHEN the user drags Alice onto Bob's cell
- THEN Alice MUST occupy cell (4,1) and Bob MUST move to cell (2,3)
- AND no students MUST be lost

#### Scenario: Remove student from grid

- GIVEN a placed student "Charlie" at cell (1,1)
- WHEN the user drags Charlie back to the roster area
- THEN cell (1,1) MUST become empty
- AND Charlie MUST appear in the unplaced roster

### Requirement: Grid Persistence

The grid state MUST persist via the local-storage capability. Loading a course MUST restore its active layout.

#### Scenario: Restore grid on course switch

- GIVEN a saved layout with placed students
- WHEN the user navigates away and returns to the same course
- THEN the grid MUST render in the exact saved state

#### Scenario: Empty grid on new layout

- GIVEN a course with no saved layout
- WHEN the user opens the seating grid view
- THEN the grid MUST render at default dimensions (4x4)
- AND all cells MUST be empty

### Requirement: Visual Feedback

The system MUST provide visual feedback during drag operations: valid targets MUST highlight, invalid targets MUST show a rejection state, and the dragged student SHALL follow the cursor.

#### Scenario: Invalid drop target

- GIVEN a loaded grid
- WHEN the user drags a student over a non-grid area
- THEN the drop target MUST NOT highlight
- AND releasing MUST cancel the placement

#### Scenario: Conflicting cell notification

- GIVEN an occupied cell at (3,3)
- WHEN the user drags a student over it
- THEN the cell MUST show a swap indicator
- AND the user MUST understand a swap will occur
