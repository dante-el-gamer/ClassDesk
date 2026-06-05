import { useSyncStore } from "../../stores/sync-store";

/**
 * Displays the current sync status:
 * - Dirty record count
 * - Last sync timestamp
 * - Result of the last sync operation (conflicts, push/pull count)
 *
 * Intended for use in the top bar alongside SyncButton.
 */
export default function SyncStatus() {
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const lastSyncResult = useSyncStore((s) => s.lastSyncResult);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  if (isSyncing) {
    return (
      <span className="flex items-center gap-1 text-sm text-blue-600">
        <svg
          className="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Syncing…
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      {/* Dirty count */}
      {syncStatus && syncStatus.dirty_count > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {syncStatus.dirty_count} unsynced
        </span>
      )}

      {/* Last sync time */}
      {syncStatus?.last_synced_at && (
        <span title={`Last synced: ${syncStatus.last_synced_at}`}>
          Synced: {formatTimestamp(syncStatus.last_synced_at)}
        </span>
      )}

      {/* Last sync result message */}
      {lastSyncResult && lastSyncResult.conflicts.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-yellow-700">
          {lastSyncResult.conflicts.length} conflict(s) resolved
        </span>
      )}
    </div>
  );
}

/** Format an ISO 8601 timestamp to a short human-friendly string. */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
