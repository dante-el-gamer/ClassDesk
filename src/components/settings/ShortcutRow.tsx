import { useState } from "react";
import { useSettingsStore } from "../../stores/settings-store";
import { formatKeyBinding } from "../../lib/keys";
import type { ActionId, KeyBinding } from "../../types";

interface ShortcutRowProps {
  actionId: ActionId;
  label: string;
}

export default function ShortcutRow({ actionId, label }: ShortcutRowProps) {
  const binding = useSettingsStore((s) => s.keyBindings[actionId]);
  const setKeyBinding = useSettingsStore((s) => s.setKeyBinding);
  const [recording, setRecording] = useState(false);

  const handleStart = () => setRecording(true);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nb: KeyBinding = {
      key: e.key === "Control" || e.key === "Alt" || e.key === "Shift" || e.key === "Meta"
        ? null
        : e.key,
      ctrl: e.ctrlKey || e.metaKey,
      alt: e.altKey,
      shift: e.shiftKey,
    };
    if (nb.key) {
      setKeyBinding(actionId, nb);
      setRecording(false);
    }
  };

  const handleClear = () => {
    if (recording) return;
    setKeyBinding(actionId, { key: null, ctrl: false, alt: false, shift: false });
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {recording ? (
          <span
            className="inline-flex min-w-[100px] items-center justify-center rounded border-2 border-blue-400 bg-blue-50 px-3 py-1 text-sm text-blue-600 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            autoFocus
          >
            Press keys...
          </span>
        ) : (
          <button
            onClick={handleStart}
            className="inline-flex min-w-[100px] items-center justify-center rounded border border-gray-300 px-3 py-1 text-sm font-mono text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
            title="Click to rebind"
          >
            {formatKeyBinding(binding)}
          </button>
        )}
        <button
          onClick={handleClear}
          disabled={!binding.key || recording}
          className="rounded p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Clear shortcut"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
