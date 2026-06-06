# Delta for TopBar Layout

## ADDED Requirements

### Requirement: Logo and Title Right-Alignment

The TopBar MUST display the logo and application title on the right side using flex-end alignment. This replaces the previous left-aligned position.

#### Scenario: Logo appears on the right

- GIVEN the TopBar is rendered on any view
- WHEN the component mounts
- THEN the logo MUST appear at the right edge of the TopBar
- AND the title text MUST appear immediately to the left of the logo

#### Scenario: Responsive alignment preserved

- GIVEN the TopBar is rendered at various viewport widths
- WHEN the window is resized
- THEN the right-aligned group MUST remain at the right edge
- AND no layout overflow MUST occur

### Requirement: Navigation Link Group

The TopBar MUST contain a group of navigation links positioned between the right-aligned logo and any left-side action buttons. Links MUST include "Documentación", "Versiones", and "Acerca de".

#### Scenario: Navigation links render in correct position

- GIVEN the TopBar is rendered
- WHEN the user inspects the link layout
- THEN navigation links MUST appear between the logo group and action buttons
- AND all three links MUST be visible and clickable

### Requirement: Updated Test Coverage

The TopBar test suite MUST be updated to assert the new layout. All existing behavioral tests MUST continue to pass.

#### Scenario: Updated layout tests pass

- GIVEN the existing TopBar test suite
- WHEN the tests execute after the layout change
- THEN all updated layout assertions MUST pass
- AND no existing tests MUST be removed without replacement
