import type { RoleCategory } from "@aperio-j/core";

export type FeedbackAction = "not-interested" | "agency-scam" | "applied" | "interested";

export interface OpportunityFeedbackSignal {
  opportunityId: string;
  sourceId: string;
  action: FeedbackAction;
  roleCategories: RoleCategory[];
}

export interface MatchFeedbackContext {
  signals: OpportunityFeedbackSignal[];
  /** Per-source weight multiplier from registry + feedback (default 1). */
  sourceWeights: Record<string, number>;
}

export const EMPTY_FEEDBACK_CONTEXT: MatchFeedbackContext = {
  signals: [],
  sourceWeights: {},
};
