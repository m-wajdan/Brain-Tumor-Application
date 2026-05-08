# Master Execution Plan: NOTES (Neuro-Oncology Tracking & Education System)

## 1. Project Overview
NOTES is a dual-facing clinical web application designed to solve two real-world medical challenges in brain tumor management:
1. **Clinical Bottleneck:** Automating the tedious process of 3D tumor segmentation and volumetric measurement, saving historical patient records and doctor notes.
2. **Patient Experience:** Translating complex radiological data into plain-language summaries using Groq's fast LLM inference, presented in a split-screen educational interface.

The system features a dynamic, two-way architecture:

* **Mode A (Initial Assessment):** Evaluates a single MRI to establish a volumetric baseline.
* **Mode B (Treatment Monitoring):** Compares a baseline scan against a follow-up scan to calculate disease progression.

## 2. Technical Stack & Architecture
* **Frontend:** React / Next.js (Tailwind CSS for styling).
* **Backend:** FastAPI (Python) for handling heavy PyTorch inference and API routing.
* **Database:** SQLite or PostgreSQL (via SQLAlchemy) to store historical patient records, volumetric data, and doctor notes.
* **Medical Data Processing:** `nibabel` (NIfTI processing), `numpy`, `scipy`.
* **Visualization:** Backend generates segmentation masks and sends them to the frontend (via Base64 or static file serving) for overlay rendering.
* **LLM Integration:** Groq API (llama3 or mixtral models) for lightning-fast patient report generation and Q&A.

---

## 3. Core Engine: Rules & Logic (CRITICAL FOR AGENT)

### 3.1 NIfTI Pre-processing & Inference
* The model expects 4 co-registered NIfTI modalities: FLAIR, T1w, T1ce, T2w.
* Inputs must be stacked into a numpy array of shape `(4, Depth, Height, Width)`.
* Each modality must be individually Z-score normalized `(image - mean) / std`.

### 3.2 The Hierarchical Inference Logic
The AI agent MUST implement this strict biological hierarchy on the sigmoid output tensor `pred_sigmoid` `[3, D, H, W]`.
* **Whole Tumor (WT):** `pred_wt = pred_sigmoid[0] > 0.50`
* **Tumor Core (TC):** `pred_tc = (pred_sigmoid[1] > 0.60) & pred_wt`
* **Enhancing Tumor (ET):** `pred_et = (pred_sigmoid[2] > 0.65) & pred_tc`

### 3.3 Volumetric Calculation
* Read voxel dimensions: `dx, dy, dz = nib_image.header.get_zooms()[:3]`
* Voxel volume $mm^3$: `dx * dy * dz`
* Volumes in $cm^3$: `(pixel_count * voxel_vol_mm3) / 1000`

---

## 4. UI/UX & Database Feature Specification

### 4.1 Database & Doctor's Patient History (Clinical POV)
* **Data Persistence:** The system must save inference results.
* **Patient Records:** Doctors can save a scan result and rename the record to the Patient's Name (e.g., "John Doe - Baseline").
* **Doctor Notes:** A dedicated, editable text area attached to the patient record where the doctor can save private clinical observations for later reference. 

### 4.2 Mode A & B (Clinical Dashboard)
* **Mode A:** File uploader for 4 `.nii.gz` files. Returns axial slice image with Red/Blue/Green mask overlay and a table of calculated $cm^3$ volumes.
* **Mode B:** Two file uploaders (Baseline + Follow-up). Returns side-by-side visual comparison and Volume Delta % metrics.

### 4.3 The Patient POV Layout (Strict 60/40 Split)
When the UI is toggled to "Patient View", the screen must follow a strict split layout:
* **Left Pane (60% width): The Report.** 
  * Displays the generated plain-text LLM summary explaining the tumor volumes/changes empathetically.
  * Optionally displays the 2D tumor slice image.
* **Right Pane (40% width): The Groq Chat Interface.**
  * A chat window seeded with the system prompt and patient data.
  * **Constraint:** This chat is session-only. It is for immediate patient education and is NOT saved to the database.

---

## 5. Development Roadmap (Agent Instructions)

### Phase 1: Backend Setup & Database Schema
**Agent Task:** Build the FastAPI foundation.
* Create the SQLAlchemy models: `PatientRecord` (id, patient_name, scan_type, volumes_json, doctor_notes, created_at).
* Create the PyTorch inference class `BrainTumorAnalyzer` configured for CPU (`map_location='cpu'`).
* Create the FastAPI endpoint `/api/analyze` that accepts 4 files, runs inference, and returns the volumes + image path.

### Phase 2: Next.js Frontend Framework
**Agent Task:** Scaffold the Next.js app.
* Build the clinical routing: Sidebar navigation between "New Assessment" and "Patient History".
* Build the multi-file uploader component ensuring it only accepts exactly 4 files.
* Build the Patient History data table fetching from the FastAPI database endpoints.

### Phase 3: The 60/40 Patient View & Groq LLM
**Agent Task:** Implement the Groq API and Patient UI.
* Set up a FastAPI endpoint `/api/generate-report` that uses the Groq SDK to draft the initial report based on volumes.
* Build the Next.js Patient View screen enforcing the 60% Report / 40% Chat split.
* Implement the chat interface state management (React `useState` or similar) ensuring it resets on component unmount (session-only).