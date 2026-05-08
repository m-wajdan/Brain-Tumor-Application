"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchRecords, deleteRecord, updateRecord } from "../lib/api";

/*
 * ── Icons ───────────────────────────────────────────────────────────────────
 */
function EyeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function EditIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    </svg>
  );
}

function RefreshIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

/*
 * ── Skeleton rows ───────────────────────────────────────────────────────────
 */
function SkeletonRow() {
  return (
    <tr className="border-b border-border/50">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

/*
 * ── Patient History Table ───────────────────────────────────────────────────
 */
export default function PatientHistory({ onViewRecord }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [editNotes, setEditNotes] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  // ── Fetch records ─────────────────────────────────────────────────────
  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRecords();
      setRecords(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // ── Inline rename ─────────────────────────────────────────────────────
  const startEditing = (record) => {
    setEditingId(record.id);
    setEditName(record.patient_name);
    setEditingNotesId(null);
  };

  const saveEdit = async (id) => {
    try {
      await updateRecord(id, { patient_name: editName });
      setEditingId(null);
      loadRecords();
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  // ── Inline notes edit ───────────────────────────────────────────────────
  const startEditingNotes = (record) => {
    setEditingNotesId(record.id);
    setEditNotes(record.doctor_notes || "");
    setEditingId(null);
  };

  const saveEditNotes = async (id) => {
    try {
      await updateRecord(id, { doctor_notes: editNotes });
      setEditingNotesId(null);
      loadRecords();
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelEditNotes = () => {
    setEditingNotesId(null);
    setEditNotes("");
  };

  // ── Delete with confirmation ──────────────────────────────────────────
  const handleDelete = async (id) => {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    try {
      await deleteRecord(id);
      setDeletingId(null);
      loadRecords();
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Format date ───────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Extract volume summary from volumes_json ──────────────────────────
  const volumeSummary = (vol) => {
    if (!vol) return "—";
    const wt = vol.wt_volume_cm3;
    if (wt === undefined) return "—";
    return `WT: ${wt.toFixed(1)} cm³`;
  };

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Patient Records
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {records.length} record{records.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <button
          onClick={loadRecords}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted
                     hover:text-foreground border border-border hover:border-accent/30
                     hover:bg-accent/5 transition-all cursor-pointer"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg bg-danger/5 border border-danger/20 px-4 py-3">
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border overflow-hidden bg-surface/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider w-1/4">
                  Patient Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider w-1/3">
                  Clinical Notes
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Volume
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Date
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="text-muted">
                      <p className="text-sm font-medium">No records yet</p>
                      <p className="text-xs mt-1">
                        Run an assessment and save the results to see them here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/30 hover:bg-surface-hover/50 transition-colors group"
                  >
                    {/* ── Name (editable) ─────────────────────────────────── */}
                    <td className="px-4 py-4">
                      {editingId === record.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(record.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="px-2 py-1 rounded bg-background border border-accent/40
                                       text-xs text-foreground outline-none focus:border-accent
                                       w-full"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(record.id)}
                            className="text-[10px] text-success hover:text-success/80 font-medium cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group/name">
                          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                            {record.patient_name}
                          </span>
                          <button
                            onClick={() => startEditing(record)}
                            className="opacity-0 group-hover/name:opacity-100 transition-opacity cursor-pointer"
                          >
                            <EditIcon className="w-3 h-3 text-muted hover:text-accent" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* ── Clinical Notes (editable) ─────────────────────────── */}
                    <td className="px-4 py-4">
                      {editingNotesId === record.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.ctrlKey) saveEditNotes(record.id);
                              if (e.key === "Escape") cancelEditNotes();
                            }}
                            className="px-2 py-2 rounded bg-background border border-accent/40
                                       text-xs text-foreground outline-none focus:border-accent
                                       w-full min-h-[60px] resize-none"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                             <button
                              onClick={cancelEditNotes}
                              className="text-[10px] text-muted hover:text-foreground cursor-pointer font-bold"
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={() => saveEditNotes(record.id)}
                              className="text-[10px] text-accent hover:text-accent/80 font-bold cursor-pointer"
                            >
                              SAVE
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => startEditingNotes(record)}
                          className="text-xs text-muted/80 line-clamp-2 cursor-pointer hover:text-foreground/90 transition-colors italic font-medium"
                        >
                          {record.doctor_notes || "Click to add clinical notes..."}
                        </div>
                      )}
                    </td>

                    {/* ── Volume ──────────────────────────────────────────── */}
                    <td className="px-4 py-4 text-xs text-muted font-mono">
                      {volumeSummary(record.volumes_json)}
                    </td>

                    {/* ── Date ────────────────────────────────────────────── */}
                    <td className="px-4 py-4 text-xs text-muted">
                      {formatDate(record.created_at)}
                    </td>

                    {/* ── Actions ─────────────────────────────────────────── */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewRecord(record)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px]
                                     font-medium text-accent bg-accent/8 hover:bg-accent/15
                                     transition-colors cursor-pointer"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          onBlur={() => setDeletingId(null)}
                          className={`
                            flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px]
                            font-medium transition-all cursor-pointer
                            ${
                              deletingId === record.id
                                ? "text-white bg-danger hover:bg-danger/90"
                                : "text-muted hover:text-danger hover:bg-danger/8"
                            }
                          `}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                          {deletingId === record.id ? "Confirm?" : ""}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
