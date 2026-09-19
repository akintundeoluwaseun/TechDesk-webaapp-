import React, { useEffect, useState } from "react";
import { Building2, CheckCircle2, Link2, Phone, Unlink } from "lucide-react";
import { useThemeTokens } from "../../lib/ThemeContext";
import { db } from "../../lib/db";
import { hq } from "../../lib/hq";

export default function ConnectHqTab() {
  const t = useThemeTokens();
  const [status, setStatus] = useState(null);
  const [step, setStep] = useState("idle");        // idle | code | working
  const [hqPhone, setHqPhone] = useState("");
  const [branchName, setBranchName] = useState(() => db.getSettings?.().shopName || "");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    hq.status().then(setStatus);
  }, []);

  const input = `w-full rounded-xl px-3 py-2.5 text-sm outline-none ${t.inputBg}`;

  async function askForCode(e) {
    e.preventDefault();
    setError("");
    if (!branchName.trim()) return setError("Give this branch a name first.");
    if (!hqPhone.trim()) return setError("Enter your HQ phone number.");

    setStep("working");
    const res = await hq.connectStart({
      hqPhone: hqPhone.trim(),
      branchName: branchName.trim(),
      businessName: db.getSettings?.().shopName || null,
    });
    if (!res.ok) {
      setStep("idle");
      return setError(res.message || "That didn't work. Try again.");
    }
    setSentTo(res.targetPhone || hqPhone);
    setStep("code");
  }

  async function submitCode(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) return setError("The code is 6 digits.");

    setStep("working");
    const res = await hq.connectVerify({ code: code.trim() });
    if (!res.ok) {
      setStep("code");
      return setError(res.message || "That didn't work. Try again.");
    }
    setCode("");
    setStep("idle");
    setStatus(await hq.status());
  }

  async function disconnect() {
    if (!window.confirm("Disconnect this branch from HQ? Your data stays on this device.")) return;
    await hq.disconnect();
    setStatus(await hq.status());
    setStep("idle");
  }

  // The web build keeps the connection in this browser's storage rather than
  // in a file only the app can read, so it is worth saying so on the screen
  // where someone decides to connect -- not only in a README.
  const WHERE_IT_LIVES =
    "This browser holds the link to head office. Clearing site data disconnects " +
    "it -- nothing already sent is lost, and you can connect again.";

  if (status?.connected) {
    return (
      <div className="flex flex-col gap-5">
        <div className={`rounded-2xl p-6 ${t.cardBg}`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" size={20} />
            <div>
              <h3 className={`font-semibold ${t.textPrimary}`}>Connected to HQ</h3>
              <p className={`text-sm ${t.textSecondary}`}>
                This branch reports to {status.hqPhone || "your HQ"}
                {status.connectedAt
                  ? ` since ${new Date(status.connectedAt).toLocaleDateString()}`
                  : ""}.
              </p>
            </div>
          </div>
          <div className={`mt-4 rounded-xl p-4 ${t.insetBg}`}>
            <div className={`text-xs uppercase tracking-wider ${t.textMuted}`}>This branch</div>
            <div className={`mt-1 font-semibold ${t.textPrimary}`}>
              {status.branchName || branchName || "Unnamed branch"}
            </div>
          </div>
        </div>

        <div className={`rounded-2xl p-6 ${t.cardBg}`}>
          <h3 className={`font-semibold ${t.textPrimary}`}>Disconnect</h3>
          <p className={`text-sm mt-1 mb-4 ${t.textSecondary}`}>
            Stops this branch reporting to HQ. Nothing is deleted &mdash; your sales, repairs and
            inventory stay on this device exactly as they are.
          </p>
          <button
            onClick={disconnect}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 bg-red-500/10"
          >
            <Unlink className="w-4 h-4" /> Disconnect from HQ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={`rounded-2xl p-6 ${t.cardBg}`}>
        <div className="flex items-center gap-3">
          <Link2 className={t.dark ? "text-amber-300" : "text-amber-500"} size={20} />
          <div>
            <h3 className={`font-semibold ${t.textPrimary}`}>Connect this branch to HQ</h3>
            <p className={`text-sm ${t.textSecondary}`}>
              Your head office sees this branch&rsquo;s sales and repairs on their phone. We text
              them a code &mdash; ring them and they&rsquo;ll read it out.
            </p>
            <p className={`text-xs mt-2 ${t.textMuted}`}>{WHERE_IT_LIVES}</p>
          </div>
        </div>

        {step === "code" ? (
          <form onSubmit={submitCode} className="mt-5">
            <p className={`text-sm mb-4 ${t.textSecondary}`}>
              We texted a 6-digit code to <b className={t.textPrimary}>{sentTo}</b>. Ring them and
              ask for it.
            </p>
            <label className="block mb-4">
              <span className={`block text-xs font-semibold mb-2 ${t.textSecondary}`}>The code</span>
              {/* No maxlength: it would cut a code typed with spaces before the
                  handler strips them. Six digits is enforced below instead. */}
              <input
                className={`${input} text-center text-2xl font-semibold tracking-[0.4em]`}
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />
            </label>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <div className="flex gap-3 flex-wrap">
              <button
                type="submit"
                disabled={step === "working"}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${t.pillBg} ${
                  step === "working" ? "opacity-60" : ""
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Connect
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("idle");
                  setCode("");
                  setError("");
                }}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${t.pillBg}`}
              >
                Use a different number
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={askForCode} className="mt-5">
            <label className="block mb-4">
              <span className={`block text-xs font-semibold mb-2 ${t.textSecondary}`}>
                <Building2 className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                Name for this branch
              </span>
              <input
                className={input}
                placeholder="Akure South"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
              />
              <span className={`block text-xs mt-2 ${t.textMuted}`}>
                This is what HQ sees this shop called.
              </span>
            </label>
            <label className="block mb-4">
              <span className={`block text-xs font-semibold mb-2 ${t.textSecondary}`}>
                <Phone className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                Your HQ&rsquo;s phone number
              </span>
              <input
                className={input}
                inputMode="tel"
                placeholder="08012345678"
                value={hqPhone}
                onChange={(e) => setHqPhone(e.target.value)}
              />
              <span className={`block text-xs mt-2 ${t.textMuted}`}>
                The number your head office registered with. The code goes to them, not here.
              </span>
            </label>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <button
              type="submit"
              disabled={step === "working"}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${t.pillBg} ${
                step === "working" ? "opacity-60" : ""
              }`}
            >
              <Link2 className="w-4 h-4" /> {step === "working" ? "Sending…" : "Send HQ a code"}
            </button>
          </form>
        )}
      </div>

      <div className={`rounded-2xl p-6 ${t.cardBg}`}>
        <h3 className={`font-semibold ${t.textPrimary}`}>No HQ yet?</h3>
        <p className={`text-sm mt-1 ${t.textSecondary}`}>
          Head office signs up once at techdesk-one.vercel.app/hq.html with their phone number.
          Every branch then connects to that number.
        </p>
      </div>
    </div>
  );
}
