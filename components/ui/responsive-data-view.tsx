import * as React from "react";

import { cn } from "@/lib/utils";

interface DataField {
  label: string;
  value: React.ReactNode;
}

interface ResponsiveDataViewProps<T> {
  items: T[];
  getKey: (item: T) => string;
  cardTitle: (item: T) => React.ReactNode;
  cardDescription?: (item: T) => React.ReactNode;
  cardMeta?: (item: T) => React.ReactNode;
  cardFields: (item: T) => DataField[];
  cardActions?: (item: T) => React.ReactNode;
  table: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export function ResponsiveDataView<T>({
  cardActions,
  cardDescription,
  cardFields,
  cardMeta,
  cardTitle,
  className,
  emptyState,
  getKey,
  items,
  table,
}: ResponsiveDataViewProps<T>) {
  if (!items.length && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="mobile-card-list">
        {items.map((item) => (
          <article key={getKey(item)} className="mobile-data-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="safe-text font-black">{cardTitle(item)}</h3>
                {cardDescription ? (
                  <p className="safe-text mt-1 text-sm text-muted-foreground">
                    {cardDescription(item)}
                  </p>
                ) : null}
              </div>
              {cardMeta ? <div className="shrink-0">{cardMeta(item)}</div> : null}
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              {cardFields(item).map((field) => (
                <div key={field.label} className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="safe-text min-w-0 font-semibold">{field.value}</dd>
                </div>
              ))}
            </dl>
            {cardActions ? <div className="dashboard-action-row mt-4">{cardActions(item)}</div> : null}
          </article>
        ))}
      </div>
      <div className="desktop-table-view responsive-table-wrap">{table}</div>
    </div>
  );
}
