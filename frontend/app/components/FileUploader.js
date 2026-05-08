"use client";

import { useState, useCallback, useRef } from "react";

/*
 * Expected MRI modalities — order matters for display.
 * Each uploaded file must match exactly one of these keywords.
 */
const MODALITIES = [
  { key: "flair", label: "FLAIR", color: "#f59e0b" },
  { key: "t1ce",  label: "T1ce",  color: "#22c55e" },
  { key: "t1",    label: "T1w",   color: "#6366f1" },
  { key: "t2",    label: "T2w",   color: "#ec4899" },
];

const ACCEPTED_EXTENSIONS = [".nii", ".nii.gz"];

/**
 * Identify which modality a filename belongs to.
 * Returns the modality key or null.
 */
function identifyModality(filename) {
  const lower = filename.toLowerCase();
  // Check longest keywords first to prevent "t1" matching before "t1ce"
  const keywords = [
    { key: "t1ce", patterns: ["t1ce", "t1c", "t1_ce"] },
    { key: "flair", patterns: ["flair"] },
    { key: "t2", patterns: ["t2"] },
    { key: "t1", patterns: ["t1"] },
  ];
  for (const kw of keywords) {
    for (const pattern of kw.patterns) {
      if (lower.includes(pattern)) return kw.key;
    }
  }
  return null;
}

/**
 * Validate a file has the correct NIfTI extension.
 */
function isNiftiFile(filename) {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/*
 * ── Icons ───────────────────────────────────────────────────────────────────
 */
function UploadCloudIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

function FileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function CheckCircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>
  );
}

/*
 * ── MRI File Uploader ───────────────────────────────────────────────────────
 *
 * Enforces EXACTLY 4 files, one per modality (FLAIR, T1, T1ce, T2).
 * The "Run Inference" button is only enabled when all 4 are present.
 */
export default function FileUploader({ onAnalyze, loading }) {
  const [files, setFiles] = useState({}); // { flair: File, t1: File, ... }
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  const fileCount = Object.keys(files).length;
  const isReady = fileCount === 4;

  // ── Process dropped/selected files ────────────────────────────────────
  const processFiles = useCallback(
    (fileList) => {
      const newErrors = [];
      const newFiles = { ...files };

      Array.from(fileList).forEach((file) => {
        // Validate extension
        if (!isNiftiFile(file.name)) {
          newErrors.push(
            `"${file.name}" is not a valid NIfTI file (.nii or .nii.gz).`
          );
          return;
        }

        // Identify modality
        const mod = identifyModality(file.name);
        if (!mod) {
          newErrors.push(
            `Cannot identify modality for "${file.name}". Filename must contain: flair, t1, t1ce, or t2.`
          );
          return;
        }

        // Check for duplicates
        if (newFiles[mod]) {
          newErrors.push(
            `Duplicate: "${file.name}" replaces existing ${mod.toUpperCase()} file.`
          );
        }

        newFiles[mod] = file;
      });

      setFiles(newFiles);
      setErrors(newErrors);
    },
    [files]
  );

  // ── Drag handlers ─────────────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  // ── Click handler ─────────────────────────────────────────────────────
  const handleFileSelect = useCallback(
    (e) => {
      processFiles(e.target.files);
      // Reset input so re-uploading the same file triggers onChange
      e.target.value = "";
    },
    [processFiles]
  );

  // ── Remove a file ─────────────────────────────────────────────────────
  const removeFile = useCallback(
    (modKey) => {
      const updated = { ...files };
      delete updated[modKey];
      setFiles(updated);
      setErrors([]);
    },
    [files]
  );

  // ── Clear all ─────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    setFiles({});
    setErrors([]);
  }, []);

  // ── Trigger analysis ──────────────────────────────────────────────────
  const handleAnalyze = useCallback(() => {
    if (!isReady || loading) return;
    // Order: flair, t1, t1ce, t2
    const ordered = [files.flair, files.t1, files.t1ce, files.t2];
    onAnalyze(ordered);
  }, [files, isReady, loading, onAnalyze]);

  return (
    <div className="space-y-4">
      {/* ── Drop Zone ────────────────────────────────────────────────────── */}
      <div
        id="dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-300 ease-out
          flex flex-col items-center justify-center py-10 px-6
          group
          ${
            isDragOver
              ? "dropzone-active border-accent bg-accent-subtle scale-[1.01]"
              : isReady
              ? "border-success/40 bg-success/5 hover:border-success/60"
              : "border-border hover:border-accent/50 hover:bg-surface-hover"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".nii,.nii.gz"
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
        />

        {isReady ? (
          <>
            <CheckCircleIcon className="w-10 h-10 text-success mb-3" />
            <p className="text-sm font-medium text-success">
              All 4 modalities ready
            </p>
            <p className="text-xs text-muted mt-1">
              Click to replace files or drag new ones
            </p>
          </>
        ) : (
          <>
            <div className={`
              rounded-full p-3 mb-3 transition-colors duration-300
              ${isDragOver ? "bg-accent/20" : "bg-surface group-hover:bg-accent/10"}
            `}>
              <UploadCloudIcon
                className={`w-8 h-8 transition-colors ${
                  isDragOver ? "text-accent" : "text-muted group-hover:text-accent"
                }`}
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              Drop 4 MRI NIfTI files here
            </p>
            <p className="text-xs text-muted mt-1">
              FLAIR, T1w, T1ce, T2w — .nii or .nii.gz format
            </p>
            <p className="text-xs text-muted mt-0.5">
              {fileCount}/4 uploaded
            </p>
          </>
        )}
      </div>

      {/* ── Modality Slots ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {MODALITIES.map((mod) => {
          const file = files[mod.key];
          return (
            <div
              key={mod.key}
              className={`
                flex items-center gap-2.5 rounded-lg px-3 py-2.5
                border transition-all duration-200
                ${
                  file
                    ? "border-border bg-surface"
                    : "border-dashed border-border/50 bg-transparent"
                }
              `}
            >
              {/* Modality badge */}
              <span
                className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${mod.color}18`,
                  color: mod.color,
                }}
              >
                {mod.label}
              </span>

              {file ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-muted">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(mod.key);
                    }}
                    className="flex-shrink-0 p-1 rounded hover:bg-danger/10 
                               text-muted hover:text-danger transition-colors cursor-pointer"
                    title={`Remove ${mod.label}`}
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <p className="text-xs text-muted/50 italic">Not uploaded</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Errors ───────────────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="rounded-lg bg-danger/5 border border-danger/20 px-4 py-3 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-danger">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          id="run-inference-btn"
          onClick={handleAnalyze}
          disabled={!isReady || loading}
          className={`
            flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3
            text-sm font-semibold transition-all duration-300 cursor-pointer
            ${
              isReady && !loading
                ? "bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 pulse-glow"
                : "bg-surface text-muted cursor-not-allowed opacity-60"
            }
          `}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running Inference...
            </>
          ) : (
            <>
              <ScanPulseIcon className="w-4 h-4" />
              Run Inference
            </>
          )}
        </button>

        {fileCount > 0 && (
          <button
            onClick={clearAll}
            className="px-4 py-3 rounded-lg border border-border text-sm text-muted
                       hover:text-foreground hover:border-danger/30 hover:bg-danger/5
                       transition-all cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function ScanPulseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3-9 4 18 3-9h4" />
    </svg>
  );
}
