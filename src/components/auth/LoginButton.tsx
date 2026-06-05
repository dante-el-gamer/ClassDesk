import { useAuthStore } from "../../stores/auth-store";

export default function LoginButton() {
  const startLogin = useAuthStore((s) => s.startLogin);
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const isLoginInProgress = useAuthStore((s) => s.isLoginInProgress);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const handleClick = async () => {
    clearError();

    // Start the OAuth flow — opens the browser for Google sign-in
    const started = await startLogin();
    if (!started) return; // startLogin already set the error in state

    // After the browser opens, wait for the user to complete the flow.
    // The local server running in the Rust backend will catch the
    // redirect.  Call completeLogin to exchange the code and finalize.
    // In a real app you'd poll or the server would notify — here we
    // call exchange immediately and the backend waits for the callback.
    await completeLogin();
  };

  if (isLoginInProgress || isLoading) {
    return (
      <button
        disabled
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm text-gray-500"
      >
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
        Signing in...
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-500" role="alert">
          {error}
          <button onClick={clearError} className="ml-1 font-bold hover:text-red-700">
            ✕
          </button>
        </span>
      )}
      <button
        onClick={handleClick}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}
