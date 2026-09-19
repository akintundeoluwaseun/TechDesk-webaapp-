import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, ShoppingCart, Wrench, Box } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { useAuth, canAccess } from "../lib/AuthContext";
import { useSettings } from "../lib/SettingsContext";

// The phone's bottom bar: the four things a shop touches all day. Everything
// else lives in the app bar's drawer, so this stays four wide targets rather
// than eight cramped ones.
const PRIMARY = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/repairs", label: "Repairs", icon: Wrench },
  { to: "/inventory", label: "Inventory", icon: Box },
];

export default function MobileNav() {
  const t = useThemeTokens();
  const { settings } = useSettings();
  const { user } = useAuth();

  const primary = PRIMARY.filter((item) => canAccess(user?.role, item.to));
  const label = (item) =>
    item.to === "/repairs" ? settings.labels?.navRepairs || "Repairs" : item.label;

  return (
    <nav
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t ${t.divider} ${
        t.dark ? "bg-[#1f232b]" : "bg-white"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main"
    >
      {primary.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2.5 text-[10px] font-medium ${
                isActive ? t.textPrimary : t.textMuted
              }`
            }
          >
            <Icon className="w-[22px] h-[22px] shrink-0" strokeWidth={1.9} />
            <span className="truncate max-w-full px-0.5">{label(item)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
