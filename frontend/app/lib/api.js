/**
 * API client for communicating with the FastAPI backend.
 * All requests are routed to http://127.0.0.1:8000.
 */

const API_BASE = "http://127.0.0.1:8000";

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
  const res = await fetch(
    `${API_BASE}/api/records?skip=${skip}&limit=${limit}`
  );
  return handleResponse(res);
}

export async function fetchRecordById(id) {
  const res = await fetch(`${API_BASE}/api/records/${id}`);
  return handleResponse(res);
}

export async function saveRecord(data) {
  const res = await fetch(`${API_BASE}/api/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateRecord(id, data) {
  const res = await fetch(`${API_BASE}/api/records/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteRecord(id) {
  const res = await fetch(`${API_BASE}/api/records/${id}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

// ── Utility ─────────────────────────────────────────────────────────────────

/** Build full URL for overlay images served from the backend. */
export function overlayUrl(path) {
  if (!path) return null;
  return `${API_BASE}${path}`;
}
