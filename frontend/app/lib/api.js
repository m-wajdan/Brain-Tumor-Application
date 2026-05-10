/**
 * API client for communicating with the FastAPI backend.
 * All requests are routed to http://127.0.0.1:8000.
 */

const API_BASE = "http://127.0.0.1:8000";
const LOCAL_RECORDS_KEY = "notes_local_records";

function readLocalRecords() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_RECORDS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalRecords(records) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records));
}

function cloneLocalRecord(record) {
  return {
    ...record,
    id: Number(record.id),
  };
}

// ── Generic helpers ─────────────────────────────────────────────────────────

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ── Analysis endpoints ──────────────────────────────────────────────────────

/**
 * Mode A – Single scan analysis.
 * @param {File[]} files - Exactly 4 NIfTI files.
 */
export async function analyzeScan(files) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: form,
  });
  return handleResponse(res);
}

/**
 * Mode B – Comparison analysis.
 * @param {File[]} baselineFiles - 4 baseline NIfTI files.
 * @param {File[]} followupFiles - 4 follow-up NIfTI files.
 */
export async function analyzeComparison(baselineFiles, followupFiles) {
  const form = new FormData();
  baselineFiles.forEach((f) => form.append("baseline_files", f));
  followupFiles.forEach((f) => form.append("followup_files", f));
  const res = await fetch(`${API_BASE}/api/analyze/compare`, {
    method: "POST",
    body: form,
  });
  return handleResponse(res);
}

// ── Patient record CRUD ─────────────────────────────────────────────────────

export async function fetchRecords(skip = 0, limit = 100) {
  try {
    const res = await fetch(`${API_BASE}/api/records?skip=${skip}&limit=${limit}`);
    return handleResponse(res);
  } catch {
    return readLocalRecords().slice(skip, skip + limit).map(cloneLocalRecord);
  }
}

export async function fetchRecordById(id) {
  const res = await fetch(`${API_BASE}/api/records/${id}`);
  return handleResponse(res);
}

export async function saveRecord(data) {
  try {
    const res = await fetch(`${API_BASE}/api/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch {
    const now = new Date().toISOString();
    const records = readLocalRecords();
    const nextId = records.reduce((max, record) => Math.max(max, Number(record.id) || 0), 0) + 1;
    const localRecord = {
      id: nextId,
      patient_name: data.patient_name,
      scan_type: data.scan_type || "mode_a",
      volumes_json: data.volumes_json,
      overlay_path: data.overlay_path || null,
      original_path: data.original_path || null,
      doctor_notes: data.doctor_notes || "",
      age: data.age ?? null,
      created_at: now,
    };
    writeLocalRecords([localRecord, ...records]);
    return localRecord;
  }
}

export async function updateRecord(id, data) {
  try {
    const res = await fetch(`${API_BASE}/api/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  } catch {
    const records = readLocalRecords();
    const nextRecords = records.map((record) => (
      String(record.id) === String(id) ? { ...record, ...data } : record
    ));
    writeLocalRecords(nextRecords);
    return nextRecords.find((record) => String(record.id) === String(id)) || null;
  }
}

export async function deleteRecord(id) {
  try {
    const res = await fetch(`${API_BASE}/api/records/${id}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  } catch {
    const records = readLocalRecords().filter((record) => String(record.id) !== String(id));
    writeLocalRecords(records);
    return null;
  }
}

export async function changePassword(data) {
  const res = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// ── Utility ─────────────────────────────────────────────────────────────────

/** Build full URL for overlay images served from the backend. */
export function overlayUrl(path) {
  if (!path) return null;
  return `${API_BASE}${path}`;
}
