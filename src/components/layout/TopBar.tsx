import { useEffect } from "react";
import { useAuthStore } from "../../stores/auth-store";
import { useSyncStore } from "../../stores/sync-store";
import { useCommandStore } from "../../stores/command-store";
import LoginButton from "../auth/LoginButton";
import AuthStatusDisplay from "../auth/AuthStatus";
import SyncButton from "../sync/SyncButton";
import SyncStatus from "../sync/SyncStatus";

export default function TopBar() {
  const authenticated = useAuthStore((s) => s.authenticated);
  const loadSyncStatus = useSyncStore((s) => s.loadSyncStatus);
  const syncError = useSyncStore((s) => s.error);
  const clearSyncError = useSyncStore((s) => s.clearError);
  const dispatch = useCommandStore((s) => s.dispatch);

  // Load sync status on mount
  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-900">
      <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Classroom Seating Manager
      </h1>

      <div className="flex items-center gap-4">
        {/* Sync status indicators */}
        <SyncStatus />

        {/* Sync error message (overlay when present) */}
        {syncError && (
          <span className="flex items-center gap-1 text-sm text-red-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {syncError}
            <button
              onClick={clearSyncError}
              className="ml-1 font-bold hover:text-red-800"
            >
              ✕
            </button>
          </span>
        )}

        {/* Settings button */}
        <button
          onClick={() => dispatch("open-settings")}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
          title="Settings"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Auth: show login button or user status */}
        {authenticated ? <AuthStatusDisplay /> : <LoginButton />}

        {/* Sync push / pull buttons */}
        <SyncButton />
      </div>
    </header>
  );
}
