import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Sun,
  Moon,
  Bell,
  X,
  Users,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
} from "lucide-react";
import { useTheme, useThemeTokens } from "../lib/ThemeContext";
import { useAuth, canAccess } from "../lib/AuthContext";
import { useSettings } from "../lib/SettingsContext";

// The phone's persistent header: who you are and where you are, plus the
// three controls that belong to the whole app rather than to a page. The
// per-page Topbar keeps the page title and its own actions and drops these,
// so they aren't rendered twice.
const DRAWER_ITEMS = [
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/activity", label: "Activity Logs", icon: ClipboardList },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function MobileAppBar() {
  const t = useThemeTokens();
  const { dark, toggleDark } = useTheme();
  const { settings } = useSettings();
  const { user } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();

  const items = DRAWER_ITEMS.filter((i) => canAccess(user?.role, i.to));
  const initial = (user?.name || "?").charAt(0).toUpperCase();

  function go(to) {
    setDrawer(false);
    navigate(to);
  }

  return (
    <>
      <header
        className={`md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b ${t.divider} ${
          dark ? "bg-[#1f232b]" : "bg-white"
        }`}
      >
        <button onClick={() => setDrawer(true)} aria-label="Menu" className={t.textPrimary}>
          <Menu className="w-6 h-6" />
        </button>

        <div className="min-w-0 flex-1">
          <div className={`text-[15px] font-bold leading-tight truncate ${t.textPrimary}`}>
            {settings.shopName}
          </div>
          <div className={`text-[11px] leading-tight truncate ${t.textMuted}`}>
            {settings.tagline || "Repair · Sales · Accessories"}
          </div>
        </div>

        <button onClick={toggleDark} aria-label="Toggle theme" className={t.textSecondary}>
          {dark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setDrawer(true)}
          aria-label="Notifications"
          className={`relative ${t.textSecondary}`}
        >
          <Bell className="w-5 h-5" />
        </button>

        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            dark ? "bg-white text-black" : "bg-slate-900 text-white"
          }`}
        >
          {initial}
        </div>
      </header>

      {drawer && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawer(false)}
          />
          <div className={`relative w-72 max-w-[85%] h-full p-4 flex flex-col ${dark ? "bg-[#1f232b]" : "bg-white"}`}>
            <div className="flex items-start justify-between mb-5">
              <div className="min-w-0">
                <div className={`text-base font-bold truncate ${t.textPrimary}`}>{user?.name}</div>
                <div className={`text-xs capitalize ${t.textMuted}`}>{user?.role}</div>
              </div>
              <button onClick={() => setDrawer(false)} aria-label="Close" className={t.textMuted}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-0.5 flex-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.to}
                    onClick={() => go(item.to)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-left ${t.textPrimary}`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

          </div>
        </div>
      )}
    </>
  );
}
