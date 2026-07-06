"use client";

import { MapPin, Briefcase, Target } from "lucide-react";
import { profileLocationLabelFromCityField } from "@/lib/profile-location-display";
import { useI18n } from "@/i18n/provider";
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
  const { locale } = useI18n();
  const { city, industries = [], roles = [] } = summary;
  const locationLabel = profileLocationLabelFromCityField(city, locale);
  const hasContent = Boolean(industries.length > 0 || roles.length > 0 || locationLabel);
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
      <div className="flex flex-wrap items-center gap-1.5">
        <MapPin className={cn(iconClass, "shrink-0 text-muted-foreground")} aria-hidden />
        <Badge variant="secondary" className={cn("shrink-0 whitespace-normal", badgeClass)}>
          {locationLabel}
        </Badge>
      </div>
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
