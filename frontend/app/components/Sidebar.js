"use client";

import { useState } from "react";

/*
 * ── Icon components (inline SVGs to avoid extra deps) ───────────────────────
 */
function BrainIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Z" />
      <path d="M10 21v-1M14 21v-1" />
      <path d="M9 10h.01M15 10h.01" />
      <path d="M12 2v5" />
      <path d="M8 6l1.5 2M16 6l-1.5 2" />
    </svg>
  );
}

function ScanIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 7v1M12 16v1M7 12h1M16 12h1" />
    </svg>
  );
}

function HistoryIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function ReportIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function ChevronIcon({ className, collapsed }) {
  return (
    <svg
      className={`${className} transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/*
 * ── Navigation items ────────────────────────────────────────────────────────
 */
const NAV_ITEMS = [
  {
    id: "assessment",
    label: "New Assessment",
    icon: ScanIcon,
    description: "Run MRI analysis",
  },
  {
    id: "patient_report",
    label: "Report & Chat",
    icon: ReportIcon,
    description: "AI analysis and Q&A",
  },
  {
    id: "history",
    label: "Patient History",
    icon: HistoryIcon,
    description: "View saved records",
  },
];

/*
 * ── Sidebar component ──────────────────────────────────────────────────────
 */
export default function Sidebar({ activePage, onNavigate, user, onLogout, collapsed, onToggleCollapse }) {

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full z-40
        flex flex-col
        bg-sidebar border-r border-border
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-[72px]" : "w-[260px]"}
      `}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
          <BrainIcon className="w-5 h-5 text-accent" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-semibold gradient-text tracking-tight">
              NOTES
            </h1>
            <p className="text-[10px] text-muted leading-tight truncate">
              Neuro-Oncology Tracking
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 rounded-lg px-3 py-2.5
                text-sm font-medium cursor-pointer
                transition-all duration-200 group relative
                ${
                  isActive
                    ? "bg-sidebar-active text-accent shadow-sm shadow-accent/5"
                    : "text-muted hover:text-foreground hover:bg-sidebar-hover"
                }
              `}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent" />
              )}

              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                  isActive ? "text-accent" : "text-muted group-hover:text-foreground"
                }`}
              />

              {!collapsed && (
                <div className="text-left overflow-hidden">
                  <div className="truncate">{item.label}</div>
                  {isActive && (
                    <div className="text-[10px] text-muted font-normal truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── User Profile & Collapse ─────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-border space-y-2">
        {user && !collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs uppercase">
              {user.email[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-foreground truncate">{user.email.split('@')[0]}</p>
              <p className="text-[9px] text-muted uppercase tracking-tighter font-bold">{user.role}</p>
            </div>
            <button 
              onClick={onLogout}
              className="ml-auto p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        )}

        <button
          onClick={() => onToggleCollapse(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                     text-muted hover:text-foreground hover:bg-sidebar-hover
                     text-xs transition-colors cursor-pointer"
        >
          <ChevronIcon className="w-4 h-4" collapsed={collapsed} />
          {!collapsed && <span>Collapse Sidebar</span>}
        </button>

        {user && collapsed && (
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center py-2 text-muted hover:text-danger transition-colors cursor-pointer"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        )}
      </div>
    </aside>
  );
}
