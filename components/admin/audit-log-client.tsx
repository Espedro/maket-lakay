"use client";

import * as React from "react";
import { AlertTriangle, ClipboardList, Search, ShieldCheck, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuditLog } from "@/hooks/use-audit-log";
import type { AuditActorRole, AuditSeverity } from "@/lib/audit-log";
import { formatDate } from "@/lib/utils";

const actorRoleOptions: Array<"all" | AuditActorRole> = [
  "all",
  "admin",
  "support",
  "vendor",
  "customer",
  "system",
];

const severityOptions: Array<"all" | AuditSeverity> = ["all", "info", "warning", "critical"];

function severityVariant(severity: AuditSeverity) {
  if (severity === "critical") return "destructive";
  if (severity === "warning") return "secondary";
  return "neutral";
}

export function AuditLogClient() {
  const { entries, isReady } = useAuditLog();
  const [query, setQuery] = React.useState("");
  const [actorRoleFilter, setActorRoleFilter] = React.useState<(typeof actorRoleOptions)[number]>("all");
  const [severityFilter, setSeverityFilter] = React.useState<(typeof severityOptions)[number]>("all");
  const [entityFilter, setEntityFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");
  const entityTypes = Array.from(new Set(entries.map((entry) => entry.entityType))).sort();
  const actions = Array.from(new Set(entries.map((entry) => entry.action))).sort();
  const filteredEntries = entries.filter((entry) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      entry.actorName.toLowerCase().includes(normalizedQuery) ||
      entry.action.toLowerCase().includes(normalizedQuery) ||
      entry.entityLabel.toLowerCase().includes(normalizedQuery) ||
      entry.entityId.toLowerCase().includes(normalizedQuery) ||
      entry.summary.toLowerCase().includes(normalizedQuery);
    const matchesRole = actorRoleFilter === "all" || entry.actorRole === actorRoleFilter;
    const matchesSeverity = severityFilter === "all" || entry.severity === severityFilter;
    const matchesEntity = entityFilter === "all" || entry.entityType === entityFilter;
    const matchesAction = actionFilter === "all" || entry.action === actionFilter;

    return matchesQuery && matchesRole && matchesSeverity && matchesEntity && matchesAction;
  });
  const hasActiveFilters =
    query.trim() !== "" ||
    actorRoleFilter !== "all" ||
    severityFilter !== "all" ||
    entityFilter !== "all" ||
    actionFilter !== "all";

  function resetFilters() {
    setQuery("");
    setActorRoleFilter("all");
    setSeverityFilter("all");
    setEntityFilter("all");
    setActionFilter("all");
  }

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Audit Trail
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">Audit log</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review local operational actions across admin, support, vendor, order, payout, and commission workflows.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_160px_180px_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-9 shadow-none"
              placeholder="Search audit log..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter audit log by actor role"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={actorRoleFilter}
            onChange={(event) => setActorRoleFilter(event.target.value as (typeof actorRoleOptions)[number])}
          >
            {actorRoleOptions.map((role) => (
              <option key={role} value={role}>
                {role === "all" ? "All roles" : role}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter audit log by severity"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value as (typeof severityOptions)[number])}
          >
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {severity === "all" ? "All severity" : severity}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter audit log by entity"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
          >
            <option value="all">All entities</option>
            {entityTypes.map((entityType) => (
              <option key={entityType} value={entityType}>
                {entityType.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter audit log by action"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          >
            <option value="all">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground">
            {filteredEntries.length} entries shown
          </p>
          <Button type="button" variant="outline" size="sm" disabled={!hasActiveFilters} onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={ClipboardList} label="Total entries" value={entries.length.toString()} />
        <Metric icon={AlertTriangle} label="Warnings" value={entries.filter((entry) => entry.severity === "warning").length.toString()} />
        <Metric icon={ShieldCheck} label="Critical" value={entries.filter((entry) => entry.severity === "critical").length.toString()} />
        <Metric icon={UserCheck} label="Support actions" value={entries.filter((entry) => entry.actorRole === "support").length.toString()} />
      </section>

      <section className="border bg-white p-5">
        <div className="responsive-table-wrap">
          <table className="responsive-table min-w-[1180px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">When</th>
                <th className="py-3 font-medium">Actor</th>
                <th className="py-3 font-medium">Action</th>
                <th className="py-3 font-medium">Entity</th>
                <th className="py-3 font-medium">Change</th>
                <th className="py-3 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 align-top">
                  <td className="py-3 font-semibold">{formatDate(entry.createdAt)}</td>
                  <td className="py-3">
                    <p className="font-black">{entry.actorName}</p>
                    <p className="text-xs text-muted-foreground">{entry.actorRole}</p>
                  </td>
                  <td className="py-3">
                    <p className="font-black">{entry.action.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.summary}</p>
                  </td>
                  <td className="py-3">
                    <p className="font-semibold">{entry.entityLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.entityType} · {entry.entityId}
                    </p>
                  </td>
                  <td className="py-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">Old:</span>{" "}
                      <span className="font-semibold">{entry.oldValue ?? "Not captured"}</span>
                    </p>
                    <p className="mt-1">
                      <span className="text-muted-foreground">New:</span>{" "}
                      <span className="font-semibold">{entry.newValue ?? "Not captured"}</span>
                    </p>
                  </td>
                  <td className="py-3">
                    <Badge variant={severityVariant(entry.severity)}>{entry.severity}</Badge>
                  </td>
                </tr>
              ))}
              {!filteredEntries.length ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No audit log entries match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border bg-white p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </div>
      <Icon className="size-8 text-primary" />
    </div>
  );
}
