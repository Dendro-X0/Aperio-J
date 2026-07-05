import { cn } from "@/lib/utils";

/** Minimal aperture mark — opening ring with a focal point (Aperio brand). */
export function AperioLogo({
  className,
  size = 32,
  title,
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <circle
        cx="16"
        cy="16"
        r="8.25"
        className="fill-none stroke-primary-foreground"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray="38 14"
        transform="rotate(-90 16 16)"
      />
      <circle cx="16" cy="16" r="2.25" className="fill-primary-foreground" />
      <path
        d="M16 11.5 L16 8.75 M21.2 18.5 L23.6 20.1 M10.8 18.5 L8.4 20.1"
        className="stroke-primary-foreground"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
