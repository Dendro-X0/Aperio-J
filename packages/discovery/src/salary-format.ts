export function isMeaningfulSalaryAmount(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Format a salary line for feed bodies; returns null when both bounds are zero/missing. */
export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  options?: { currency?: string; prefix?: string },
): string | null {
  const minOk = isMeaningfulSalaryAmount(min);
  const maxOk = isMeaningfulSalaryAmount(max);
  if (!minOk && !maxOk) return null;

  const currency = options?.currency?.trim() || "$";
  const prefix = options?.prefix ?? "Salary";

  if (minOk && maxOk) {
    return `${prefix}: ${currency}${min!.toLocaleString()} - ${currency}${max!.toLocaleString()}`;
  }
  if (minOk) return `${prefix}: from ${currency}${min!.toLocaleString()}`;
  return `${prefix}: up to ${currency}${max!.toLocaleString()}`;
}

/** Remove salary lines that are empty or zero-valued from listing bodies. */
export function stripEmptySalaryLines(body: string): string {
  return body
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!/^salary:/i.test(trimmed)) return true;
      return !/(?:\$|usd|eur|gbp|sgd|¥|€|£)\s*0\b|0\s*[-–—]\s*0|from\s+\$?0\b|up to\s+\$?0\b/i.test(
        trimmed,
      );
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
