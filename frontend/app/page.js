"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ModeToggle from "./components/ModeToggle";
import FileUploader from "./components/FileUploader";
import ResultsDisplay from "./components/ResultsDisplay";
import PatientView from "./components/PatientView";
import PatientHistory from "./components/PatientHistory";
import AuthPage from "./components/AuthPage";
import DiagnosisReport from "./components/DiagnosisReport";
import { analyzeScan, saveRecord, fetchRecords, changePassword } from "./lib/api";
import { Toaster, toast } from "react-hot-toast";
import * as nifti from "nifti-reader-js";

export default function Home() {
  // ── Auth state ────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("notes_theme") || "light";
  });

  // ── Navigation state ──────────────────────────────────────────────────
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Workflow state (Upload → Review → RunAnalysis → Report) ──────────
  const [workflowStep, setWorkflowStep] = useState("upload"); // upload | review | runAnalysis | report
  const [uploadedFiles, setUploadedFiles] = useState(null);
  const [patientInfo, setPatientInfo] = useState({ id: "", age: "", notes: "" });

  // ── Assessment state ──────────────────────────────────────────────────
  const [mode, setMode] = useState("a"); // "a" or "b"
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Record viewer state ───────────────────────────────────────────────
  const [viewingRecord, setViewingRecord] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("notes_theme", theme);
  }, [theme]);

  // ── Run Mode A Analysis ───────────────────────────────────────────────
  const handleFilesUploaded = useCallback((files) => {
    setUploadedFiles(files);
    setWorkflowStep("review");
    setAnalysisError(null);
    setResult(null);
  }, []);

  // ── Proceed from Review to RunAnalysis screen ──────────────────────────
  const handleProceedToAnalysis = useCallback(() => {
    setWorkflowStep("runAnalysis");
  }, []);

  // ── Actually run the analysis ──────────────────────────────────────────
  const handleRunAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setAnalysisProgress(0);
    setResult(null);
    setAnalysisError(null);
    setSaveSuccess(false);

    try {
      const orderedFiles = [uploadedFiles?.flair, uploadedFiles?.t1, uploadedFiles?.t1ce, uploadedFiles?.t2].filter(Boolean);

      // Simulate progress updates
      setAnalysisProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisProgress(50);

      const data = await analyzeScan(orderedFiles);
      
      setAnalysisProgress(90);
      await new Promise(resolve => setTimeout(resolve, 300));
      setAnalysisProgress(100);
      
      setResult(data);
      setWorkflowStep("report");
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }, [uploadedFiles]);

  // ── Save record ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveRecord({
        patient_name: "Unnamed Patient",
        scan_type: "mode_a",
        volumes_json: {
          wt_volume_cm3: result.volumes.wt_volume_cm3,
          tc_volume_cm3: result.volumes.tc_volume_cm3,
          et_volume_cm3: result.volumes.et_volume_cm3,
          voxel_dims_mm: result.volumes.voxel_dims_mm,
        },
        overlay_path: result.overlay_url,
        original_path: result.original_url,
        doctor_notes: "",
      });
      setSaveSuccess(true);
      toast.success("Record saved successfully!");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      toast.error(err.message);
      setAnalysisError(err.message);
    } finally {
      setSaving(false);
    }
  }, [result]);

  const handleNavigate = useCallback((page) => {
    if (page === "assessment") {
      setActivePage(page);
      setWorkflowStep("upload");
      setUploadedFiles(null);
      setPatientInfo({ id: "", age: "", notes: "" });
      setAnalysisError(null);
      setAnalyzing(false);
      setResult(null);
      setViewingRecord(null);
      return;
    }

    if (page === "dashboard") {
      setViewingRecord(null);
      setActivePage(page);
      setWorkflowStep("upload");
      setUploadedFiles(null);
      setAnalysisError(null);
      setAnalyzing(false);
      setResult(null);
      return;
    }

    if (page === "history" || page === "settings") {
      setActivePage(page);
      return;
    }

    setActivePage(page);
  }, []);

  // ── View a saved record ───────────────────────────────────────────────
  const handleViewRecord = useCallback((record) => {
    setViewingRecord(record);
    setActivePage("assessment");
    setWorkflowStep("report");
    setAnalysisError(null);
    setAnalyzing(false);
    setUploadedFiles(null);
    setPatientInfo({
      id: record.patient_name || "",
      age: record.age ?? "",
      notes: record.doctor_notes || "",
    });
    // Hydrate result from saved record data
    setResult({
      id: record.id,
      volumes: record.volumes_json,
      overlay_url: record.overlay_path,
      original_url: record.original_path,
      slice_index: 0,
      doctor_notes: record.doctor_notes || "",
    });
  }, []);

  const handleBackFromReport = useCallback(() => {
    if (viewingRecord) {
      setViewingRecord(null);
      setResult(null);
      setWorkflowStep("upload");
      setActivePage("history");
      return;
    }

    setWorkflowStep("review");
  }, [viewingRecord]);

  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  return (
    <div className="flex h-full">
      <Toaster position="top-right" />
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar 
        activePage={activePage} 
        onNavigate={handleNavigate} 
        user={user}
        onLogout={() => {
          setUser(null);
          toast.success("Logged out successfully");
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"} bg-background text-foreground`}>
        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <div className="bg-surface border-b border-border px-8 py-4 flex justify-between items-center">
          <div className="w-full"></div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a9d9f] flex items-center justify-center text-white font-bold text-sm uppercase">
                {user.email[0]}
              </div>
            </div>
          )}
        </div>

        <div className="mx-auto px-8 py-8 max-w-6xl">
          {activePage === "dashboard" ? (
            <DashboardPanel
              user={user}
              onStartDiagnosis={() => handleNavigate("assessment")}
              onGoHistory={() => handleNavigate("history")}
              onGoSettings={() => handleNavigate("settings")}
            />
          ) : activePage === "assessment" || activePage === "patient_report" ? (
            /* ── Assessment / Report Page ────────────────────────────────── */
            <div className="space-y-8">
              {/* Page header */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-6 h-6 text-[#1a9d9f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h1 className="text-3xl font-bold text-gray-900">New Diagnosis</h1>
                </div>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-6">
                {[
                  { step: 1, label: "Upload" },
                  { step: 2, label: "Review" },
                  { step: 3, label: "Analyze" }
                ].map((item, idx) => {
                  let status = "inactive";
                  if (workflowStep === "upload" && item.step <= 1) status = "active";
                  if (workflowStep === "review" && item.step <= 2) status = "active";
                  if ((workflowStep === "runAnalysis" || workflowStep === "report") && item.step <= 3) status = "active";
                  
                  return (
                    <div key={item.step} className="flex items-center gap-4">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                        ${status === "active" ? "bg-[#1a9d9f]" : "bg-gray-300"}
                      `}>
                        {item.step}
                      </div>
                      <span className={`text-sm font-medium ${status === "active" ? "text-gray-900" : "text-gray-700"}`}>{item.label}</span>
                      {idx < 2 && <div className={`w-12 h-1 ${status === "active" ? "bg-[#1a9d9f]" : "bg-gray-300"}`} />}
                    </div>
                  );
                })}
              </div>

              {/* Workflow content */}
              <div className="space-y-6">
                {/* STEP 1: UPLOAD */}
                {workflowStep === "upload" && (
                  <div className="mt-8 bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                    <FileUploader
                      onAnalyze={handleFilesUploaded}
                      loading={false}
                    />
                  </div>
                )}

                {/* STEP 2: REVIEW */}
                {workflowStep === "review" && uploadedFiles && (
                  <ReviewPanel 
                    files={uploadedFiles}
                    patientInfo={patientInfo}
                    onPatientInfoChange={setPatientInfo}
                    onBack={() => setWorkflowStep("upload")}
                    onContinue={handleProceedToAnalysis}
                  />
                )}

                {/* STEP 3: RUN ANALYSIS */}
                {workflowStep === "runAnalysis" && !analyzing && !result && (
                  <RunAnalysisConfirmation
                    onBack={() => setWorkflowStep("review")}
                    onRun={handleRunAnalysis}
                  />
                )}

                {/* STEP 3: ANALYSIS IN PROGRESS */}
                {workflowStep === "runAnalysis" && analyzing && (
                  <AnalysisProgressPanel
                    progress={analysisProgress}
                  />
                )}

                {/* STEP 4: REPORT */}
                {workflowStep === "report" && result && !analyzing && (
                  <DiagnosisReport
                    result={result}
                    patientInfo={patientInfo}
                    onBack={handleBackFromReport}
                  />
                )}

                {/* Error panel */}
                {analysisError && (
                  <div className="max-w-2xl mx-auto mt-8">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-lg font-medium text-red-600">Analysis Failed</p>
                      <p className="text-sm text-red-600/70 mt-2 max-w-md mx-auto">{analysisError}</p>
                      <button 
                        onClick={() => {
                          setAnalysisError(null);
                          setWorkflowStep("runAnalysis");
                        }}
                        className="mt-6 px-6 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 font-medium rounded-lg transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activePage === "history" ? (
            /* ── Patient History Page ───────────────────────────────────── */
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Patient History
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  View, rename, and manage previously saved scan records and clinical notes.
                </p>
              </div>

              <PatientHistory onViewRecord={handleViewRecord} />
            </div>
          ) : activePage === "settings" ? (
            <SettingsPanel
              user={user}
              theme={theme}
              onThemeChange={setTheme}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

/* ── Review Panel Component ────────────────────────────────────────────── */
function ReviewPanel({ files, patientInfo, onPatientInfoChange, onBack, onContinue }) {
  const [displayFiles, setDisplayFiles] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const modalityLabels = { t1: "T1", t1ce: "T1ce", t2: "T2", flair: "FLAIR" };

    const readers = {
      2: { bytesPerVoxel: 1, read: (view, offset) => view.getUint8(offset) },
      4: { bytesPerVoxel: 2, read: (view, offset, littleEndian) => view.getInt16(offset, littleEndian) },
      8: { bytesPerVoxel: 4, read: (view, offset, littleEndian) => view.getInt32(offset, littleEndian) },
      16: { bytesPerVoxel: 4, read: (view, offset, littleEndian) => view.getFloat32(offset, littleEndian) },
      64: { bytesPerVoxel: 8, read: (view, offset, littleEndian) => view.getFloat64(offset, littleEndian) },
      256: { bytesPerVoxel: 1, read: (view, offset) => view.getInt8(offset) },
      512: { bytesPerVoxel: 2, read: (view, offset, littleEndian) => view.getUint16(offset, littleEndian) },
      768: { bytesPerVoxel: 4, read: (view, offset, littleEndian) => view.getUint32(offset, littleEndian) },
    };

    const renderPreview = async (file) => {
      let data = await file.arrayBuffer();

      if (nifti.isCompressed(data)) {
        data = await nifti.decompressAsync(data);
      }

      if (!nifti.isNIFTI(data)) {
        throw new Error("Unsupported NIfTI file");
      }

      const header = nifti.readHeader(data);
      const imageBuffer = nifti.readImage(header, data);
      const reader = readers[header.datatypeCode];

      if (!reader) {
        throw new Error(`Unsupported datatype code: ${header.datatypeCode}`);
      }

      const width = Math.max(1, header.dims[1] || 1);
      const height = Math.max(1, header.dims[2] || 1);
      const depth = Math.max(1, header.dims[3] || 1);
      const sliceIndex = Math.floor(depth / 2);
      const sliceSize = width * height;
      const sliceOffset = sliceIndex * sliceSize;
      const view = new DataView(imageBuffer);
      const sliceValues = new Float32Array(sliceSize);

      let minValue = Number.POSITIVE_INFINITY;
      let maxValue = Number.NEGATIVE_INFINITY;

      for (let i = 0; i < sliceSize; i += 1) {
        const value = reader.read(view, (sliceOffset + i) * reader.bytesPerVoxel, header.littleEndian);
        sliceValues[i] = value;
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas unavailable");
      }

      const imageData = context.createImageData(width, height);
      const range = maxValue - minValue || 1;

      for (let i = 0; i < sliceSize; i += 1) {
        const normalized = (sliceValues[i] - minValue) / range;
        const gray = Math.max(0, Math.min(255, Math.round(normalized * 255)));
        const index = i * 4;
        imageData.data[index] = gray;
        imageData.data[index + 1] = gray;
        imageData.data[index + 2] = gray;
        imageData.data[index + 3] = 255;
      }

      context.putImageData(imageData, 0, 0);
      return canvas.toDataURL("image/png");
    };

    const loadPreviews = async () => {
      const nextFiles = [];
      const orderedFiles = [
        ["t1", files?.t1],
        ["t1ce", files?.t1ce],
        ["t2", files?.t2],
        ["flair", files?.flair],
      ];

      for (const [key, file] of orderedFiles) {
        if (!file) continue;

        try {
          const url = await renderPreview(file);
          nextFiles.push({
            key,
            label: modalityLabels[key] || key.toUpperCase(),
            url,
            name: file.name,
          });
        } catch {
          nextFiles.push({
            key,
            label: modalityLabels[key] || key.toUpperCase(),
            url: null,
            name: file.name,
          });
        }
      }

      if (!cancelled) {
        setDisplayFiles(nextFiles);
      }
    };

    loadPreviews();

    return () => {
      cancelled = true;
    };
  }, [files]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:p-6 space-y-4 max-h-[calc(100vh-220px)] overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Review</h2>
          <p className="text-xs text-gray-500 mt-1">Check the input MRI slices and patient details before analysis.</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] gap-4 items-start">
        {/* MRI Images Grid */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            {displayFiles.map((file, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden bg-black border border-gray-200">
                <div className="bg-gray-900 text-white px-3 py-1.5 text-[11px] font-semibold tracking-wide">
                  {file.label}
                </div>
                <div className="h-40 lg:h-44 flex items-center justify-center bg-black">
                  {file.url ? (
                    <img src={file.url} alt={file.label} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center px-4">
                      <p className="text-white text-xs font-medium">Preview unavailable</p>
                      <p className="text-gray-400 text-[11px] mt-1 break-all">{file.name}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Patient Info Fields */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Patient ID</label>
            <input
              type="text"
              placeholder="P-1234"
              value={patientInfo.id}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a9d9f]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Age</label>
            <input
              type="text"
              placeholder="42"
              value={patientInfo.age}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, age: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a9d9f]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Clinical notes</label>
            <textarea
              placeholder="Symptoms, history..."
              value={patientInfo.notes}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a9d9f] min-h-28 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-1">
            <button
              onClick={onContinue}
              className="px-6 py-2.5 bg-[#1a9d9f] hover:bg-[#158a8c] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Run Analysis Confirmation Component ─────────────────────────────────– */
function RunAnalysisConfirmation({ onBack, onRun }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center min-h-[500px]">
      <div className="w-32 h-32 rounded-full bg-[#1a9d9f]/10 flex items-center justify-center mb-6">
        <svg className="w-16 h-16 text-[#1a9d9f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
          <path strokeWidth="2" d="M12 7v5l4 2" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Run analysis</h2>
      <p className="text-center text-gray-600 mb-8 max-w-md">
        Ready to run model inference on the 4 uploaded modalities.
      </p>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onRun}
          className="px-8 py-2.5 bg-[#1a9d9f] hover:bg-[#158a8c] text-white font-medium rounded-lg transition-colors"
        >
          Run Diagnosis
        </button>
      </div>
    </div>
  );
}

/* ── Analysis Progress Component ──────────────────────────────────────────– */
function AnalysisProgressPanel({ progress }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center min-h-[420px]">
      <div className="w-28 h-28 rounded-full bg-[#1a9d9f]/10 flex items-center justify-center mb-6">
        <svg viewBox="0 0 120 72" className="w-20 h-12" aria-hidden="true">
          <defs>
            <linearGradient id="ecgGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1a9d9f" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#1a9d9f" stopOpacity="1" />
              <stop offset="70%" stopColor="#1a9d9f" stopOpacity="1" />
              <stop offset="100%" stopColor="#1a9d9f" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M2 36 H18 L26 36 L32 18 L38 58 L46 28 L54 36 H66 L72 36 L78 16 L86 56 L94 30 L102 36 H118"
            fill="none"
            stroke="url(#ecgGlow)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ecg-wave"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Run analysis</h2>
      <p className="text-center text-gray-600 text-sm max-w-md">
        Analyzing scans - {progress}%
      </p>

      <div className="w-full max-w-md mt-6">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1a9d9f] transition-all duration-300 rounded-full"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </div>
      </div>

      <style jsx>{`
        .ecg-wave {
          stroke-dasharray: 260;
          stroke-dashoffset: 260;
          animation: ecg-draw 1.4s ease-in-out infinite;
        }

        @keyframes ecg-draw {
          0% { stroke-dashoffset: 260; opacity: 0.35; }
          35% { stroke-dashoffset: 130; opacity: 1; }
          70% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: -260; opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

function DashboardPanel({ user, onStartDiagnosis, onGoHistory, onGoSettings }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchRecords();
        if (active) setRecords(data || []);
      } catch {
        if (active) setRecords([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const totalScans = records.length;
  const latestRecord = records[0];
  const ageRecords = records.filter((record) => record.age != null);
  const avgAge = ageRecords.length
    ? Math.round(ageRecords.reduce((sum, record) => sum + Number(record.age || 0), 0) / ageRecords.length)
    : 0;
  const recentRecords = records.slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.email?.split("@")[0] || "Doctor"}</h1>
        <p className="text-sm text-muted mt-1">Run a new diagnosis or review previous reports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <button onClick={onStartDiagnosis} className="rounded-2xl bg-gradient-to-br from-[#1a9d9f] to-[#24b7ba] p-6 text-left text-white shadow-lg shadow-cyan-500/10 hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between mb-8">
            <span className="text-3xl">⟲</span>
            <span className="text-2xl">→</span>
          </div>
          <h3 className="text-xl font-bold">Start Diagnosis</h3>
          <p className="text-sm text-white/85 mt-1">Upload 4 MRI modalities</p>
        </button>

        <button onClick={onGoHistory} className="rounded-2xl border border-border bg-surface p-6 text-left hover:bg-surface-hover transition-colors">
          <div className="flex items-center justify-between mb-8 text-[#1a9d9f]">
            <span className="text-3xl">↺</span>
            <span className="text-2xl text-foreground">→</span>
          </div>
          <h3 className="text-xl font-bold text-foreground">History</h3>
          <p className="text-sm text-muted mt-1">Browse past reports</p>
        </button>

        <button onClick={onGoSettings} className="rounded-2xl border border-border bg-surface p-6 text-left hover:bg-surface-hover transition-colors">
          <div className="flex items-center justify-between mb-8 text-[#1a9d9f]">
            <span className="text-3xl">⚙</span>
            <span className="text-2xl text-foreground">→</span>
          </div>
          <h3 className="text-xl font-bold text-foreground">Settings</h3>
          <p className="text-sm text-muted mt-1">Profile & preferences</p>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total scans", value: totalScans },
          { label: "Latest scan", value: latestRecord ? new Date(latestRecord.created_at).toLocaleDateString() : "—" },
          { label: "Avg. age", value: avgAge ? `${avgAge}` : "—" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-muted font-semibold">{item.label}</p>
            <div className="mt-3 text-2xl font-bold text-foreground">{loading ? "..." : item.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Recent activity</h3>
          <button onClick={onGoHistory} className="text-sm text-[#1a9d9f] hover:text-[#158a8c]">View all</button>
        </div>
        <div className="p-5 space-y-3">
          {recentRecords.length === 0 ? (
            <p className="text-sm text-muted">No saved scans yet.</p>
          ) : (
            recentRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                <div>
                  <div className="font-medium text-foreground">{record.patient_name}</div>
                  <div className="text-xs text-muted mt-1">
                    {new Date(record.created_at).toLocaleString()} · {record.age != null ? `${record.age} yrs` : "Age n/a"}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Saved</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ user, theme, onThemeChange }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error("New password and confirmation must match.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    try {
      await changePassword({
        email: user.email,
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      toast.error(error.message || "Password update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage appearance, password, and workspace preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Appearance</p>
            <h3 className="text-lg font-semibold text-foreground mt-1">Dark mode</h3>
          </div>
          <button
            type="button"
            onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
            className={`relative inline-flex h-11 w-24 items-center rounded-full border px-1 transition-colors ${theme === "dark" ? "bg-[#1a9d9f] border-[#1a9d9f]" : "bg-gray-200 border-gray-300"}`}
          >
            <span className={`inline-flex h-9 w-9 transform items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900 transition-transform ${theme === "dark" ? "translate-x-12" : "translate-x-0"}`}>
              {theme === "dark" ? "ON" : "OFF"}
            </span>
          </button>
          <p className="text-sm text-muted">{theme === "dark" ? "Dark theme is enabled." : "Light theme is enabled."}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Account</p>
          <div className="text-sm text-foreground">
            Signed in as <span className="font-semibold">{user.email}</span>
          </div>
          <div className="text-sm text-muted">Role: {user.role}</div>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4 max-w-2xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Security</p>
          <h3 className="text-lg font-semibold text-foreground mt-1">Change password</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#1a9d9f] focus:outline-none"
          />
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#1a9d9f] focus:outline-none"
          />
          <input
            type="password"
            required
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#1a9d9f] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#1a9d9f] px-4 py-2 text-sm font-medium text-white hover:bg-[#158a8c] disabled:opacity-60"
        >
          {saving ? "Updating..." : "Update password"}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Compact layout", value: compactMode, setter: setCompactMode, note: "Use tighter spacing in the workspace." },
          { label: "Auto-save drafts", value: autoSave, setter: setAutoSave, note: "Store review notes locally while editing." },
          { label: "Email alerts", value: emailNotifications, setter: setEmailNotifications, note: "Send report notifications to your inbox." },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => item.setter(!item.value)}
            className="rounded-2xl border border-border bg-surface p-5 text-left shadow-sm hover:bg-surface-hover transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-foreground">{item.label}</h4>
                <p className="text-sm text-muted mt-1">{item.note}</p>
              </div>
              <span className={`inline-flex h-7 w-12 items-center rounded-full px-1 ${item.value ? "bg-[#1a9d9f]" : "bg-gray-300"}`}>
                <span className={`h-5 w-5 rounded-full bg-white transition-transform ${item.value ? "translate-x-5" : "translate-x-0"}`} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
