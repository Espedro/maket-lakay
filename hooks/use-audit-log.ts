"use client";

import * as React from "react";

import {
  AUDIT_LOG_EVENT,
  addAuditLogEntry,
  readAuditLog,
  type AuditLogEntry,
} from "@/lib/audit-log";

export function useAuditLog() {
  const [entries, setEntries] = React.useState<AuditLogEntry[]>([]);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(() => {
    setEntries(readAuditLog());
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(AUDIT_LOG_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(AUDIT_LOG_EVENT, refresh);
    };
  }, [refresh]);

  return {
    addEntry: addAuditLogEntry,
    entries,
    isReady,
  };
}
