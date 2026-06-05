import { useEffect } from "react";
import { useAuthStore } from "./stores/auth-store";
import { useCourseStore } from "./stores/course-store";
import { useGridStore } from "./stores/grid-store";
import { useSettingsStore } from "./stores/settings-store";
import { useCommandStore } from "./stores/command-store";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import StudentRoster from "./components/course/StudentRoster";
import SeatingGrid from "./components/grid/SeatingGrid";
import SettingsPanel from "./components/settings/SettingsPanel";
import type { SidebarPosition } from "./types";

function LayoutSwitcher({
  position,
  sidebar,
  children,
}: {
  position: SidebarPosition;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  if (position === "top") {
    return (
      <>
        {sidebar}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-800">
          {children}
        </main>
      </>
    );
  }

  if (position === "bottom") {
    return (
      <>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-800">
          {children}
        </main>
        {sidebar}
      </>
    );
  }

  // left or right
  return (
    <div className="flex flex-1 overflow-hidden">
      {position === "left" && sidebar}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-800">
        {children}
      </main>
      {position === "right" && sidebar}
    </div>
  );
}

export default function App() {
  const selectedCourseId = useCourseStore((s) => s.selectedCourseId);
  const loadCourses = useCourseStore((s) => s.loadCourses);
  const error = useCourseStore((s) => s.error);
  const clearError = useCourseStore((s) => s.clearError);
  const checkAuthStatus = useAuthStore((s) => s.checkAuthStatus);

  // Grid store
  const loadLayouts = useGridStore((s) => s.loadLayouts);

  // Settings
  const sidebarPosition = useSettingsStore((s) => s.sidebarPosition);

  // Command consumption for dialogs opened from elsewhere
  const command = useCommandStore((s) => s.pending);

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Load layouts when course changes
  useEffect(() => {
    if (selectedCourseId) {
      loadLayouts(selectedCourseId);
    }
  }, [selectedCourseId, loadLayouts]);

  // Initial data loads
  useEffect(() => {
    loadCourses();
    checkAuthStatus();
  }, [loadCourses, checkAuthStatus]);

  return (
    <div className="flex h-screen flex-col">
      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-100 px-4 py-2 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-300">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="ml-4 font-bold text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      <TopBar />

      <LayoutSwitcher
        position={sidebarPosition}
        sidebar={<Sidebar position={sidebarPosition} />}
      >
        {selectedCourseId ? (
          <div className="flex h-full gap-6">
            <div className="w-96 shrink-0 overflow-y-auto">
              <StudentRoster courseId={selectedCourseId} />
            </div>
            <div className="flex-1 overflow-y-auto">
              <SeatingGrid courseId={selectedCourseId} />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium">
                Select a course to manage students
              </p>
              <p className="mt-1 text-sm">
                Choose a course from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </LayoutSwitcher>

      <SettingsPanel />
    </div>
  );
}
