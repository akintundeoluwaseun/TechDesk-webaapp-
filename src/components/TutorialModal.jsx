import React, { useState } from "react";
import {
  X,
  LayoutGrid,
  ShoppingCart,
  Wrench,
  Box,
  Users,
  BarChart3,
  ClipboardList,
  Settings as SettingsIcon,
  Keyboard,
} from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { MOD_KEY_LABEL } from "./Topbar";

const STEPS = [
  { icon: LayoutGrid, text: "Dashboard — today's sales and repairs at a glance, plus quick actions to start a new sale or repair." },
  { icon: ShoppingCart, text: "Sales (POS) — ring up a sale, take payment, then print the receipt, share it on WhatsApp or save it as a PDF." },
  { icon: Wrench, text: "Repairs — log a device, track it from received to delivered, and print the repair ticket." },
  { icon: Box, text: "Inventory — track stock and cost vs. selling price, with alerts when something's running low." },
  { icon: Users, text: "Customers — every customer's contact details and their full sales & repair history." },
  { icon: BarChart3, text: "Reports — revenue, profit, and repair trends over any time period." },
  { icon: ClipboardList, text: "Activity Logs — a running history of every sale, repair, and change made on this device." },
  { icon: SettingsIcon, text: "Settings — shop details, receipt formatting, up to 3 staff accounts, and backups." },
];

// Only shortcuts that are actually wired up belong here.
const SHORTCUTS = [
  { keys: [MOD_KEY_LABEL, "K"], what: "Jump to search from anywhere" },
  { keys: [MOD_KEY_LABEL, "Enter"], what: "Complete the sale you're ringing up" },
  { keys: ["Esc"], what: "Close the open dialog, or clear the search box" },
  { keys: ["Enter"], what: "In New Sale, add the scanned or typed SKU to the cart" },
];

export default function TutorialModal({ onClose }) {
  const t = useThemeTokens();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6">
      <div className={`w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl p-6 ${t.dark ? "bg-[#1a1a2e]/90 backdrop-blur-lg border border-white/10" : "bg-white/35 backdrop-blur-lg backdrop-brightness-90 border border-white/50"}`}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className={`text-lg font-bold ${t.textPrimary}`}>How to use TechDesk</h2>
          <button onClick={() => onClose(dontShowAgain)} className={t.textMuted}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-5 overflow-y-auto">
          {STEPS.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.pillBg}`}>
                <Icon className={`w-4 h-4 ${t.textPrimary}`} />
              </div>
              <p className={`text-sm mt-1.5 ${t.textSecondary}`}>{text}</p>
            </div>
          ))}

          {/* No keyboard on a phone, so the shortcut list is desktop-only. */}
          <div className={`hidden md:block mt-2 pt-4 ${t.dark ? "border-t border-white/10" : "border-t border-white/50"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className={`w-4 h-4 ${t.textPrimary}`} />
              <h3 className={`text-sm font-semibold ${t.textPrimary}`}>Keyboard shortcuts</h3>
            </div>
            <div className="flex flex-col gap-2">
              {SHORTCUTS.map(({ keys, what }) => (
                <div key={what} className="flex items-center justify-between gap-3">
                  <span className={`text-sm ${t.textSecondary}`}>{what}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {keys.map((k) => (
                      <kbd
                        key={k}
                        className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                          t.dark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 mb-4 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className={`text-sm ${t.textSecondary}`}>Don't show this on startup</span>
        </label>

        <button
          onClick={() => onClose(dontShowAgain)}
          className={`w-full py-3 rounded-xl font-semibold shrink-0 ${t.dark ? "bg-white text-black" : "bg-slate-900 text-white"}`}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
