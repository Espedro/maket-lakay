import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface VendorPlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function VendorPlaceholderPage({
  description,
  icon: Icon,
  title,
}: VendorPlaceholderPageProps) {
  return (
    <section className="border bg-white p-6">
      <Icon className="size-8 text-primary" />
      <h1 className="mt-4 text-3xl font-black tracking-normal">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button asChild className="mt-5" variant="outline">
        <Link href="/vendor">
          <ArrowLeft className="size-4" />
          Back to overview
        </Link>
      </Button>
    </section>
  );
}
