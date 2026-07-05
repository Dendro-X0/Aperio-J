import { notFound, redirect } from "next/navigation";
import { loadInboxOpportunityPageData } from "@/lib/page-data";
import { InboxOpportunityDetailView } from "@/components/inbox/inbox-opportunity-detail-view";

export const dynamic = "force-dynamic";

export default async function InboxOpportunityPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const data = await loadInboxOpportunityPageData(opportunityId);

  if (data.kind === "redirect") {
    redirect(data.href);
  }
  if (data.kind === "notFound") {
    notFound();
  }

  const { profile, result } = data;
  const remoteOnly =
    !profile.constraints.primaryCity?.trim() &&
    profile.constraints.acceptableCities.every((city) => !city.trim());

  return (
    <InboxOpportunityDetailView
      item={result.item}
      excluded={result.excluded}
      remoteOnly={remoteOnly}
    />
  );
}
