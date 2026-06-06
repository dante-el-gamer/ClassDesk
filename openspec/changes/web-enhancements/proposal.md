# Proposal: Web Enhancements — routing, 3D, info pages, TopBar layout

## Intent

SPA is a single view with conditional rendering in `App.tsx`. No way to reach a documentation page, changelog, or about page. Add client-side routing, info pages, tasteful 3D elements, and fix TopBar logo placement.

## Scope

### In Scope
- HashRouter-based routing (Tauri-compatible) for sub-pages
- Documentation, Versions/Changelog, and About pages with rich content
- @react-three/fiber + @react-three/drei for decorative 3D elements
- Move logo+title from left to right (flex-end) in TopBar
- Navigation controls in TopBar

### Out of Scope
- Interactive 3D objects (decorative only)
- BrowserRouter (breaks Tauri `asset://` protocol)
- Replacing or modifying existing seating-grid / course-management views
- Full visual redesign

## Capabilities

### New Capabilities
- `page-routing`: Client-side navigation between views via HashRouter
- `3d-visuals`: Decorative 3D elements rendered with @react-three/fiber

### Modified Capabilities
- None — existing specs (course-management, seating-grid, etc.) are unchanged at the requirements level

## Approach

- **Router**: `react-router-dom` v6 with `HashRouter`. Tauri serves from `asset://`, hash-based routing is the only reliable option.
- **Page structure**: Barrel `src/pages/` dir with `Documentation`, `Changelog`, `About` components. A `PageLayout` wrapper provides shared chrome (TopBar + outlet).
- **3D**: Decorative `ThreeDecorations` component wrapping `<Canvas>` + basic mesh (torus, floating geometry). Lazy-loaded via `React.lazy` to avoid bundle penalty on main view.
- **TopBar**: Flip `justify-between` → `flex-row-reverse` for logo right. Add nav links group between logo and action buttons.
- **Testing**: Update existing TopBar tests for new layout. Snapshot new pages. No new complex interaction tests for 3D.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/App.tsx` | Modified | Replace conditional rendering with `<HashRouter>` + `<Routes>` |
| `src/components/layout/TopBar.tsx` | Modified | Move logo to right, add nav links |
| `src/components/layout/PageLayout.tsx` | New | Shared layout wrapper for sub-pages |
| `src/pages/` | New | Documentation, Changelog, About page components |
| `src/components/3d/ThreeDecorations.tsx` | New | Lazy-loaded decorative 3D canvas |
| `package.json` | Modified | Add react-router-dom, @react-three/fiber, @react-three/drei |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| 3D libs add significant bundle weight | Med | Lazy-load 3D components; only render on specific pages or as small backdrop |
| react-router-dom v6 API changes | Low | Stable release; pin version |
| CSP issues with HashRouter | Low | CSP already null in tauri.conf.json |

## Rollback Plan

1. `git revert` all `src/` changes
2. `npm uninstall react-router-dom @react-three/fiber @react-three/drei`
3. Restore `App.tsx` conditional rendering from git
4. Verify all 79 existing unit tests pass

## Dependencies

- `react-router-dom` ^6.26
- `@react-three/fiber` ^8
- `@react-three/drei` ^9

## Success Criteria

- [ ] Navigate between Documentation, Changelog, About via TopBar links without full re-render
- [ ] Logo+title appears right-aligned in TopBar
- [ ] 3D elements render without jank or console errors
- [ ] All 79 existing unit tests pass (`npm test`)
- [ ] `npm run build` succeeds (TypeScript + Vite)
