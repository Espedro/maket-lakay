"use client";

import { Globe2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultLocale, supportedLocales } from "@/lib/i18n";

export function LanguageSelector() {
  return (
    <div className="flex items-center gap-2">
      <Globe2 className="size-4 text-white/80" />
      <Select defaultValue={defaultLocale}>
        <SelectTrigger className="h-9 w-[112px] border-white/15 bg-white/10 text-white shadow-none">
          <SelectValue aria-label="Language" />
        </SelectTrigger>
        <SelectContent>
          {supportedLocales.map((locale) => (
            <SelectItem key={locale.code} value={locale.code}>
              {locale.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
