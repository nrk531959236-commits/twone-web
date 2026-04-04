import type { AssistantQuotaSummary } from "@/lib/assistant-quota";
import type { AssistantQuotaView } from "@/lib/assistant/types";

export function toAssistantQuotaView(quota: Pick<AssistantQuotaSummary, "monthlyQuota" | "monthlyUsed" | "monthlyRemaining" | "currentPeriod" | "quotaMessage">): AssistantQuotaView {
  return {
    monthlyQuota: quota.monthlyQuota,
    monthlyUsed: quota.monthlyUsed,
    monthlyRemaining: quota.monthlyRemaining,
    currentPeriod: quota.currentPeriod,
    quotaMessage: quota.quotaMessage,
  } satisfies AssistantQuotaView;
}
