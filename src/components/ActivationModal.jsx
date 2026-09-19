import React, { useState } from "react";
import { X, ShieldCheck, Phone, Mail, Globe, Copy, Check } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { useLicense } from "../lib/LicenseContext";

export default function ActivationModal({ onClose }) {
  const t = useThemeTokens();
  const { pin, daysLeft, trialExpired, verifyCode, activated } = useLicense();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleVerify() {
    setChecking(true);
    const ok = await verifyCode(code);
    setChecking(false);
    if (ok) {
      setError("");
    } else {
      setError("That code doesn't match this PIN. Double-check with support.");
    }
  }

  function copyPin() {
    navigator.clipboard?.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6">
      <div className={`w-full max-w-sm rounded-2xl p-6 ${t.dark ? "bg-[#1a1a2e]/90 backdrop-blur-lg border border-white/10" : "bg-white/35 backdrop-blur-lg backdrop-brightness-90 border border-white/50"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-5 h-5 ${activated ? "text-emerald-500" : t.textPrimary}`} />
            <h2 className={`text-lg font-bold ${t.textPrimary}`}>{activated ? "Activated" : "Activate TechDesk"}</h2>
          </div>
          <button onClick={onClose} className={t.textMuted}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {activated ? (
          <p className={`text-sm ${t.textSecondary}`}>This device is fully activated. Thanks for supporting TechDesk!</p>
        ) : (
          <>
            <p className={`text-sm mb-4 ${t.textSecondary}`}>
              {trialExpired
                ? "Your 7-day trial has ended. Activate to unlock full access again."
                : `You have ${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`}{" "}
              This is a one-time payment \u2014 no subscription.
            </p>

            <div className={`rounded-xl p-4 mb-4 ${t.cardBg}`}>
              <div className={`text-xs mb-1 ${t.textMuted}`}>Your device PIN (send this to get your code)</div>
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold tracking-widest ${t.textPrimary}`}>{pin}</span>
                <button onClick={copyPin} className={`p-2 rounded-lg ${t.pillBg}`}>
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Activation code</label>
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                placeholder="TD26-XXXX-XXXX-XXXX-XXXX"
                className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none uppercase ${t.inputBg}`}
              />
              {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
            </div>

            <button
              onClick={handleVerify}
              disabled={!code || checking}
              className={`w-full py-3 rounded-xl font-semibold mb-5 disabled:opacity-50 ${
                t.dark ? "bg-white text-black" : "bg-slate-900 text-white"
              }`}
            >
              {checking ? "Checking..." : "Activate"}
            </button>

            <div className={`text-xs mb-2 ${t.textMuted}`}>Get your activation code online, or contact us:</div>
            <div className="flex flex-col gap-2">
              <a
                href="https://techdesk-one.vercel.app/activate-business.html"
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2 text-sm font-medium ${t.textPrimary}`}
              >
                <Globe className="w-4 h-4" /> techdesk-one.vercel.app/activate-business
              </a>
              <a href="tel:+2348076911614" className={`flex items-center gap-2 text-sm ${t.textSecondary}`}>
                <Phone className="w-4 h-4" /> +234 807 691 1614
              </a>
              <a href="mailto:seun85148@gmail.com" className={`flex items-center gap-2 text-sm ${t.textSecondary}`}>
                <Mail className="w-4 h-4" /> seun85148@gmail.com
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
