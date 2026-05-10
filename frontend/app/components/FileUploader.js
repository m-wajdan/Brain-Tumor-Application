"use client";

import { useState, useCallback, useRef } from "react";

/*
 * Expected MRI modalities — order matters for display.
 * Each uploaded file must match exactly one of these keywords.
 */
const MODALITIES = [
  { key: "t1",    label: "T1",    order: 1 },
  { key: "t1ce",  label: "T1ce",  order: 2 },
  { key: "t2",    label: "T2",    order: 3 },
  { key: "flair", label: "FLAIR", order: 4 },
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
    // Preserve modality keys so the review screen can label each image.
    const ordered = {
      t1: files.t1,
      t1ce: files.t1ce,
      t2: files.t2,
      flair: files.flair,
    };
    onAnalyze(ordered);
  }, [files, isReady, loading, onAnalyze]);

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload MRI modalities</h2>
        <p className="text-gray-600">All four channels are required (BraTS-style input).</p>
      </div>

      {/* ── Upload Grid (2x2) ────────────────────────────────────────────── */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".nii,.nii.gz"
        onChange={handleFileSelect}
        className="hidden"
        id="file-input"
      />

      <div className="grid grid-cols-2 gap-6">
        {MODALITIES.map((mod) => {
          const file = files[mod.key];
          return (
            <div
              key={mod.key}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-all duration-200 group
                ${
                  file
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 hover:border-[#1a9d9f] hover:bg-blue-50"
                }
              `}
            >
              {file ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(mod.key);
                    }}
                    className="mt-3 text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <svg className="w-12 h-12 text-gray-400 group-hover:text-[#1a9d9f] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{mod.label}</p>
                    <p className="text-sm text-gray-600 mt-2">Drag & drop or click</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Errors ───────────────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-700">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* ── Continue Button ──────────────────────────────────────────────── */}
      <div className="flex justify-end pt-6">
        <button
          onClick={handleAnalyze}
          disabled={!isReady || loading}
          className={`
            px-8 py-3 rounded-lg font-semibold transition-all
            ${
              isReady && !loading
                ? "bg-[#1a9d9f] hover:bg-[#158a8c] text-white shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          {loading ? "Processing..." : "Continue to review"}
        </button>
      </div>
    </div>
  );
}
