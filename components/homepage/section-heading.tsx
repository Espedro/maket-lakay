import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeadingProps {
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
}

export function SectionHeading({
  title,
  description,
  href,
  actionLabel = "View all",
}: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-normal sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 sm:inline-flex"
        >
          {actionLabel} <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
