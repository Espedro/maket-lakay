"use client";

import { readLocalJson, writeLocalJson } from "@/lib/local-storage";

export const AUDIT_LOG_KEY = "maket-lakay-audit-log";
export const AUDIT_LOG_EVENT = "maket-lakay-audit-log-storage";

export type AuditActorRole = "admin" | "support" | "vendor" | "customer" | "system";
export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: AuditActorRole;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  summary: string;
  oldValue?: string;
  newValue?: string;
  severity: AuditSeverity;
  createdAt: string;
}

export const defaultAuditLogEntries: AuditLogEntry[] = [
  {
    id: "audit-seed-vendor-review",
    actorId: "admin-ops",
    actorName: "Maket Admin",
    actorRole: "admin",
    action: "vendor.documents_reviewed",
    entityType: "vendor",
    entityId: "vendor-bel-lakay",
    entityLabel: "Bel Lakay Trading",
    summary: "Initial vendor documents were reviewed.",
    oldValue: "not_started",
    newValue: "reviewed",
    severity: "info",
    createdAt: "2026-07-14T10:20:00Z",
  },
  {
    id: "audit-seed-commission",
    actorId: "admin-ops",
    actorName: "Maket Admin",
    actorRole: "admin",
    action: "commission.vendor_rate_changed",
    entityType: "commission",
    entityId: "vendor-bel-lakay",
    entityLabel: "Bel Lakay Trading",
    summary: "Launch partner commission rate was adjusted.",
    oldValue: "8%",
    newValue: "7.5%",
    severity: "warning",
    createdAt: "2026-07-12T10:00:00Z",
  },
  {
    id: "audit-seed-support",
    actorId: "support-roseline",
    actorName: "Roseline Admin",
    actorRole: "support",
    action: "support.ticket_opened",
    entityType: "support_ticket",
    entityId: "ticket-1001",
    entityLabel: "Damaged school kit item",
    summary: "Support ticket entered the operations queue.",
    newValue: "open",
    severity: "info",
    createdAt: "2026-07-14T11:08:00Z",
  },
];

export function readAuditLog() {
  return readLocalJson<AuditLogEntry[]>(AUDIT_LOG_KEY, defaultAuditLogEntries);
}

export function writeAuditLog(entries: AuditLogEntry[]) {
  writeLocalJson(AUDIT_LOG_KEY, entries, AUDIT_LOG_EVENT);
}

export function addAuditLogEntry(entry: Omit<AuditLogEntry, "id" | "createdAt"> & { createdAt?: string }) {
  if (typeof window === "undefined") return;

  const createdAt = entry.createdAt ?? new Date().toISOString();
  const nextEntry: AuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
  };
  const entries = readAuditLog();
  writeAuditLog([nextEntry, ...entries].slice(0, 250));
}
