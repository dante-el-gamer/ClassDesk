import { useGridStore } from "../../stores/grid-store";

/**
 * A simple rows/cols editor using number inputs.
 * Directly mutates the active layout dimensions via grid-store.
 */
export default function GridConfig() {
  const activeLayout = useGridStore((s) => s.activeLayout);
  const setRows = useGridStore((s) => s.setRows);
  const setCols = useGridStore((s) => s.setCols);

  if (!activeLayout) return null;

  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) setRows(val);
  };

  const handleColsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) setCols(val);
  };

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1 text-xs text-gray-600">
        Rows:
        <input
          type="number"
          min={1}
          max={20}
          value={activeLayout.rows}
          onChange={handleRowsChange}
          className="w-14 rounded border border-gray-300 px-2 py-1 text-sm text-center"
        />
      </label>

      <label className="flex items-center gap-1 text-xs text-gray-600">
        Cols:
        <input
          type="number"
          min={1}
          max={20}
          value={activeLayout.cols}
          onChange={handleColsChange}
          className="w-14 rounded border border-gray-300 px-2 py-1 text-sm text-center"
        />
      </label>
    </div>
  );
}
