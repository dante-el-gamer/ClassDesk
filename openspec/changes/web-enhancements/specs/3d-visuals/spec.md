# 3D Visuals Specification

## Purpose

Decorative 3D elements rendered with @react-three/fiber and @react-three/drei. Purely aesthetic — no interaction. Lazy-loaded to avoid bundle impact on the main view.

## Requirements

### Requirement: Decorative Canvas

The system MAY render decorative 3D elements on sub-pages (Documentation, Changelog, About) using a `<Canvas>` component from @react-three/fiber. The main view MUST NOT render any 3D canvas.

#### Scenario: 3D elements render without errors

- GIVEN a sub-page that includes ThreeDecorations
- WHEN the component mounts
- THEN a Three.js canvas MUST appear in the DOM
- AND no JavaScript errors MUST be thrown

#### Scenario: Main view has no 3D canvas

- GIVEN the user is on the main seating-grid view
- WHEN the page renders
- THEN no Three.js canvas MUST be present in the DOM

### Requirement: Lazy Loading

The ThreeDecorations component MUST be lazy-loaded via React.lazy(). A Suspense boundary with a lightweight placeholder MUST wrap it.

#### Scenario: Bundle code not loaded on main view

- GIVEN the app loads on the main view
- WHEN the JavaScript bundle is evaluated
- THEN no @react-three/fiber or three.js code MUST execute

#### Scenario: Placeholder during lazy load

- GIVEN ThreeDecorations has not loaded yet
- WHEN a sub-page triggers its render
- THEN a minimal placeholder MUST display
- AND the 3D content MUST appear once lazy loading completes

### Requirement: Non-Interactive Mesh

The 3D scene MUST contain at least one geometric mesh (torus, box, or floating geometry) with a slow continuous rotation. Elements MUST NOT respond to pointer events.

#### Scenario: Mesh renders and animates

- GIVEN ThreeDecorations is mounted and loaded
- THEN a geometric mesh MUST be visible inside the canvas
- AND the mesh MUST rotate continuously at a slow speed

#### Scenario: No pointer interaction

- GIVEN a rendered 3D mesh on screen
- WHEN the user clicks or hovers over the canvas area
- THEN the application state MUST NOT change
- AND the cursor MUST remain the default arrow
