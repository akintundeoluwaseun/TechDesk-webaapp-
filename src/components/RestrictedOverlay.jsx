import React from "react";
import { ShieldAlert } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { useLicense } from "../lib/LicenseContext";

// Shown once the trial is spent. This used to be an invisible click-blocker,
// which made an expired app look like a frozen one -- nothing said why the
// buttons had stopped working. It now says so plainly, and makes clear the
// shop's data is still on the machine.
export default function RestrictedOverlay({ onClick }) {
  const t = useThemeTokens();
  const { trialDays } = useLicense();

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-black/45 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-2xl p-6 text-center ${t.cardBg}`}>
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-red-500/15">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
        </div>
        <h2 className={`text-lg font-bold mb-2 ${t.textPrimary}`}>
          Your {trialDays}-day trial has ended
        </h2>
        <p className={`text-sm mb-5 ${t.textSecondary}`}>
          Nothing has been deleted — every sale, repair and customer is still here, and
          comes straight back the moment you activate. Activation is a one-time payment,
          not a subscription.
        </p>
        <button
          onClick={onClick}
          className={`w-full py-3 rounded-xl font-semibold ${
            t.dark ? "bg-white text-black" : "bg-slate-900 text-white"
          }`}
        >
          Activate TechDesk
        </button>
      </div>
    </div>
  );
}
