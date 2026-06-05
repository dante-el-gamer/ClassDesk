import { useAuthStore } from "../../stores/auth-store";
import { useSyncStore } from "../../stores/sync-store";

/**
 * A push/pull sync button pair for the top bar.
 *
 * Both buttons are disabled while a sync is in progress or when
 * the user is not authenticated.  The access token is fetched from
 * the backend automatically when the sync action runs.
 */
export default function SyncButton() {
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pushSync = useSyncStore((s) => s.pushSync);
  const pullSync = useSyncStore((s) => s.pullSync);
  const authenticated = useAuthStore((s) => s.authenticated);

  const disabled = isSyncing || !authenticated;
  const title = !authenticated
    ? "Sign in with Google to sync"
    : isSyncing
      ? "Syncing…"
      : "Sync with Google Drive";

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => pushSync()}
        disabled={disabled}
        title={`Push — ${title}`}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* Upload icon */}
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
          />
        </svg>
        Push
      </button>

      <button
        onClick={() => pullSync()}
        disabled={disabled}
        title={`Pull — ${title}`}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* Download icon */}
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 13l5 5m0 0l5-5m-5 5V6"
          />
        </svg>
        Pull
      </button>
    </div>
  );
}
