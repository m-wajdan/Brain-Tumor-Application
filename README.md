# Brain Tumor Detection and Segmentation Application

A comprehensive full-stack application for detecting and segmenting brain tumors from MRI scans. The application provides a seamless user interface for medical professionals or researchers to upload patient scans (e.g., NIfTI format), view medical images, and obtain AI-driven analysis using a custom-trained PyTorch model.

## 🚀 Features

- **Medical Image Upload & Processing:** Upload MRI scans directly through a modern web interface.
- **AI-Powered Diagnostics:** Backend inference engine powered by a deployed PyTorch model (`model75.pth`).
- **Interactive Visualization:** View and interact with uploaded MRI scans and their segmented overlays.
- **Patient History:** Track and maintain patient records and previous diagnostic results.
- **Modern Tech Stack:** 
  - **Frontend:** Next.js, React, Tailwind CSS
  - **Backend:** FastAPI, PyTorch, SQLAlchemy

## 📊 Dataset

This project utilizes the **BraTS 2020** dataset for training and validation of the segmentation model. 
You can find the dataset on Kaggle here:
🔗 [BraTS20 Dataset - Training & Validation](https://www.kaggle.com/datasets/awsaf49/brats20-dataset-training-validation)

## 🏗️ Project Structure

```
Brain-Tumor-Application/
├── backend/                # FastAPI backend server
│   ├── app/                # API routes, database schemas, and AI inference logic
│   ├── uploads/            # Temporary storage for uploaded scans
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js frontend web application
│   ├── app/                # Next.js pages and routing
│   ├── components/         # React components (FileUploader, PatientView, etc.)
│   └── package.json        # Node.js dependencies
├── model/                  # Trained PyTorch model weights (e.g., model75.pth)
├── training notebook/      # Jupyter notebooks used for model training and evaluation
└── validationDataset/      # Validation data samples
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v18+)
- Python (3.8+)
- PyTorch

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The backend will be available at `http://localhost:8000`*

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at `http://localhost:3000`*

## 🧠 Model Training

The model was built and trained using the BraTS 2020 dataset. Data preprocessing, model architecture design, and training loops are documented in the `training notebook/cv-project.ipynb` file.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).