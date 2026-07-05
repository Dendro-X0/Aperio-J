"use client";

import { cn } from "@/lib/utils";
import {
  looksLikeStructuredHtml,
  parseJobDescriptionBody,
  sanitizeJobHtml,
  splitTextWithUrls,
  splitUrlSuffix,
} from "@/lib/format-opportunity-body";

function LinkifiedText({ text }: { text: string }) {
  const parts = splitTextWithUrls(text);

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "url") {
          const { href, suffix } = splitUrlSuffix(part.value);
          return (
            <a
              key={`${index}-${href}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            >
              {href}
              {suffix}
            </a>
          );
        }
        return <span key={`${index}-text`}>{part.value}</span>;
      })}
    </>
  );
}

export function JobDescriptionContent({ body }: { body: string }) {
  if (looksLikeStructuredHtml(body)) {
    const safeHtml = sanitizeJobHtml(body);
    return (
      <div
        className={cn(
          "space-y-3 text-sm leading-relaxed text-muted-foreground",
          "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-2",
          "[&_strong]:font-semibold [&_strong]:text-foreground",
          "[&_b]:font-semibold [&_b]:text-foreground",
          "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground",
          "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground",
          "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground",
          "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
          "[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
          "[&_p]:leading-relaxed",
        )}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  const blocks = parseJobDescriptionBody(body);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <p
              key={`${index}-${block.text}`}
              className={cn(
                "font-semibold text-foreground",
                block.level === 1 ? "pt-1 text-base first:pt-0" : "text-sm",
              )}
            >
              <LinkifiedText text={block.text} />
            </p>
          );
        }

        return (
          <p key={`${index}-${block.text.slice(0, 24)}`}>
            <LinkifiedText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
