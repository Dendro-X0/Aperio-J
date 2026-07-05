import type { RoleCategory } from "@aperio-j/core";
import { prisma } from "@aperio-j/db";
import type {
  FeedbackAction,
  MatchFeedbackContext,
  OpportunityFeedbackSignal,
} from "@aperio-j/matcher";

export type { FeedbackAction };

export async function loadMatchFeedbackContext(
  profileId: string,
): Promise<MatchFeedbackContext> {
  const [feedbackRows, streamRows] = await Promise.all([
    prisma.opportunityFeedback.findMany({
      where: { seekerProfileId: profileId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.streamRegistryEntry.findMany({
      where: { seekerProfileId: profileId },
      select: { id: true, learningWeight: true },
    }),
  ]);

  const signals: OpportunityFeedbackSignal[] = feedbackRows.map((row) => ({
    opportunityId: row.opportunityId,
    sourceId: row.sourceId,
    action: row.action as FeedbackAction,
    roleCategories: JSON.parse(row.roleCategories) as RoleCategory[],
  }));

  const sourceWeights: Record<string, number> = {};
  for (const stream of streamRows) {
    sourceWeights[stream.id] = stream.learningWeight;
  }

  return { signals, sourceWeights };
}

export async function recordOpportunityFeedback(input: {
  profileId: string;
  opportunityId: string;
  sourceId: string;
  action: FeedbackAction;
  roleCategories: RoleCategory[];
  reason?: string;
}) {
  await prisma.opportunityFeedback.upsert({
    where: {
      seekerProfileId_opportunityId: {
        seekerProfileId: input.profileId,
        opportunityId: input.opportunityId,
      },
    },
    create: {
      seekerProfileId: input.profileId,
      opportunityId: input.opportunityId,
      sourceId: input.sourceId,
      action: input.action,
      reason: input.reason ?? null,
      roleCategories: JSON.stringify(input.roleCategories),
    },
    update: {
      sourceId: input.sourceId,
      action: input.action,
      reason: input.reason ?? null,
      roleCategories: JSON.stringify(input.roleCategories),
    },
  });

  if (input.action === "agency-scam" && input.sourceId && input.sourceId !== "user-capture") {
    const stream = await prisma.streamRegistryEntry.findFirst({
      where: { id: input.sourceId, seekerProfileId: input.profileId },
    });
    if (stream) {
      await prisma.streamRegistryEntry.update({
        where: { id: stream.id },
        data: { learningWeight: Math.max(0.1, stream.learningWeight * 0.7) },
      });
    }
  }

  if (input.action === "applied" && input.sourceId && input.sourceId !== "user-capture") {
    const stream = await prisma.streamRegistryEntry.findFirst({
      where: { id: input.sourceId, seekerProfileId: input.profileId },
    });
    if (stream) {
      await prisma.streamRegistryEntry.update({
        where: { id: stream.id },
        data: { learningWeight: Math.min(2, stream.learningWeight * 1.1) },
      });
    }
  }
}
