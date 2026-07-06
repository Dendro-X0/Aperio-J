import { redirect } from "next/navigation";
import { Suspense } from "react";
import { inboxProfileSummary, isCnCaptureFirstProfile, isCnRemoteFirstProfileForPage, isRemoteFirstProfileForPage, loadInboxPageData } from "@/lib/page-data";
import { InboxMarketplaceView } from "@/components/inbox/inbox-marketplace-view";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const data = await loadInboxPageData();
  if (data.kind === "redirect") {
    redirect(data.href);
  }

  const { profile, discoveryReady, inbox } = data;

  return (
    <Suspense fallback={null}>
      <InboxMarketplaceView
        discoveryReady={discoveryReady}
        initialItems={inbox?.items ?? []}
        initialExcludedItems={inbox?.excludedItems ?? []}
        profileSummary={inboxProfileSummary(profile)}
        ranAt={inbox?.ranAt ?? null}
        opportunityCount={inbox?.opportunityCount ?? 0}
        matchedCount={inbox?.matchedCount ?? 0}
        excludedCount={inbox?.excludedCount ?? 0}
        fetchErrors={inbox?.fetchErrors ?? []}
        sourceDiscoveryErrors={inbox?.sourceDiscoveryErrors ?? []}
        streamCount={inbox?.streamCount ?? 0}
        usedFixtureFallback={inbox?.usedFixtureFallback ?? false}
        needsRediscover={discoveryReady && (inbox?.streamCount ?? 0) === 0}
        cnCaptureFirst={isCnCaptureFirstProfile(profile)}
        cnRemoteFirst={isCnRemoteFirstProfileForPage(profile)}
        remoteFirst={isRemoteFirstProfileForPage(profile)}
      />
    </Suspense>
  );
}
