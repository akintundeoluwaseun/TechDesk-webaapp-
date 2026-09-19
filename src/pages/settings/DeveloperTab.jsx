import React from "react";
import { Code2, Phone, Mail, MessageCircle } from "lucide-react";
import { useThemeTokens } from "../../lib/ThemeContext";

export default function DeveloperTab() {
  const t = useThemeTokens();

  const rows = [
    { icon: Phone, label: "+234 807 691 1614", href: "tel:+2348076911614" },
    { icon: Mail, label: "seun85148@gmail.com", href: "mailto:seun85148@gmail.com" },
    { icon: MessageCircle, label: "Chat on WhatsApp", href: "https://wa.me/2348076911614", accent: true },
  ];

  return (
    <div className={`rounded-2xl p-6 ${t.cardBg}`}>
      <h3 className={`font-semibold mb-1 ${t.textPrimary}`}>Developer</h3>
      <p className={`text-sm mb-4 ${t.textSecondary}`}>Built and maintained by</p>

      <div className="flex items-center gap-3 mb-5">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.dark ? "bg-white/10" : "bg-slate-100"}`}>
          <Code2 className={`w-4 h-4 ${t.textSecondary}`} />
        </div>
        <div>
          <div className={`font-semibold ${t.textPrimary}`}>Akintunde Oluwaseun Joshua</div>
          <div className={`text-sm ${t.textMuted}`}>Software developer</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <a
              key={r.label}
              href={r.href}
              target={r.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className={`flex items-center gap-3 text-sm ${r.accent ? "text-emerald-500" : t.textSecondary}`}
            >
              <Icon className="w-4 h-4" /> {r.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
