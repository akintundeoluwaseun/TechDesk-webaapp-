import React from "react";
import { FileText, Receipt, X } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";

/**
 * Which paper, asked once.
 *
 * Print used to mean A4 and nothing else, which is wrong for a counter with
 * a thermal roll in it and wrong for an office with neither. Two buttons,
 * each the size of a thumb, and the choice is not remembered on purpose --
 * a shop prints a customer's A4 invoice and the next one's till receipt
 * minutes apart.
 */
export default function PrintSizeModal({ onPick, onClose, title = "Print" }) {
  const t = useThemeTokens();

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 ${
          t.dark ? "bg-[#1f232b]" : "bg-white"
        }`}
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className={`text-base font-bold ${t.textPrimary}`}>{title}</h3>
          <button onClick={onClose} aria-label="Close" className={`p-1.5 ${t.textMuted}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className={`text-sm mb-4 ${t.textSecondary}`}>Which size?</p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onPick("a4")}
            className={`flex items-center gap-3 p-4 rounded-xl text-left ${t.pillBg}`}
          >
            <FileText className={`w-5 h-5 shrink-0 ${t.textPrimary}`} />
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${t.textPrimary}`}>A4 page</span>
              <span className={`block text-xs ${t.textMuted}`}>For an ordinary printer</span>
            </span>
          </button>

          <button
            onClick={() => onPick("58mm")}
            className={`flex items-center gap-3 p-4 rounded-xl text-left ${t.pillBg}`}
          >
            <Receipt className={`w-5 h-5 shrink-0 ${t.textPrimary}`} />
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${t.textPrimary}`}>58mm receipt</span>
              <span className={`block text-xs ${t.textMuted}`}>For a thermal roll</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
