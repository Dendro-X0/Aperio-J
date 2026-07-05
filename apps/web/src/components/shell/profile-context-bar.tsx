"use client";

import { MapPin, Briefcase, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProfileContextSummary {
  city?: string;
  industries?: string[];
  roles?: string[];
}

export function ProfileContextBar({
  summary,
  compact = false,
  className,
}: {
  summary: ProfileContextSummary;
  compact?: boolean;
  className?: string;
}) {
  const { city, industries = [], roles = [] } = summary;
  const hasContent = Boolean(city?.trim() || industries.length > 0 || roles.length > 0);
  if (!hasContent) return null;

  const iconClass = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const badgeClass = compact ? "text-[0.65rem]" : "text-xs";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        className,
      )}
    >
      {city?.trim() && (
        <div className="flex flex-wrap items-center gap-1.5">
          <MapPin className={cn(iconClass, "shrink-0 text-muted-foreground")} aria-hidden />
          <Badge variant="secondary" className={cn("shrink-0 whitespace-normal", badgeClass)}>
            {city.trim()}
          </Badge>
        </div>
      )}
      {industries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Briefcase className={cn(iconClass, "shrink-0 text-muted-foreground")} aria-hidden />
          {industries.map((industry) => (
            <Badge
              key={industry}
              variant="outline"
              className={cn("shrink-0 whitespace-normal", badgeClass)}
            >
              {industry}
            </Badge>
          ))}
        </div>
      )}
      {roles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Target className={cn(iconClass, "shrink-0 text-muted-foreground")} aria-hidden />
          {roles.map((role) => (
            <Badge
              key={role}
              variant="outline"
              className={cn("shrink-0 whitespace-normal", badgeClass)}
            >
              {role}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
