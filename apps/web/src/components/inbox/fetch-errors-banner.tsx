"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FetchErrorLine } from "@/components/inbox/fetch-error-line";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTranslations } from "@/i18n/provider";

export function FetchErrorsBanner({ errors }: { errors: string[] }) {
  const { t } = useTranslations("inbox");
  const [open, setOpen] = useState(false);

  if (errors.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-900 dark:text-amber-200">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left">
          <span className="font-medium">
            {t("fetchErrorsBanner.summary", { count: errors.length })}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-panel-open:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="list-disc space-y-1 border-t border-amber-500/20 px-4 py-2 pl-8">
            {errors.map((item) => (
              <FetchErrorLine key={item} raw={item} />
            ))}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
