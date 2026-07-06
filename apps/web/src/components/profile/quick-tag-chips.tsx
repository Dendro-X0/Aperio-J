"use client";

import { cn } from "@/lib/utils";

export function QuickTagChips({
  label,
  tags,
  selected,
  onAdd,
  disabledTags,
}: {
  label?: string;
  tags: string[];
  selected: string[];
  onAdd: (tag: string) => void;
  disabledTags?: Set<string>;
}) {
  if (tags.length === 0) return null;

  const selectedKeys = new Set(selected.map((item) => item.toLowerCase()));

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const key = tag.toLowerCase();
          const isSelected = selectedKeys.has(key) || disabledTags?.has(key);
          return (
            <button
              key={tag}
              type="button"
              disabled={isSelected}
              onClick={() => onAdd(tag)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                isSelected
                  ? "cursor-default border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
