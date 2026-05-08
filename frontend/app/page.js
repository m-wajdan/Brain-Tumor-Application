"use client";

import { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ModeToggle from "./components/ModeToggle";
import FileUploader from "./components/FileUploader";
import ResultsDisplay from "./components/ResultsDisplay";
import PatientView from "./components/PatientView";
import PatientHistory from "./components/PatientHistory";
import AuthPage from "./components/AuthPage";
import { analyzeScan, saveRecord } from "./lib/api";
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  // ── Auth state ────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);

  // ── Navigation state ──────────────────────────────────────────────────
  const [activePage, setActivePage] = useState("assessment");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Assessment state ──────────────────────────────────────────────────
  const [mode, setMode] = useState("a"); // "a" or "b"
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Record viewer state ───────────────────────────────────────────────
  const [viewingRecord, setViewingRecord] = useState(null);

  // ── Run Mode A Analysis ───────────────────────────────────────────────
  const handleAnalyze = useCallback(async (files) => {
    setAnalyzing(true);
    setResult(null);
    setAnalysisError(null);
    setSaveSuccess(false);

    try {
      const data = await analyzeScan(files);
      setResult(data);
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }, []);

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

  // ── View a saved record ───────────────────────────────────────────────
  const handleViewRecord = useCallback((record) => {
    setViewingRecord(record);
    setActivePage("assessment");
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

  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  return (
    <div className="flex h-full">
      <Toaster position="top-right" />
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar 
        activePage={activePage} 
        onNavigate={setActivePage} 
        user={user}
        onLogout={() => {
          setUser(null);
          toast.success("Logged out successfully");
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"}`}>
        <div className="mx-auto px-6 py-8">
          {activePage === "assessment" || activePage === "patient_report" ? (
            /* ── Assessment / Report Page ────────────────────────────────── */
            <div className="space-y-6">
              {/* Page header */}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {activePage === "assessment" ? "New Assessment" : "Patient Report & Chat"}
                </h1>
                <p className="text-sm text-muted mt-1">
                  {activePage === "assessment"
                    ? "Upload 4 co-registered NIfTI modalities to run AI-powered brain tumor segmentation and volumetric analysis."
                    : "Generate an AI-powered clinical report and chat with the AI assistant about the scan results."}
                </p>
              </div>

              {/* Assessment content (always Mode A) */}
              <div className="space-y-6">
                {/* Uploader panel */}
                {!analyzing && !result && !analysisError && (
                  <div className="max-w-2xl mx-auto mt-8">
                    <div className="rounded-xl border border-border bg-surface/30 p-8 shadow-sm">
                      <div className="mb-6 text-center">
                        <h2 className="text-xl font-semibold text-foreground">
                          Upload MRI Scans
                        </h2>
                        <p className="text-sm text-muted mt-1.5">
                          FLAIR, T1w, T1ce, T2w — NIfTI format
                        </p>
                      </div>
                      <FileUploader
                        onAnalyze={handleAnalyze}
                        loading={analyzing}
                      />
                    </div>
                  </div>
                )}

                {/* Loader panel */}
                {analyzing && (
                  <div className="max-w-2xl mx-auto mt-8">
                    <div className="rounded-xl border border-border bg-surface/30 p-12 flex flex-col items-center justify-center min-h-[400px] shadow-sm">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                        <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-b-accent/40 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                      </div>
                      <p className="text-lg font-medium text-foreground mt-6">
                        Analyzing Scans...
                      </p>
                      <p className="text-sm text-muted mt-2">
                        This may take 30-60 seconds on CPU.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error panel */}
                {analysisError && !analyzing && (
                  <div className="max-w-2xl mx-auto mt-8">
                    <div className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center shadow-sm">
                      <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                         <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-lg font-medium text-danger">
                        Analysis Failed
                      </p>
                      <p className="text-sm text-danger/70 mt-2 max-w-md mx-auto">
                        {analysisError}
                      </p>
                      <button 
                        onClick={() => setAnalysisError(null)}
                        className="mt-6 px-6 py-2.5 bg-danger/10 hover:bg-danger/20 text-danger font-medium rounded-lg transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Results panel */}
                {result && !analyzing && (
                  <div className="space-y-6">
                    {saveSuccess && (
                      <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center shadow-sm">
                        <p className="text-sm font-medium text-success">
                          Record saved successfully! View it in Patient History.
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-2">
                      <button
                        onClick={() => {
                          setResult(null);
                          setAnalysisError(null);
                          setSaveSuccess(false);
                        }}
                        className="px-4 py-2 text-sm font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg text-foreground transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Start New Assessment
                      </button>
                    </div>

                    {activePage === "assessment" ? (
                      <ResultsDisplay
                        result={result}
                        onSave={handleSave}
                        saving={saving}
                        mode="a"
                      />
                    ) : (
                      <PatientView result={result} mode="a" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activePage === "history" ? (
            /* ── Patient History Page ───────────────────────────────────── */
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Patient History
                </h1>
                <p className="text-sm text-muted mt-1">
                  View, rename, and manage previously saved scan records and
                  clinical notes.
                </p>
              </div>

              <PatientHistory onViewRecord={handleViewRecord} />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
