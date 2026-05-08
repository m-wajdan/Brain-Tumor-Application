"""
BrainTumorAnalyzer – PyTorch inference engine.

Implements the strict medical logic from executionPlan.md §3:
  - NIfTI loading & Z-score normalisation (§3.1)
  - Hierarchical segmentation thresholds (§3.2)
  - Volumetric calculation in cm³ (§3.3)

Configured for CPU inference (map_location='cpu') as specified in Phase 1.
"""

import io
import logging
import uuid
from collections import OrderedDict
from pathlib import Path
from typing import Optional

import nibabel as nib
import numpy as np
import torch
import matplotlib

matplotlib.use("Agg")  # Non-interactive backend for server
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from PIL import Image

from app.config import (
    MODEL_PATH,
    STATIC_DIR,
    PATCH_D,
    PATCH_H,
    PATCH_W,
    THRESHOLD_WT,
    THRESHOLD_TC,
    THRESHOLD_ET,
)
from app.model_arch import HybridDANet

logger = logging.getLogger("notes.inference")


# ── Preprocessing helpers ────────────────────────────────────────────────────

def zscore_normalize(volume: np.ndarray) -> np.ndarray:
    """
    Z-score normalise a single modality volume.
    Statistics are computed ONLY over non-zero (brain) voxels to avoid
    the skull-stripped background distorting the mean/std.

    Args:
        volume: np.ndarray of shape (H, W, D)
    Returns:
        normalised volume (same shape, float32); background stays 0.
    """
    brain_mask = volume > 0
    if brain_mask.sum() == 0:
        return volume.astype(np.float32)
    mean = volume[brain_mask].mean()
    std = volume[brain_mask].std()
    if std < 1e-8:
        std = 1e-8
    norm = np.zeros_like(volume, dtype=np.float32)
    norm[brain_mask] = (volume[brain_mask] - mean) / std
    return norm


# ── Overlay Visualisation ────────────────────────────────────────────────────

def create_overlay_image(
    flair_slice: np.ndarray,
    pred_mask_slice: np.ndarray,
    save_path: Path,
) -> None:
    """
    Generate the clinical overlay PNG: FLAIR grayscale + colour masks.
    Uses the disjoint rendering approach from the notebook:
      Red   = Edema (WT minus TC)
      Blue  = Necrotic Core (TC minus ET)
      Green = Enhancing Tumor (ET)

    Args:
        flair_slice : 2D array (H, W), the FLAIR modality slice
        pred_mask_slice : 3D array (3, H, W), binary masks [WT, TC, ET]
        save_path : Where to save the PNG
    """
    fig, ax = plt.subplots(1, 1, figsize=(6, 6), dpi=120)

    ax.imshow(flair_slice, cmap="gray", origin="lower")

    overlay = np.zeros((*flair_slice.shape, 4), dtype=np.float32)

    wt = pred_mask_slice[0].astype(bool)
    tc = pred_mask_slice[1].astype(bool)
    et = pred_mask_slice[2].astype(bool)

    edema_only = wt & ~tc
    core_only = tc & ~et
    enhancing = et

    if edema_only.any():
        overlay[edema_only] = [1, 0, 0, 0.4]     # Red
    if core_only.any():
        overlay[core_only] = [0, 0, 1, 0.5]      # Blue
    if enhancing.any():
        overlay[enhancing] = [0, 1, 0, 0.6]       # Green

    ax.imshow(overlay, origin="lower")
    ax.axis("off")

    patches = [
        mpatches.Patch(color="red", alpha=0.6, label="Edema (WT − TC)"),
        mpatches.Patch(color="blue", alpha=0.6, label="Necrotic Core (TC − ET)"),
        mpatches.Patch(color="green", alpha=0.6, label="Enhancing Tumor (ET)"),
    ]
    ax.legend(
        handles=patches,
        loc="lower center",
        ncol=3,
        fontsize=7,
        bbox_to_anchor=(0.5, -0.05),
        framealpha=0.8,
    )

    plt.tight_layout()
    fig.savefig(save_path, bbox_inches="tight", pad_inches=0.1, transparent=False)
    plt.close(fig)


def create_original_image(
    flair_slice: np.ndarray,
    save_path: Path,
) -> None:
    """Save the original grayscale slice without overlay."""
    fig, ax = plt.subplots(1, 1, figsize=(6, 6), dpi=120)
    ax.imshow(flair_slice, cmap="gray", origin="lower")
    ax.axis("off")
    plt.tight_layout()
    fig.savefig(save_path, bbox_inches="tight", pad_inches=0.1, transparent=False)
    plt.close(fig)


# ── Main Inference Class ─────────────────────────────────────────────────────

class BrainTumorAnalyzer:
    """
    Encapsulates the HybridDANet model and exposes methods for:
      - Loading 4 NIfTI modalities
      - Running 3D inference on a centre crop
      - Applying the biological hierarchy thresholds
      - Computing volumetric measurements
      - Generating overlay images
    """

    def __init__(self, model_path: Path = MODEL_PATH, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = HybridDANet(in_ch=4, out_ch=3)
        self._load_weights(model_path)
        self.model.eval()
        logger.info(
            "BrainTumorAnalyzer ready on %s (model: %s)",
            self.device, model_path.name,
        )

    def _load_weights(self, checkpoint_path: Path) -> None:
        """Load checkpoint with DataParallel prefix handling."""
        logger.info("Loading weights from %s ...", checkpoint_path)
        checkpoint = torch.load(
            checkpoint_path, map_location=self.device, weights_only=False
        )

        state_dict = (
            checkpoint["model_state_dict"]
            if "model_state_dict" in checkpoint
            else checkpoint
        )

        # Strip 'module.' prefix if model was saved with nn.DataParallel
        clean_state = OrderedDict()
        for k, v in state_dict.items():
            name = k[7:] if k.startswith("module.") else k
            clean_state[name] = v

        self.model.load_state_dict(clean_state)
        self.model.to(self.device)
        logger.info("Weights loaded successfully")

    # ── NIfTI Loading ────────────────────────────────────────────────────

    def load_nifti_modalities(
        self, file_paths: dict[str, Path]
    ) -> tuple[np.ndarray, tuple[float, float, float]]:
        """
        Load and normalise 4 NIfTI modalities.

        Args:
            file_paths: dict mapping modality name → file path
                        Expected keys: flair, t1, t1ce, t2

        Returns:
            stacked : np.ndarray of shape (4, H, W, D) – normalised
            voxel_dims : (dx, dy, dz) from the FLAIR header
        """
        images = []
        voxel_dims = None

        for mod in ["flair", "t1", "t1ce", "t2"]:
            path = file_paths[mod]
            nii = nib.load(str(path))

            if mod == "flair":
                voxel_dims = tuple(float(d) for d in nii.header.get_zooms()[:3])

            vol = nii.get_fdata(dtype=np.float32)
            images.append(zscore_normalize(vol))

        stacked = np.stack(images, axis=0)  # (4, H, W, D)
        return stacked, voxel_dims

    # ── Inference ────────────────────────────────────────────────────────

    def run_inference(
        self, img_array: np.ndarray
    ) -> tuple[np.ndarray, tuple[int, int, int]]:
        """
        Run HybridDANet inference on a centre crop.

        Args:
            img_array: (4, H, W, D) normalised volume

        Returns:
            pred_binary : (3, pH, pW, pD) boolean masks [WT, TC, ET]
            crop_origin : (h0, w0, d0) for reference
        """
        _, H, W, D = img_array.shape
        pH, pW, pD = PATCH_H, PATCH_W, PATCH_D
        h0 = (H - pH) // 2
        w0 = (W - pW) // 2
        d0 = (D - pD) // 2

        img_crop = img_array[:, h0 : h0 + pH, w0 : w0 + pW, d0 : d0 + pD]
        img_tensor = (
            torch.from_numpy(img_crop).unsqueeze(0).float().to(self.device)
        )

        with torch.no_grad():
            pred = self.model(img_tensor)
            pred_sigmoid = torch.sigmoid(pred).cpu().numpy()[0]  # (3, D, H, W)

        # Apply strict biological hierarchy (executionPlan §3.2)
        pred_wt = pred_sigmoid[0] > THRESHOLD_WT
        pred_tc = (pred_sigmoid[1] > THRESHOLD_TC) & pred_wt
        pred_et = (pred_sigmoid[2] > THRESHOLD_ET) & pred_tc

        pred_binary = np.stack([pred_wt, pred_tc, pred_et], axis=0)

        return pred_binary, (h0, w0, d0)

    # ── Volumetric Calculation ───────────────────────────────────────────

    @staticmethod
    def compute_volumes(
        pred_binary: np.ndarray,
        voxel_dims: tuple[float, float, float],
    ) -> dict[str, float]:
        """
        Compute volumes in cm³ (executionPlan §3.3).

        voxel_vol_mm³ = dx * dy * dz
        volume_cm³ = (pixel_count × voxel_vol_mm³) / 1000
        """
        dx, dy, dz = voxel_dims
        voxel_vol = dx * dy * dz  # mm³

        wt_count = int(pred_binary[0].sum())
        tc_count = int(pred_binary[1].sum())
        et_count = int(pred_binary[2].sum())

        return {
            "wt_volume_cm3": round((wt_count * voxel_vol) / 1000, 4),
            "tc_volume_cm3": round((tc_count * voxel_vol) / 1000, 4),
            "et_volume_cm3": round((et_count * voxel_vol) / 1000, 4),
        }

    # ── Full Pipeline ────────────────────────────────────────────────────

    def analyze(
        self, file_paths: dict[str, Path]
    ) -> dict:
        """
        Full Mode A analysis pipeline.

        1. Load & normalise NIfTI files
        2. Run inference
        3. Calculate volumes
        4. Generate overlay image
        5. Return results dict

        Args:
            file_paths: dict {modality_name → file_path}

        Returns:
            dict with keys: volumes, overlay_url, slice_index, voxel_dims
        """
        # 1. Load
        img_array, voxel_dims = self.load_nifti_modalities(file_paths)

        # 2. Infer
        pred_binary, (h0, w0, d0) = self.run_inference(img_array)

        # 3. Volumes
        volumes = self.compute_volumes(pred_binary, voxel_dims)
        volumes["voxel_dims_mm"] = list(voxel_dims)

        # 4. Find best slice (most tumour voxels in WT)
        wt_mask = pred_binary[0]
        z_counts = wt_mask.sum(axis=(0, 1))  # sum over H, W for each D slice
        if z_counts.max() > 0:
            best_slice = int(np.argmax(z_counts))
        else:
            best_slice = PATCH_D // 2

        # Get the FLAIR crop for the overlay
        flair_crop = img_array[0, h0 : h0 + PATCH_H, w0 : w0 + PATCH_W, d0 : d0 + PATCH_D]
        flair_slice = flair_crop[:, :, best_slice].T
        pred_mask_slice = pred_binary[:, :, :, best_slice]
        # Transpose to match the display convention
        pred_mask_slice_t = np.stack(
            [pred_mask_slice[i].T for i in range(3)], axis=0
        )

        # Generate and save overlay
        overlay_id = uuid.uuid4().hex[:12]
        overlay_filename = f"overlay_{overlay_id}.png"
        overlay_path = STATIC_DIR / overlay_filename
        create_overlay_image(flair_slice, pred_mask_slice_t, overlay_path)

        # Generate and save original
        original_filename = f"original_{overlay_id}.png"
        original_path = STATIC_DIR / original_filename
        create_original_image(flair_slice, original_path)

        return {
            "volumes": volumes,
            "overlay_filename": overlay_filename,
            "overlay_url": f"/static/overlays/{overlay_filename}",
            "original_url": f"/static/overlays/{original_filename}",
            "slice_index": best_slice,
        }

    def analyze_comparison(
        self,
        baseline_paths: dict[str, Path],
        followup_paths: dict[str, Path],
    ) -> dict:
        """
        Full Mode B analysis pipeline (Treatment Monitoring).

        Runs analysis on both baseline and follow-up scans,
        then calculates volume deltas.
        """
        baseline_result = self.analyze(baseline_paths)
        followup_result = self.analyze(followup_paths)

        bv = baseline_result["volumes"]
        fv = followup_result["volumes"]

        def delta_pct(base_val, follow_val):
            if base_val < 1e-6:
                return 0.0 if follow_val < 1e-6 else 100.0
            return round(((follow_val - base_val) / base_val) * 100, 2)

        return {
            "baseline": baseline_result,
            "followup": followup_result,
            "delta_wt_pct": delta_pct(bv["wt_volume_cm3"], fv["wt_volume_cm3"]),
            "delta_tc_pct": delta_pct(bv["tc_volume_cm3"], fv["tc_volume_cm3"]),
            "delta_et_pct": delta_pct(bv["et_volume_cm3"], fv["et_volume_cm3"]),
        }
