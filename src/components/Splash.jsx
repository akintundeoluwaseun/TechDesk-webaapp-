import React, { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { useSettings } from "../lib/SettingsContext";

export default function Splash({ onDone, duration = 1800 }) {
  const t = useThemeTokens();
  const { settings } = useSettings();
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(tick);
        setExiting(true);
        setTimeout(onDone, 350);
      }
    }, 16);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${t.bg} transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center animate-[splashPop_0.6s_ease-out]">
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-5 ${t.cardBg}`}
          style={{ animation: "splashPulse 1.8s ease-in-out infinite" }}
        >
          <Monitor className={`w-9 h-9 ${t.dark ? "text-white" : "text-blue-500"}`} />
        </div>
        <h1 className={`text-2xl font-bold tracking-tight mb-1 ${t.textPrimary}`}>{settings.shopName}</h1>
        <p className={`text-xs mb-8 ${t.textMuted}`}>{settings.tagline}</p>

        <div className={`w-40 h-1 rounded-full overflow-hidden ${t.dark ? "bg-white/10" : "bg-slate-200"}`}>
          <div
            className={`h-full rounded-full ${t.dark ? "bg-white" : "bg-slate-900"}`}
            style={{ width: `${progress}%`, transition: "width 60ms linear" }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splashPop {
          0% { opacity: 0; transform: scale(0.9) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
