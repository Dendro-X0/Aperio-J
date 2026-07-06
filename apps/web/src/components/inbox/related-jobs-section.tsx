import type { InboxItem } from "@/lib/match-service";
import { InboxJobGridCard } from "@/components/inbox/inbox-job-grid-card";
import { DetailPanel } from "@/components/inbox/inbox-detail-panels";

export function RelatedJobsSection({
  items,
  title,
  remoteOnly = false,
}: {
  items: InboxItem[];
  title: string;
  remoteOnly?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <DetailPanel title={title}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((related) => (
          <InboxJobGridCard
            key={related.opportunity.id}
            item={related}
            remoteOnly={remoteOnly}
          />
        ))}
      </div>
    </DetailPanel>
  );
}
