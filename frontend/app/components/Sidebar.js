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

function DashboardIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.1V22a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.1a1.65 1.65 0 0 0-.4-1.1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.1-.4H2a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.1a1.65 1.65 0 0 0 1.1-.4 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6c.26-.15.62-.4 1-.6.34-.2.69-.4 1.1-.4H13a2 2 0 0 1 2 2v.1c0 .41.14.8.4 1.1.18.21.55.45 1 .6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.15.26.4.62.6 1 .2.34.4.69.4 1.1V13a2 2 0 0 1-2 2h-.1c-.41 0-.8.14-1.1.4-.21.18-.45.55-.6 1Z" />
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
    id: "dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    description: "Workspace overview",
  },
  {
    id: "assessment",
    label: "New Diagnosis",
    icon: ScanIcon,
    description: "Run MRI analysis",
  },
  {
    id: "history",
    label: "History",
    icon: HistoryIcon,
    description: "View saved records",
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    description: "Profile and preferences",
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
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#1a9d9f]/15 flex items-center justify-center">
          <BrainIcon className="w-5 h-5 text-[#1a9d9f]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-semibold text-foreground tracking-tight">
              NeuroScan
            </h1>
            <p className="text-[10px] text-muted leading-tight truncate">
              Workspace
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
                      ? "bg-[#1a9d9f]/10 text-[#1a9d9f] shadow-sm"
                      : "text-muted hover:text-foreground hover:bg-sidebar-hover"
                }
              `}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#1a9d9f]" />
              )}

              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                  isActive ? "text-[#1a9d9f]" : "text-gray-600 group-hover:text-gray-900"
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
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface border border-border mb-2">
            <div className="w-8 h-8 rounded-full bg-[#1a9d9f]/20 flex items-center justify-center text-[#1a9d9f] font-bold text-xs uppercase">
              {user.email[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-foreground truncate">{user.email.split('@')[0]}</p>
              <p className="text-[9px] text-muted uppercase tracking-tighter font-bold">{user.role}</p>
            </div>
            <button 
              onClick={onLogout}
              className="ml-auto p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
          {!collapsed && <span>Collapse</span>}
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
