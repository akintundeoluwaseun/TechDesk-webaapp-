import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";

/**
 * A settings section that lives behind a button instead of down the page.
 *
 * Settings had grown into a long scroll where the thing you came for was
 * usually below the fold. The sections people open occasionally -- business
 * type, wording, categories, appearance -- now open here, so the tab itself
 * is a short list of what you can change rather than everything at once.
 *
 * Changes save as they are made, the same as they did inline; Done just puts
 * the panel away. There is no Cancel because there is nothing to roll back,
 * and offering one would promise something this does not do.
 */
export default function SettingsModal({ title, description, onClose, children }) {
  // Escape closes, and the page behind must not scroll under the panel.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const t = useThemeTokens();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        // Clicking the backdrop closes; clicking the panel must not.
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full max-w-2xl rounded-2xl my-6 ${t.cardBg}`}
      >
        <div className={`flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b ${t.divider}`}>
          <div>
            <h3 className={`font-semibold ${t.textPrimary}`}>{title}</h3>
            {description && <p className={`text-sm mt-1 ${t.textSecondary}`}>{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className={`shrink-0 p-1.5 rounded-lg ${t.textMuted} ${
              t.dark ? "hover:bg-white/5" : "hover:bg-black/5"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        <div className={`px-6 pb-6 pt-1 flex justify-end`}>
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold ${
              t.dark ? "bg-white text-black" : "bg-slate-900 text-white"
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The row that opens one. A summary of what is currently set, so the tab
 * still answers "what is my business type" without anything being opened.
 */
export function SettingsRow({ title, value, description, onOpen, actionLabel = "Change" }) {
  const t = useThemeTokens();
  return (
    <div className={`rounded-2xl p-6 ${t.cardBg}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h3 className={`font-semibold ${t.textPrimary}`}>{title}</h3>
          {description && <p className={`text-sm mt-1 ${t.textSecondary}`}>{description}</p>}
          {value && <p className={`text-sm mt-2 font-medium ${t.textPrimary}`}>{value}</p>}
        </div>
        <button
          onClick={onOpen}
          className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold ${t.pillBg}`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
