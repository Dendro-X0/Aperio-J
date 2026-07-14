"use client";

import { parseClassifiedStreamFetchError } from "@aperio-j/discovery/fetch-error-classify";
import { useTranslations } from "@/i18n/provider";

export function FetchErrorLine({ raw }: { raw: string }) {
  const { t } = useTranslations("inbox.fetchErrors");
  const parsed = parseClassifiedStreamFetchError(raw);

  if (!parsed) {
    return <li>{raw}</li>;
  }

  return (
    <li>
      <span className="font-medium">{parsed.label}</span>
      {" — "}
      <span className="uppercase tracking-wide text-[0.7rem] opacity-80">
        {t(parsed.kind)}
      </span>
      {": "}
      {parsed.kind === "network" ? t("networkDetail") : parsed.detail}
    </li>
  );
}
