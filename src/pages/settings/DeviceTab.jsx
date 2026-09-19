import React, { useRef, useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { useThemeTokens } from "../../lib/ThemeContext";
import { db } from "../../lib/db";

export default function DeviceTab() {
  const t = useThemeTokens();
  const fileRef = useRef(null);
  const [confirmErase, setConfirmErase] = useState(false);


  function handleDownloadBackup() {
    const json = db.exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `techdesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRestoreClick() {
    fileRef.current?.click();
  }

  function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        db.restoreBackup(reader.result);
        window.location.reload();
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  }

  function handleErase() {
    if (!confirmErase) {
      setConfirmErase(true);
      return;
    }
    db.eraseAllData();
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={`rounded-2xl p-6 ${t.cardBg}`}>
        <h3 className={`font-semibold mb-1 ${t.textPrimary}`}>Backup &amp; restore</h3>
        <p className={`text-sm mb-4 ${t.textSecondary}`}>
          Save a copy of everything on this device to a file, or restore from a previous backup. Restoring
          replaces all current data on this device. TechDesk also saves an automatic backup once a day to this
          device's app data folder (the last 14 are kept) as a safety net between manual backups.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadBackup}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium ${t.pillBg}`}
          >
            <Download className="w-4 h-4" /> Download backup
          </button>
          <button
            onClick={handleRestoreClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium ${t.pillBg}`}
          >
            <Upload className="w-4 h-4" /> Restore backup
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleRestoreFile} />
        </div>
      </div>

      {/* Desktop only. It looks for other editions installed on the same
          computer, which is an Electron-only search -- on a phone it can
          only ever answer "none found", so offering it there is a button
          whose single outcome is disappointment. */}

      <div className={`rounded-2xl p-6 ${t.cardBg}`}>
        <h3 className={`font-semibold mb-1 ${t.textPrimary}`}>Device data</h3>
        <p className={`text-sm mb-4 ${t.textSecondary}`}>
          TechDesk runs fully offline. All sales, repairs, inventory and customers are stored on this device only.
        </p>
        <button
          onClick={handleErase}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium ${
            confirmErase ? "bg-red-500 text-white" : "text-red-500 " + (t.dark ? "bg-red-500/10" : "bg-red-50")
          }`}
        >
          <Trash2 className="w-4 h-4" /> {confirmErase ? "Click again to confirm" : "Erase all data"}
        </button>
      </div>
    </div>
  );
}
