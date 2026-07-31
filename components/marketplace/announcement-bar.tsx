import { Truck } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="container flex min-h-9 items-center justify-center gap-2 px-4 text-center text-sm font-medium">
        <Truck className="size-4" />
        Marketplace foundation preview with local data only.
      </div>
    </div>
  );
}
