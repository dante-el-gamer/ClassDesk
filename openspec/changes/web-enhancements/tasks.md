# Tasks: Web Enhancements — routing, 3D, info pages, TopBar layout

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550–650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Router + TopBar (Phases 1–2); PR 2: Pages + 3D + Tests (Phases 3–5) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Dependencies + HashRouter + route-split App + NavLinks + TopBar layout update + NavLinks/TopBar tests | PR 1 | Self‑contained: routing and navigation work; sub‑pages don't exist yet. Tests included. Base: `main`. |
| 2 | PageLayout + 3 sub‑pages + barrel + ThreeDecorations + page/integration tests | PR 2 | Depends on PR 1's routing infrastructure. Base: `main` (after PR 1 merges). |

## Phase 1: Dependencies and Router setup

- [x] 1.1 Install `react-router-dom`, `@react-three/fiber`, `@react-three/drei`, `three` via npm (react-router-dom done for PR 1; 3D packages deferred to PR 2)
- [x] 1.2 Wrap `<App />` in `<HashRouter>` inside `src/main.tsx`
- [x] 1.3 Replace `App.tsx` direct render with `<Routes>`: `"/"` renders inline MainView content (existing stores + LayoutSwitcher), unknown routes redirect to `"/"`
- [x] 1.4 Confirm course-store hooks (`loadCourses`, `selectedCourseId`) only run on `"/"` — sub-page mounts must not hydrate course data (ensured by route structure: MainView only mounts on "/")

## Phase 2: TopBar layout and navigation

- [x] 2.1 Create `src/components/layout/NavLinks.tsx` with three `<NavLink>` items: "Documentación" → `/documentacion`, "Versiones" → `/versiones`, "Acerca de" → `/acerca-de`; active-link class: `text-blue-600 font-medium`
- [x] 2.2 Update `TopBar.tsx`: add `<NavLinks />` between logo and actions group; change `justify-between` to `flex-row-reverse justify-between`; reorder DOM children so visual order is NavLinks → Actions → Logo
- [x] 2.3 Update any existing TopBar tests for the new layout (no existing TopBar tests found — skipped; new TopBar test created instead)

## Phase 3: PageLayout and sub-pages

- [ ] 3.1 Create `src/components/layout/PageLayout.tsx`: renders `<TopBar />` + `<Suspense>` with `ThreeDecorations` (lazy) + `<Outlet />`; wrapper: `flex h-screen flex-col`; 3D placed in absolute container with `pointer-events-none`
- [ ] 3.2 Create `src/pages/DocumentationPage.tsx` with rich help/content about using the app
- [ ] 3.3 Create `src/pages/ChangelogPage.tsx` with version history entries
- [ ] 3.4 Create `src/pages/AboutPage.tsx` with tech stack, credits, and project info
- [ ] 3.5 Create `src/pages/index.ts` barrel exporting all three pages

## Phase 4: 3D visuals

- [ ] 4.1 Create `src/components/3d/ThreeDecorations.tsx`: `<Canvas>` with 1 torus (slow Y-axis spin via `useFrame`) + 2–3 orbiting icosahedrons; `meshStandardMaterial` at `opacity: 0.15`; ambient + directional light; no pointer events
- [ ] 4.2 Wire `React.lazy(() => import("./components/3d/ThreeDecorations"))` + `<Suspense fallback={<div className="h-32" />}>` in `PageLayout.tsx`

## Phase 5: Testing and verification

- [ ] 5.1 Write `NavLinks.test.tsx`: render inside `MemoryRouter`, assert three link labels, verify `NavLink` active class on target route
- [ ] 5.2 Write page rendering tests: render each page (`DocumentationPage`, `ChangelogPage`, `AboutPage`) and assert correct heading text
- [ ] 5.3 Write navigation integration test: render `<HashRouter><Routes>...</Routes></HashRouter>`, click each link, assert URL hash updates without full reload
- [ ] 5.4 Run `npm test` — all 79+ existing tests pass; confirm no regressions
