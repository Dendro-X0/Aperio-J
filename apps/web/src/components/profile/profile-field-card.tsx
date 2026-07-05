import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProfileFieldCard({
  title,
  description,
  required,
  children,
  className,
}: {
  title: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-lg border border-border/80 bg-muted/15 p-4 sm:p-5",
        className,
      )}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-medium leading-none">
          {title}
          {required && (
            <span className="ml-1 text-destructive" aria-hidden>
              *
            </span>
          )}
        </h3>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
