# Design: Web Enhancements — routing, 3D, info pages, TopBar layout

## Technical Approach

Introduce `react-router-dom` v6 with `HashRouter` for sub-page navigation, add a `PageLayout` wrapper for shared chrome on info pages, lazy-load decorative 3D via `@react-three/fiber`, and flip TopBar layout with `flex-row-reverse` to move the logo right. App.tsx becomes the route root — its existing main-view content stays as the `"/"` route, while sub-pages use `PageLayout` + `<Outlet />`.

## Architecture Decisions

### HashRouter over BrowserRouter

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **HashRouter** | `#/path` works on `asset://` protocol, no server needed | ✅ **Chosen** |
| BrowserRouter | pushState requires HTTP fallback routing — breaks in Tauri | ❌ Rejected |
| No router | Single view, no sub-pages, violates requirement | ❌ Rejected |

Tauri serves from `asset://` — hash-based routing is the only reliable option.

### Lazy-load 3D via React.lazy

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **React.lazy + Suspense** | 3D bundle loaded on-demand, Suspense fallback shown during load | ✅ **Chosen** |
| Dynamic import in useEffect | Works but no built-in loading state |
| Eager three.js import | ~150KB+ always loaded, even on main view where 3D never renders | ❌ Rejected |

Main view MUST NOT execute three.js code. React.lazy with a named export ensures the bundle is code-split at build time.

### PageLayout + Outlet pattern

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **Nested `<Route>` with `<Outlet />`** | react-router v6 idiomatic, DRY layout, natural nesting | ✅ **Chosen** |
| Per-page layout wrapping | Duplicates TopBar import and markup in every page | ❌ Rejected |
| HOC wrapper | Less explicit, harder to trace | ❌ Rejected |

`PageLayout` renders `TopBar` + `ThreeDecorations` + `<Outlet />` once. Each sub-page only owns its content.

### Nav link placement via flex-row-reverse

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **flex-row-reverse + justify-between** | Logo becomes rightmost, nav links left, actions in center — single class change | ✅ **Chosen** |
| order-\* utilities | Works but adds class noise per child | ❌ Rejected |
| Grid layout | Over-engineered for a single axis change | ❌ Rejected |

DOM order becomes Logo → Actions → NavLinks. With `flex-row-reverse justify-between`, visual order is NavLinks (left) → Actions (center) → Logo (right).

## Component Tree

```
main.tsx                  ← add <HashRouter> wrapper
└── <HashRouter>
    └── App.tsx           ← becomes <Routes> root
        ├── Route "/"
        │   └── MainView (existing hooks + TopBar + LayoutSwitcher + SettingsPanel — extracted inline)
        └── Route (layout, no path) → <PageLayout>
            ├── TopBar (modified — nav links added)
            ├── <Suspense fallback={<div className="h-32" />}>
            │   └── <ThreeDecorations />          ← React.lazy(() => import(...))
            └── <Outlet>
                ├── "/documentacion" → <DocumentationPage />
                ├── "/versiones"     → <ChangelogPage />
                └── "/acerca-de"     → <AboutPage />
```

## PageLayout Component Design

```
┌──────────────────────────────────────┐
│  TopBar (nav links + actions + logo) │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │  ThreeDecorations (lazy, bg)   │  │
│  ├────────────────────────────────┤  │
│  │  <Outlet /> content             │  │
│  │  (page-specific)               │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

Renders `TopBar`, then a content area with `ThreeDecorations` as a decorative background (positioned absolutely, low opacity) and `<Outlet />` as foreground. The wrapper is `h-screen flex-col` (same root as App's main view).

**Difference from main view**: Main view has `LayoutSwitcher` + `Sidebar` + `SeatingGrid`; `PageLayout` has only decorative 3D + static page content. Sidebar and course-loading logic never mount on sub-pages.

## ThreeDecorations Component Design

- **Meshes**: 1 torus (ring shape, slow Y-axis spin) + 2-3 small icosahedrons orbiting at different speeds.
- **Animation**: `useFrame((_, delta) => ...)` for continuous rotation at ~0.3 rad/s.
- **Materials**: `meshStandardMaterial` with `opacity: 0.15`, semi-transparent — purely atmospheric.
- **Lighting**: Single ambient + one directional light within the canvas.
- **Containment**: `<Canvas>` inside a `div` positioned `absolute inset-0 pointer-events-none`. No camera controls.
- **Lazy loading**: `const ThreeDecorations = React.lazy(() => import("../components/3d/ThreeDecorations"))`. Splits three.js into a separate chunk.
- **Placeholder**: `<div className="h-32" />` inside Suspense — keeps layout stable while 3D loads.

## TopBar Modified Layout

**Before** (current):
```
justify-between
┌─────────────────────────────────────────────┐
│ [Logo+Title]              [Sync][Settings][Auth] │
│ (flex-start)                         (flex-end) │
└─────────────────────────────────────────────┘
```

**After** (with `flex-row-reverse justify-between`):
```
DOM order:  <Logo+Title> <Actions group> <NavLinks>
Visual:     [NavLinks]   [Sync][Settings][Auth]  [Logo+Title]
            (left)           (center)            (right)
```

The `h1` wraps logo + title as-is. A new `<NavLinks>` component renders `NavLink` from react-router for each of the three Spanish-labeled routes. Active link gets `text-blue-600 font-medium` via `NavLink`'s `className` callback.

The actions group (`SyncStatus`, error, Settings button, Auth, SyncButton`) stays in DOM order between logo and nav links.

## Data Flow

No new stores. Page selection is URL-driven:

```
User clicks NavLink → HashRouter updates hash → react-router matches route → renders PageLayout + appropriate child
```

Existing stores (`auth-store`, `course-store`, `grid-store`, etc.) are untouched. They hydrate only when the main view mounts (they're used by `MainView`, not by sub-pages).

## File Manifest

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `react-router-dom`, `@react-three/fiber`, `@react-three/drei`, `three` |
| `src/main.tsx` | Modify | Wrap `<App />` in `<HashRouter>` |
| `src/App.tsx` | Modify | Replace direct render with `<Routes>`; extract main view content into inline route element |
| `src/components/layout/TopBar.tsx` | Modify | Add `<NavLinks />` component; change `justify-between` to `flex-row-reverse justify-between`; reorder DOM children |
| `src/components/layout/PageLayout.tsx` | **New** | Shared layout: TopBar + Suspense/ThreeDecorations + Outlet |
| `src/components/layout/NavLinks.tsx` | **New** | Three `NavLink` components for Documentación, Versiones, Acerca de |
| `src/components/3d/ThreeDecorations.tsx` | **New** | Lazy-loaded `<Canvas>` with torus + floating geometry, slow rotation |
| `src/pages/DocumentationPage.tsx` | **New** | Documentation/help page |
| `src/pages/ChangelogPage.tsx` | **New** | Versions/changelog page |
| `src/pages/AboutPage.tsx` | **New** | About page |
| `src/pages/index.ts` | **New** | Barrel exports for all pages |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | TopBar nav links render with correct labels | Render TopBar with `MemoryRouter` (HashRouter wrapper for test), assert link text "Documentación", "Versiones", "Acerca de" |
| Unit | Active link gets correct styling | Render TopBar at route `/acerca-de`, assert that link has active class, others don't |
| Unit | Logo+title appears at flex-end position | Assert logo container has expected order class |
| Unit | Sub-pages render correct heading | Render each page component, assert title text |
| Integration | Navigation between pages works | Render `<HashRouter><Routes>...</Routes></HashRouter>`, click link, assert URL hash changes |
| **NOT tested** | ThreeDecorations internal rendering | three.js requires WebGL context — jsdom can't provide it. Skip. Test only that lazy import resolves without error. |
| **NOT tested** | react-router internals | Trust react-router v6 stable — no need to test `createBrowserRouter` or route matching internals |

**Existing TopBar test updates**: If any TopBar tests exist, update assertions for the new flex layout (logo position, DOM order). No tests removed.

## Open Questions

- None. Design is fully specified per proposal and delta specs.
