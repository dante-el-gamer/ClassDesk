import { useAuthStore } from "../../stores/auth-store";

export default function AuthStatus() {
  const authenticated = useAuthStore((s) => s.authenticated);
  const email = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  if (!authenticated) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex items-center gap-3">
      {error && (
        <span className="text-xs text-red-500" role="alert">
          {error}
          <button
            onClick={clearError}
            className="ml-1 font-bold hover:text-red-700"
          >
            ✕
          </button>
        </span>
      )}

      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="h-3.5 w-3.5 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <span className="text-sm text-gray-600">
          {email ?? "Connected"}
        </span>
      </div>

      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
      >
        {isLoading ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
