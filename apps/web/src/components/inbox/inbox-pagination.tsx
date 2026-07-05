"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const INBOX_PAGE_SIZE = 50;

export function paginateItems<T>(items: T[], page: number, pageSize = INBOX_PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPagesForCount(count: number, pageSize = INBOX_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

export function InboxPagination({
  page,
  totalItems,
  pageSize = INBOX_PAGE_SIZE,
  onPageChange,
  className,
}: {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const { t } = useTranslations("inbox.pagination");
  const totalPages = totalPagesForCount(totalItems, pageSize);

  if (totalItems <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        {t("showing", { from, to, total: totalItems })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("previous")}
        </Button>
        <span className="min-w-[6rem] text-center text-sm tabular-nums text-muted-foreground">
          {t("page", { page, totalPages })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
