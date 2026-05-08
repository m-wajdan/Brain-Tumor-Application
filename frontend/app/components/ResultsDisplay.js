"use client";

import { useState, useEffect } from "react";
import { overlayUrl } from "../lib/api";

/*
 * ── Volume bar component ────────────────────────────────────────────────────
 */
function VolumeBar({ label, value, color, maxValue }) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs font-mono text-muted">{value.toFixed(2)} cm³</span>
      </div>
      <div className="h-2 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/*
 * ── Mode A Results Display ──────────────────────────────────────────────────
 */
export default function ResultsDisplay({ result, onSave, saving, mode = "a" }) {
  if (!result) return null;

  const { volumes, overlay_url, original_url, slice_index } = result;
  const maxVol = Math.max(
    volumes.wt_volume_cm3,
    volumes.tc_volume_cm3,
    volumes.et_volume_cm3,
    0.01
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Segmentation Results
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Axial slice #{slice_index} &middot; Voxel:{" "}
            {volumes.voxel_dims_mm?.map((d) => d.toFixed(1)).join(" × ")} mm
          </p>
        </div>
        <div className="flex items-center gap-3">

          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
                       bg-success/15 text-success border border-success/25
                       hover:bg-success/25 hover:border-success/40
                       disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-success/30 border-t-success rounded-full animate-spin" />
            ) : (
              <SaveIcon className="w-3.5 h-3.5" />
            )}
            Save Record
          </button>
        </div>
      </div>

      {/* ── Content layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* Images section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original image */}
          <div className="rounded-xl border border-border overflow-hidden bg-surface/50 flex flex-col shadow-sm">
            <div className="px-4 py-3 border-b border-border bg-surface text-center">
              <p className="text-sm font-medium text-muted">Original MRI (FLAIR)</p>
            </div>
            <div className="p-4 flex-1 flex items-center justify-center">
              {original_url ? (
                <img
                  src={overlayUrl(original_url)}
                  alt="Original MRI slice"
                  className="w-full max-w-lg aspect-square object-contain rounded-lg shadow-inner bg-black/20"
                />
              ) : (
                <div className="w-full max-w-lg aspect-square bg-surface rounded-lg flex items-center justify-center">
                  <p className="text-sm text-muted">No original available</p>
                </div>
              )}
            </div>
          </div>

          {/* Overlay image */}
          <div className="rounded-xl border border-border overflow-hidden bg-surface/50 flex flex-col shadow-sm">
            <div className="px-4 py-3 border-b border-border bg-surface text-center">
              <p className="text-sm font-medium text-muted">Segmentation Overlay</p>
            </div>
            <div className="p-4 flex-1 flex items-center justify-center">
              {overlay_url ? (
                <img
                  src={overlayUrl(overlay_url)}
                  alt="Tumor segmentation overlay"
                  className="w-full max-w-lg aspect-square object-contain rounded-lg shadow-inner bg-black/20"
                />
              ) : (
                <div className="w-full max-w-lg aspect-square bg-surface rounded-lg flex items-center justify-center">
                  <p className="text-sm text-muted">No overlay available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Volume metrics section */}
        <div className="rounded-xl border border-border bg-surface/50 p-6 space-y-6 shadow-sm">
          <p className="text-sm font-semibold text-muted uppercase tracking-wider text-center">
            Volumetric Analysis
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <VolumeBar
                label="Whole Tumor (WT)"
                value={volumes.wt_volume_cm3}
                color="#ef4444"
                maxValue={maxVol}
              />
            </div>
            <div className="space-y-4">
              <VolumeBar
                label="Tumor Core (TC)"
                value={volumes.tc_volume_cm3}
                color="#6366f1"
                maxValue={maxVol}
              />
            </div>
            <div className="space-y-4">
              <VolumeBar
                label="Enhancing Tumor (ET)"
                value={volumes.et_volume_cm3}
                color="#22c55e"
                maxValue={maxVol}
              />
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            {[
              { label: "WT", val: volumes.wt_volume_cm3, color: "#ef4444" },
              { label: "TC", val: volumes.tc_volume_cm3, color: "#6366f1" },
              { label: "ET", val: volumes.et_volume_cm3, color: "#22c55e" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center rounded-lg bg-background/50 py-4 px-2 border border-border/50 min-w-0"
              >
                <p
                  className="text-xl lg:text-2xl font-bold font-mono truncate w-full text-center"
                  style={{ color: item.color }}
                  title={item.val.toFixed(2)}
                >
                  {item.val.toFixed(2)}
                </p>
                <p className="text-xs text-muted mt-1 whitespace-nowrap">
                  {item.label} cm³
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
