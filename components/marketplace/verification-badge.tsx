import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface VerificationBadgeProps {
  verified: boolean;
}

export function VerificationBadge({ verified }: VerificationBadgeProps) {
  return (
    <Badge variant={verified ? "success" : "neutral"} className="gap-1">
      <ShieldCheck className="size-3.5" />
      {verified ? "Verified" : "Pending"}
    </Badge>
  );
}
