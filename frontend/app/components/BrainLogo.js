"use client";

import { useState } from "react";

export default function BrainLogo({ className = "w-10 h-10" }) {
  // Try several common public filenames (hyphenated, underscored, svg)
  const candidates = ["/brain.png", "/brain_logo.png", "/brain-logo.svg", "/brain_logo.svg", "/brain_asset.png", "/brain.png"];
  const [idx, setIdx] = useState(0);

  const handleError = () => {
    if (idx < candidates.length - 1) setIdx((i) => i + 1);
    else setIdx(candidates.length); // signal fallback
  };

  if (idx < candidates.length) {
    return (
      <img
        src={candidates[idx]}
        alt="NeuroScan logo"
        className={className}
        onError={handleError}
        style={{ objectFit: "contain" }}
      />
    );
  }

  // Fallback: simple SVG if none of the files are present
  return (
    <svg className={className} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#1a9d9f" />
      <g transform="translate(8,8) scale(0.75)">
        <path d="M16 4c-6 0-10 4-10 10 0 3 1.5 5.5 3.5 7.5C10 24 13 26 16 26c3 0 5-2 6.5-4 1.2-1.6 2.5-4 2-7C24 12 21 4 16 4z" fill="#ffffff" opacity="0.95" />
        <path d="M40 4c6 0 10 4 10 10 0 3-1.5 5.5-3.5 7.5C46 24 43 26 40 26c-3 0-5-2-6.5-4-1.2-1.6-2.5-4-2-7C30 12 33 4 40 4z" fill="#0b5560" />
      </g>
    </svg>
  );
}
