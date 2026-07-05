import { NextResponse } from "next/server";
import type { RoleCategory } from "@aperio-j/core";
import type { FeedbackAction } from "@aperio-j/matcher";
import { getProfileIdFromCookies, loadSeekerProfile } from "@/lib/profile-store";
import { recordOpportunityFeedback } from "@/lib/feedback-service";
import { runMatchPipeline } from "@/lib/match-service";
import { getRequestTranslator } from "@/lib/request-i18n";

const ALLOWED_ACTIONS: FeedbackAction[] = [
  "not-interested",
  "agency-scam",
  "applied",
  "interested",
];

export async function POST(request: Request) {
  const { t, locale } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.onboardingRequired") }, { status: 401 });
  }

  const profile = await loadSeekerProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: t("api.profileMissing") }, { status: 404 });
  }

  const body = (await request.json()) as {
    opportunityId?: string;
    sourceId?: string;
    action?: string;
    roleCategories?: RoleCategory[];
    reason?: string;
  };

  if (!body.opportunityId || !body.action) {
    return NextResponse.json({ error: t("api.missingOpportunityOrAction") }, { status: 400 });
  }

  if (!ALLOWED_ACTIONS.includes(body.action as FeedbackAction)) {
    return NextResponse.json({ error: t("api.invalidAction") }, { status: 400 });
  }

  await recordOpportunityFeedback({
    profileId,
    opportunityId: body.opportunityId,
    sourceId: body.sourceId ?? "unknown",
    action: body.action as FeedbackAction,
    roleCategories: body.roleCategories ?? [],
    reason: body.reason,
  });

  const inbox = await runMatchPipeline(profile, locale);
  return NextResponse.json(inbox);
}
