import { useAuthStore } from "../../stores/auth-store";
import googleLogo from "../../../assets/google.png";

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
        <img src={googleLogo} alt="Google" className="h-4 w-4" />
        Sign in with Google
      </button>
    </div>
  );
}
