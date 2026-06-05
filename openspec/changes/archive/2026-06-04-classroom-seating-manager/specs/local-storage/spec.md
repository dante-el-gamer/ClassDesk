# Local Storage Specification

## Purpose

Persistent local data layer for offline read access and sync state tracking. All local data MUST survive app restarts and SHOULD survive unexpected termination.

## Requirements

### Requirement: Schema Initialization

The system MUST initialize a SQLite database on first launch with tables for courses, students, seating layouts, and sync metadata.

#### Scenario: Fresh install creates schema

- GIVEN the app is launched for the first time
- WHEN the Rust backend initializes the SQLite connection
- THEN all required tables MUST be created
- AND no data loss MUST occur if tables already exist (idempotent init)

#### Scenario: Schema version migration

- GIVEN an existing database with an older schema version
- WHEN the app launches and detects a version mismatch
- THEN the system MUST migrate the schema to the current version
- AND existing data MUST be preserved

### Requirement: Course and Student CRUD

The system MUST support create, read, update, and delete operations for courses and students through Tauri commands.

#### Scenario: Create and retrieve a course

- GIVEN an empty database
- WHEN a user creates a course with name "Physics 101"
- THEN the course MUST be persisted with a unique ID
- AND querying all courses MUST return the new course

#### Scenario: Delete course cascades to students

- GIVEN a course with enrolled students
- WHEN the user deletes the course
- THEN all associated student records MUST also be deleted
- AND associated seating layouts MUST be removed

### Requirement: Seating Layout Persistence

The system MUST persist seating grid configurations including dimensions, student positions, and assigned courses.

#### Scenario: Save and restore layout

- GIVEN a configured seating grid with 5 rows, 6 columns, and 20 placed students
- WHEN the user saves the layout
- THEN the grid dimensions and student positions MUST be stored
- AND loading the layout on restart MUST restore the exact state

#### Scenario: Layout not found returns empty

- GIVEN a course with no saved layout
- WHEN the system attempts to load its seating layout
- THEN it MUST return a default empty grid configuration
- AND MUST NOT raise an error

### Requirement: Sync State Tracking

The system MUST maintain a sync log with timestamps and dirty flags per record for integration with the drive-sync capability.

#### Scenario: Record marked dirty after mutation

- GIVEN an existing course with sync state "clean"
- WHEN the user updates the course name
- THEN the sync state MUST be marked "dirty"
- AND the local timestamp MUST be updated

#### Scenario: Clean records unchanged

- GIVEN records with sync state "clean"
- WHEN no mutations occur
- THEN those records MUST remain "clean"
- AND they MUST NOT appear in the dirty set
