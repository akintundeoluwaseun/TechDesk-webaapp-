import React, { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  Sun,
  Moon,
  Bell,
  X,
  Search,
  LayoutGrid,
  ShoppingCart,
  Wrench,
  Box,
  Users,
  BarChart3,
  ClipboardList,
  Settings,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { useTheme, useThemeTokens } from "../lib/ThemeContext";
import { useAuth, canAccess } from "../lib/AuthContext";
import { useSettings } from "../lib/SettingsContext";
import { useHelp } from "../lib/HelpContext";
import { searchEverything } from "../lib/searchAll";
import { notificationFeed, notifStyle, timeAgo, isUnread, unreadCount } from "../lib/notifications";
import { db } from "../lib/db";

// The phone's persistent header, and behind its menu button the whole app.
//
// The drawer used to list four pages -- the four the bottom bar already
// shows were left out of it, and search, notifications and help were only
// ever in the desktop topbar, which hides itself on a phone. So the menu
// was half an app. It now carries every destination the sidebar has, plus
// the three app-wide controls, because on a phone this IS the menu.
const MENU_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/sales", label: "Sales (POS)", icon: ShoppingCart },
  { to: "/repairs", label: "Repairs", icon: Wrench },
  { to: "/inventory", label: "Inventory", icon: Box },
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
  const { openHelp } = useHelp();
  const [drawer, setDrawer] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clearedAt, setClearedAt] = useState(() => db.getNotifClearedAt());
  const navigate = useNavigate();

  const items = MENU_ITEMS.filter((i) => canAccess(user?.role, i.to)).map((i) =>
    i.to === "/repairs" ? { ...i, label: settings.labels?.navRepairs || "Repairs" } : i
  );
  const initial = (user?.name || "?").charAt(0).toUpperCase();

  // Recomputed when the panel opens or is cleared, which is the only time a
  // phone is looking at it.
  const feed = useMemo(() => notificationFeed(), [notifOpen, clearedAt]);
  const unread = unreadCount(feed, clearedAt);

  const results = useMemo(
    () => searchEverything(query, (path) => canAccess(user?.role, path)),
    [query, user?.role]
  );

  function go(to) {
    setDrawer(false);
    setQuery("");
    navigate(to);
  }

  function openDrawer() {
    setNotifOpen(false);
    setDrawer(true);
  }

  return (
    <>
      <header
        className={`md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b ${t.divider} ${
          dark ? "bg-[#1f232b]" : "bg-white"
        }`}
      >
        <button onClick={openDrawer} aria-label="Menu" className={t.textPrimary}>
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
          onClick={() => {
            setDrawer(false);
            setNotifOpen((o) => !o);
          }}
          aria-label="Notifications"
          className={`relative ${t.textSecondary}`}
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>

        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            dark ? "bg-white text-black" : "bg-slate-900 text-white"
          }`}
        >
          {initial}
        </div>
      </header>

      {notifOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Notifications">
          <button
            type="button"
            aria-label="Close notifications"
            className="absolute inset-0 bg-black/50"
            onClick={() => setNotifOpen(false)}
          />
          <div
            className={`absolute inset-x-0 top-0 max-h-[85vh] flex flex-col rounded-b-2xl overflow-hidden ${
              dark ? "bg-[#1f232b]" : "bg-white"
            }`}
          >
            <div className={`px-4 py-3 flex items-center justify-between border-b ${t.divider}`}>
              <div className="flex items-center gap-2 min-w-0">
                <Bell className={`w-4 h-4 shrink-0 ${t.textSecondary}`} />
                <span className={`font-semibold text-sm ${t.textPrimary}`}>Notifications</span>
                {unread > 0 && (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      dark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {feed.length > 0 && (
                  <button
                    onClick={() => {
                      db.clearNotifications();
                      setClearedAt(db.getNotifClearedAt());
                    }}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg ${t.textSecondary} ${t.pillBg}`}
                  >
                    Clear
                  </button>
                )}
                <button onClick={() => setNotifOpen(false)} aria-label="Close" className={`p-1.5 ${t.textMuted}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto">
              {feed.length === 0 ? (
                <div className={`px-4 py-8 text-center text-sm ${t.textMuted}`}>Nothing new</div>
              ) : (
                feed.map((item, i) => {
                  const style = notifStyle(item.type);
                  const Icon = style.Icon;
                  const fresh = isUnread(item, clearedAt);
                  return (
                    <div
                      key={item.id || i}
                      className={`flex gap-3 px-4 py-3 border-b ${t.divider} ${
                        fresh ? (dark ? "bg-blue-500/10" : "bg-blue-50") : ""
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          dark ? style.dark : style.light
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-semibold ${t.textPrimary}`}>{style.label}</span>
                          <span className={`text-xs shrink-0 ${t.textMuted}`}>{timeAgo(item.createdAt)}</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${t.textSecondary}`}>{item.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => {
                setNotifOpen(false);
                navigate("/activity");
              }}
              className={`w-full px-4 py-3 text-sm font-medium flex items-center justify-center gap-1 ${
                dark ? "text-blue-400" : "text-blue-600"
              }`}
            >
              View all notifications <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {drawer && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawer(false)}
          />
          <div
            className={`relative w-80 max-w-[88%] h-full flex flex-col ${dark ? "bg-[#1f232b]" : "bg-white"}`}
          >
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
              <div className="min-w-0">
                <div className={`text-base font-bold truncate ${t.textPrimary}`}>{settings.shopName}</div>
                <div className={`text-xs truncate ${t.textMuted}`}>{settings.tagline || "This browser"}</div>
              </div>
              <button onClick={() => setDrawer(false)} aria-label="Close" className={t.textMuted}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search belongs in here on a phone: the topbar's box is hidden
                below md, so this is the only place to type into. */}
            <div className="px-4 pb-3">
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${t.pillBg}`}>
                <Search className={`w-4 h-4 shrink-0 ${t.textMuted}`} />
                <input
                  id="mobile-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search anything..."
                  className={`bg-transparent outline-none text-sm flex-1 min-w-0 ${t.textPrimary}`}
                />
                {query && (
                  <button onClick={() => setQuery("")} aria-label="Clear search" className={t.textMuted}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {query ? (
                results.length === 0 ? (
                  <div className={`px-4 py-3 text-sm ${t.textMuted}`}>No results</div>
                ) : (
                  results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => go(r.path)}
                      className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between gap-3 ${t.textPrimary}`}
                    >
                      <span className="text-[15px] truncate">{r.label}</span>
                      <span className={`text-xs shrink-0 ${t.textMuted}`}>{r.type}</span>
                    </button>
                  ))
                )
              ) : (
                <nav className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setDrawer(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium ${
                            isActive
                              ? dark
                                ? "bg-white/10 text-white"
                                : "bg-blue-50 text-blue-600"
                              : t.textPrimary
                          }`
                        }
                      >
                        <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </nav>
              )}
            </div>

            <div className={`border-t ${t.divider} p-2`}>
              <button
                onClick={toggleDark}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium ${t.textPrimary}`}
              >
                {dark ? <Moon className="w-[18px] h-[18px] shrink-0" /> : <Sun className="w-[18px] h-[18px] shrink-0" />}
                {dark ? "Dark mode" : "Light mode"}
              </button>
              <button
                onClick={() => {
                  setDrawer(false);
                  openHelp();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium ${t.textPrimary}`}
              >
                <HelpCircle className="w-[18px] h-[18px] shrink-0" /> Help
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
