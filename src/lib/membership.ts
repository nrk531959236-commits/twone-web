import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MembershipStatus = "guest" | "inactive" | "active";

export type MembershipSummary = {
  status: MembershipStatus;
  isAuthenticated: boolean;
  isMember: boolean;
  message: string;
  detail: string;
  expiresAt: string | null;
  plan: string | null;
};

type MembershipRow = {
  user_id: string;
  plan: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
};

function isMembershipActive(row: MembershipRow | null, now = new Date()) {
  if (!row) {
    return false;
  }

  if ((row.status ?? "inactive") !== "active") {
    return false;
  }

  if (row.started_at && new Date(row.started_at).getTime() > now.getTime()) {
    return false;
  }

  if (row.expires_at && new Date(row.expires_at).getTime() <= now.getTime()) {
    return false;
  }

  return true;
}

export function buildMembershipSummary(user: User | null, row: MembershipRow | null): MembershipSummary {
  if (!user) {
    return {
      status: "guest",
      isAuthenticated: false,
      isMember: false,
      message: "未登录，仅可浏览。",
      detail: "请先登录会员邮箱；服务端会在登录态基础上继续校验会员状态。",
      expiresAt: null,
      plan: null,
    };
  }

  const active = isMembershipActive(row);

  if (!active) {
    return {
      status: "inactive",
      isAuthenticated: true,
      isMember: false,
      message: "已登录，但未开通会员。",
      detail: "当前账号已有登录会话，但没有有效会员权限，/assistant 发送与 /api/assistant 都会被拒绝。",
      expiresAt: row?.expires_at ?? null,
      plan: row?.plan ?? null,
    };
  }

  return {
    status: "active",
    isAuthenticated: true,
    isMember: true,
    message: "已开通会员，可使用 AI 助手。",
    detail: "当前账号具备有效会员权限，文本对话能力已放行。后续可在同一模型上叠加等级、额度与到期管理。",
    expiresAt: row?.expires_at ?? null,
    plan: row?.plan ?? null,
  };
}

export async function getMembershipSummary() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return buildMembershipSummary(null, null);
  }

  const { data: row, error: membershipError } = await supabase
    .from("memberships")
    .select("user_id, plan, status, started_at, expires_at")
    .eq("user_id", user.id)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    throw membershipError;
  }

  return buildMembershipSummary(user, row);
}
