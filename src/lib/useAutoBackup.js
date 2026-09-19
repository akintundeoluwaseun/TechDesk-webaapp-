import { useEffect } from "react";
import { db } from "./db";

const KEY_LAST_AUTO_BACKUP = "techdesk_last_auto_backup";

export function useAutoBackup() {
  useEffect(() => {
    if (!window.techdesk?.saveBackup) return; // web preview / no Electron bridge

    const last = localStorage.getItem(KEY_LAST_AUTO_BACKUP);
    const today = new Date().toISOString().slice(0, 10);
    if (last === today) return;

    const json = db.exportBackup();
    window.techdesk.saveBackup(json).then((result) => {
      if (result?.ok) {
        localStorage.setItem(KEY_LAST_AUTO_BACKUP, today);
      }
    });
  }, []);
}
