import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  ShoppingCart,
  Wrench,
  Box,
  Users,
  BarChart3,
  ClipboardList,
  Settings,
  Monitor,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { useAuth, canAccess } from "../lib/AuthContext";
import { useSettings } from "../lib/SettingsContext";

const NAV_ITEMS_BASE = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/sales", label: "Sales (POS)", icon: ShoppingCart },
  { to: "/repairs", label: null, icon: Wrench }, // label filled from settings.labels.navRepairs
  { to: "/inventory", label: "Inventory", icon: Box },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/activity", label: "Activity Logs", icon: ClipboardList },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const t = useThemeTokens();
  const { settings } = useSettings();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("techdesk_sidebar_collapsed") === "1");

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem("techdesk_sidebar_collapsed", !c ? "1" : "0");
      return !c;
    });
  }

  const visibleItems = NAV_ITEMS_BASE.filter((item) => canAccess(user?.role, item.to)).map((item) =>
    item.to === "/repairs" ? { ...item, label: settings.labels?.navRepairs || "Repairs" } : item
  );

  // No quit button in a browser: window.close() does nothing to a tab the
  // user opened themselves, so the control would be decoration.

  return (
    <aside
      className={`shrink-0 hidden md:flex flex-col justify-between p-3 h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? "w-[72px]" : "w-60"
      } ${t.sidebarBg}`}
    >
      <div>
        <div className="flex items-center justify-between px-1 pt-2 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Monitor className={`w-5 h-5 shrink-0 ${t.dark ? "text-white" : "text-blue-500"}`} />
            {!collapsed && (
              <span className={`text-base font-bold truncate ${t.textPrimary}`}>{settings.shopName}</span>
            )}
          </div>
        </div>
        {!collapsed && (
          <div className={`px-1 pb-3 text-[11px] tracking-wide font-medium truncate ${t.textMuted}`}>
            {settings.tagline}
          </div>
        )}

        <button
          onClick={toggleCollapsed}
          className={`flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl text-xs font-medium ${t.pillBg} ${
            collapsed ? "justify-center w-full" : ""
          }`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> Collapse</>}
        </button>

        <nav className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    collapsed ? "justify-center" : ""
                  } ${
                    isActive
                      ? t.dark
                        ? "bg-white/20 text-white"
                        : "bg-white/80 text-blue-600 shadow-sm"
                      : t.dark
                      ? "text-slate-300 hover:bg-white/5"
                      : "text-slate-600 hover:bg-white/50"
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                {!collapsed && item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        <div
          className={`flex items-center gap-2 rounded-xl p-2.5 ${collapsed ? "flex-col" : "justify-between"} ${
            t.dark ? "bg-white/5 border border-white/10" : "bg-white/60 border border-white/70"
          }`}
        >
          <div className={`flex items-center gap-3 min-w-0 ${collapsed ? "flex-col" : ""}`}>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                t.dark ? "bg-white text-black" : "bg-blue-100 text-blue-600"
              }`}
            >
              {user?.name?.[0] || "A"}
            </div>
            {!collapsed && (
              <div className="text-left min-w-0">
                <div className={`text-sm font-semibold truncate ${t.textPrimary}`}>{user?.name}</div>
                <div className={`text-xs ${t.textSecondary}`}>This browser</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
