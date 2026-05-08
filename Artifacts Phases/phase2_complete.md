# Phase 2 Complete: Next.js Frontend Framework

## What Was Built

### Frontend Structure
```
frontend/
├── app/
│   ├── globals.css              # Design system (dark theme, glassmorphism, animations)
│   ├── layout.js                # Root layout with Geist fonts + SEO metadata
│   ├── page.js                  # Main app: sidebar routing + state management
│   ├── lib/
│   │   └── api.js               # Centralised API client (→ localhost:8000)
│   └── components/
│       ├── Sidebar.js           # Collapsible navigation sidebar
│       ├── ModeToggle.js        # Mode A/B toggle switch
│       ├── FileUploader.js      # Drag-and-drop 4-file NIfTI uploader
│       ├── ResultsDisplay.js    # Overlay image + volume bars + save button
│       └── PatientHistory.js    # Data table with inline edit, delete, view
├── package.json
├── next.config.mjs
└── postcss.config.mjs
```

### Key Components

#### 1. Sidebar (`Sidebar.js`)
- Persistent left sidebar with NOTES branding
- Active state indicator (indigo left bar + subtle bg)
- Collapsible with animated chevron toggle
- Inline SVG icons (no extra dependencies)

#### 2. File Uploader (`FileUploader.js`)
| Feature | Implementation |
|---------|---------------|
| Drag & drop | `onDragOver`/`onDrop` with visual feedback |
| Modality detection | Filename keyword matching (t1ce → t1 priority) |
| File validation | `.nii` and `.nii.gz` only |
| **4-file enforcement** | Run Inference button disabled until all 4 slots filled |
| Individual removal | X button per modality slot |
| Error display | Inline red error messages for invalid files |

#### 3. Patient History (`PatientHistory.js`)
- Skeleton loading animation during fetch
- Inline rename (click edit icon → type → Enter/Escape)
- Two-click delete (first click shows "Confirm?")
- Mode A/B badges with colour coding
- Volume summary in monospace font
- "View" button hydrates results into the assessment page

### Design System
- **Dark medical-grade aesthetic**: `#0b0f1a` background, `#111827` surfaces
- **Indigo accent**: `#6366f1` with subtle glow animations
- **Colour-coded modalities**: FLAIR (amber), T1ce (green), T1w (indigo), T2w (pink)
- **Glassmorphism**: Blurred backdrop panels with `border-border`
- **Micro-animations**: Pulse glow on ready state, shimmer skeleton, spin loader

### Integration Verified

````carousel
![New Assessment page with sidebar, Mode A/B toggle, and 4-slot file uploader](file:///C:/Users/HP/.gemini/antigravity/brain/ed37fbe5-3db1-407d-9106-a63198b78ea3/new_assessment_page_1777993186153.png)
<!-- slide -->
![Patient History page showing "No records yet" — successfully connected to backend API](file:///C:/Users/HP/.gemini/antigravity/brain/ed37fbe5-3db1-407d-9106-a63198b78ea3/patient_history_page_1777993334886.png)
````

> [!TIP]
> **How to run both servers:**
> ```bash
> # Terminal 1: Backend
> cd backend
> python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
> 
> # Terminal 2: Frontend
> cd frontend
> node ./node_modules/next/dist/bin/next dev --port 3000
> ```
> Note: Use `node ./node_modules/next/dist/bin/next dev` instead of `npm run dev` due to the `&` in the project path.

---

## Next Up: Phase 3
- Groq API integration for patient report generation (`/api/generate-report`)
- 60/40 Patient View split layout (Report + Chat)
- Session-only chat interface (resets on unmount)
