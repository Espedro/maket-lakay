import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = SearchX,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed bg-white/70 p-8 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-primary">
        <Icon className="size-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel ? (
        <Button className="mt-5" variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
