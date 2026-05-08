"use client";

/**
 * Toggle switch between Mode A (Initial Assessment) and Mode B (Treatment Monitoring).
 */
export default function ModeToggle({ mode, onModeChange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface border border-border p-1">
      <button
        id="mode-a-btn"
        onClick={() => onModeChange("a")}
        className={`
          flex-1 px-4 py-2 rounded-md text-xs font-semibold
          transition-all duration-200 cursor-pointer
          ${
            mode === "a"
              ? "bg-accent text-white shadow-sm shadow-accent/25"
              : "text-muted hover:text-foreground hover:bg-surface-hover"
          }
        `}
      >
        <span className="block">Mode A</span>
        <span className="block text-[10px] font-normal opacity-70 mt-0.5">
          Initial Assessment
        </span>
      </button>
      <button
        id="mode-b-btn"
        onClick={() => onModeChange("b")}
        className={`
          flex-1 px-4 py-2 rounded-md text-xs font-semibold
          transition-all duration-200 cursor-pointer
          ${
            mode === "b"
              ? "bg-warning text-white shadow-sm shadow-warning/25"
              : "text-muted hover:text-foreground hover:bg-surface-hover"
          }
        `}
      >
        <span className="block">Mode B</span>
        <span className="block text-[10px] font-normal opacity-70 mt-0.5">
          Treatment Monitoring
        </span>
      </button>
    </div>
  );
}
