"use client";

import { MapPin } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const locations = [
  "Port-au-Prince, Haiti",
  "Petion-Ville, Haiti",
  "Cap-Haitien, Haiti",
  "Jacmel, Haiti",
  "Brooklyn, NY",
  "Miami, FL",
];

export function LocationSelector() {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border bg-white px-3 shadow-sm">
      <MapPin className="size-4 shrink-0 text-primary" />
      <Select
        defaultValue={locations[0]}
        onValueChange={(value) =>
          toast({
            title: "Location updated",
            description: `Showing local marketplace options for ${value}.`,
          })
        }
      >
        <SelectTrigger className="h-11 w-full min-w-0 border-0 bg-transparent px-0 shadow-none focus:ring-0 sm:w-[210px]">
          <SelectValue aria-label="Delivery location" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((location) => (
            <SelectItem key={location} value={location}>
              {location}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
