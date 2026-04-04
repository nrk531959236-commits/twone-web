import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildMembershipSummary, type MembershipSummary } from "@/lib/membership";

function isMissingAuthSessionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AuthSessionMissingError" || /auth session missing/i.test(error.message);
}

const DEFAULT_MONTHLY_QUOTA = 2;

type MembershipQuotaRow = {
  user_id: string;
  plan: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  assistant_monthly_quota: number | null;
};

export type AssistantQuotaSummary = {
  membership: MembershipSummary;
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  currentPeriod: string;
  canUseAssistant: boolean;
  quotaMessage: string;
};

function getCurrentPeriod(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function getQuotaMessage(summary: MembershipSummary, remaining: number, quota: number) {
  if (!summary.isAuthenticated) {
    return "未登录状态下仅可浏览，登录后才会显示并消耗 AI 配额。";
  }

  if (!summary.isMember) {
    return "当前账号未具备有效会员权限，AI 配额不会放行。";
  }

  if (remaining <= 0) {
    return `免费体验版本月 AI 对话额度已用尽（0 / ${quota} 剩余），请等待下月重置后再试。`;
  }

  return `当前 AI 对话还可使用 ${remaining} 次，共 ${quota} 次。默认 Free 体验版为 ${quota} 次。`;
}

function normalizeQuota(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_MONTHLY_QUOTA;
  }

  return Math.max(0, Math.floor(value));
}

async function getMembershipQuotaRow(user: User) {
  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("memberships")
    .select("user_id, plan, status, started_at, expires_at, assistant_monthly_quota")
    .eq("user_id", user.id)
    .maybeSingle<MembershipQuotaRow>();

  if (error) {
    throw error;
  }

  return row;
}

async function getMonthlyUsage(userId: string, period: string) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("assistant_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("period", period);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getAssistantQuotaSummary() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (!isMissingAuthSessionError(userError)) {
      throw userError;
    }
  }

  if (!user) {
    const membership = buildMembershipSummary(null, null);

    return {
      membership,
      monthlyQuota: DEFAULT_MONTHLY_QUOTA,
      monthlyUsed: 0,
      monthlyRemaining: DEFAULT_MONTHLY_QUOTA,
      currentPeriod: getCurrentPeriod(),
      canUseAssistant: false,
      quotaMessage: getQuotaMessage(membership, DEFAULT_MONTHLY_QUOTA, DEFAULT_MONTHLY_QUOTA),
    } satisfies AssistantQuotaSummary;
  }

  const row = await getMembershipQuotaRow(user);
  const membership = buildMembershipSummary(user, row);
  const monthlyQuota = normalizeQuota(row?.assistant_monthly_quota);
  const currentPeriod = getCurrentPeriod();
  const monthlyUsed = membership.isMember ? await getMonthlyUsage(user.id, currentPeriod) : 0;
  const monthlyRemaining = Math.max(monthlyQuota - monthlyUsed, 0);

  return {
    membership,
    monthlyQuota,
    monthlyUsed,
    monthlyRemaining,
    currentPeriod,
    canUseAssistant: membership.isMember && monthlyRemaining > 0,
    quotaMessage: getQuotaMessage(membership, monthlyRemaining, monthlyQuota),
  } satisfies AssistantQuotaSummary;
}

export async function consumeAssistantQuota() {
  const supabase = await createSupabaseServerClient();
  const quota = await getAssistantQuotaSummary();

  if (!quota.membership.isAuthenticated) {
    throw new Error("当前能力仅对会员开放，请先登录。");
  }

  if (!quota.membership.isMember) {
    throw new Error("当前账号已登录，但未开通有效会员，暂不可使用 AI 助手。");
  }

  if (quota.monthlyRemaining <= 0) {
    throw new Error("本月 AI 对话额度已用尽，请下月重置后再试。");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (!isMissingAuthSessionError(userError)) {
      throw userError;
    }
  }

  if (!user) {
    throw new Error("当前能力仅对会员开放，请先登录。");
  }

  const { error } = await supabase.from("assistant_usage").insert({
    user_id: user.id,
    period: quota.currentPeriod,
    request_type: "chat",
  });

  if (error) {
    throw error;
  }

  return {
    ...quota,
    monthlyUsed: quota.monthlyUsed + 1,
    monthlyRemaining: Math.max(quota.monthlyRemaining - 1, 0),
  } satisfies AssistantQuotaSummary;
}

export { DEFAULT_MONTHLY_QUOTA };
