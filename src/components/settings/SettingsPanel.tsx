import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useSettingsStore, ACTION_LABELS } from "../../stores/settings-store";
import { useCommandStore } from "../../stores/command-store";
import { useThemeStore } from "../../stores/theme-store";
import ShortcutRow from "./ShortcutRow";
import type { ThemeMode, SidebarPosition, ActionId } from "../../types";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "darker", label: "Darker" },
];

const SIDEBAR_OPTIONS: { value: SidebarPosition; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "top", label: "Top" },
  { value: "right", label: "Right" },
  { value: "bottom", label: "Bottom" },
];

const SHORTCUT_ACTIONS: ActionId[] = [
  "newCourse",
  "saveLayout",
  "deleteCourse",
  "undo",
  "toggleTheme",
  "openSettings",
];

export default function SettingsPanel() {
  const command = useCommandStore((s) => s.pending);
  const open = command?.type === "open-settings";
  const dispatch = useCommandStore((s) => s.dispatch);

  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const sidebarPosition = useSettingsStore((s) => s.sidebarPosition);
  const setSidebarPosition = useSettingsStore((s) => s.setSidebarPosition);
  const resetKeyBindings = useSettingsStore((s) => s.resetKeyBindings);

  const [tab, setTab] = useState<"appearance" | "shortcuts">("appearance");

  const handleOpenChange = (open: boolean) => {
    if (!open) dispatch("open-settings");
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100">
          <Dialog.Title className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Settings
          </Dialog.Title>

          {/* Tabs */}
          <div className="mt-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setTab("appearance")}
              className={`pb-2 text-sm font-medium transition-colors ${
                tab === "appearance"
                  ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Appearance
            </button>
            <button
              onClick={() => setTab("shortcuts")}
              className={`pb-2 text-sm font-medium transition-colors ${
                tab === "shortcuts"
                  ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Keyboard Shortcuts
            </button>
          </div>

          <div className="mt-4 space-y-6">
            {tab === "appearance" && (
              <>
                {/* Theme */}
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Theme
                  </legend>
                  <div className="flex gap-2">
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setThemeMode(opt.value)}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          themeMode === opt.value
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {/* Sidebar */}
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sidebar Position
                  </legend>
                  <div className="flex gap-2">
                    {SIDEBAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSidebarPosition(opt.value)}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          sidebarPosition === opt.value
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {tab === "shortcuts" && (
              <div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {SHORTCUT_ACTIONS.map((id) => (
                    <ShortcutRow key={id} actionId={id} label={ACTION_LABELS[id]} />
                  ))}
                </div>
                <button
                  onClick={resetKeyBindings}
                  className="mt-4 text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Reset all to defaults
                </button>
              </div>
            )}
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
