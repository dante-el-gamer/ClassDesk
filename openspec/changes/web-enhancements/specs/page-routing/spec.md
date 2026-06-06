# Page Routing Specification

## Purpose

Client-side navigation between views using HashRouter for Tauri compatibility. Enables documentation, changelog, and about sub-pages alongside the main seating-grid view.

## Requirements

### Requirement: HashRouter Navigation

The system MUST use HashRouter from react-router-dom v6 for all client-side routing. Routes MUST use hash-based URLs (#/path) to ensure Tauri asset:// protocol compatibility.

#### Scenario: Navigate between pages without full reload

- GIVEN the app is loaded at the root hash route (#/)
- WHEN the user clicks a navigation link to /documentation
- THEN the URL MUST update to #/documentation
- AND the page content MUST render without a full browser reload

#### Scenario: Direct hash URL access

- GIVEN the app is loaded
- WHEN the user navigates directly to #/changelog
- THEN the Changelog page MUST render
- AND no server request MUST be made

### Requirement: Route Configuration

The system MUST define routes for root (/), /documentation, /changelog, and /about. Unknown routes MUST redirect to root.

#### Scenario: Unknown route redirect

- GIVEN any app state
- WHEN the user navigates to #/nonexistent
- THEN the app MUST render the root view

### Requirement: PageLayout Wrapper

All sub-pages (Documentation, Changelog, About) MUST render inside a shared PageLayout component that includes the TopBar and a content outlet. The root view MUST NOT use PageLayout.

#### Scenario: Sub-page renders with shared chrome

- GIVEN the Documentation page is active
- WHEN the page renders
- THEN the TopBar MUST be visible at the top
- AND the page content MUST appear below the TopBar

#### Scenario: Root view renders without PageLayout

- GIVEN the app is at the root route
- WHEN the page renders
- THEN the existing unmodified view MUST appear

### Requirement: Navigation Controls

The TopBar MUST display navigation links to all sub-pages. The active route's link SHOULD be visually distinguished from inactive links.

#### Scenario: Active link styling

- GIVEN the user is on the /about page
- WHEN the TopBar renders
- THEN the "About" link MUST have an active visual state
- AND the "Documentation" and "Changelog" links MUST NOT appear active
