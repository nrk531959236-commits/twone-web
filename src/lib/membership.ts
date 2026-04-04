import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isMissingAuthSessionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AuthSessionMissingError" || /auth session missing/i.test(error.message);
}

export type MembershipStatus = "guest" | "pending" | "inactive" | "active";

export type MembershipSummary = {
  status: MembershipStatus;
  isAuthenticated: boolean;
  isMember: boolean;
  isPending: boolean;
  message: string;
  detail: string;
  expiresAt: string | null;
  plan: string | null;
};

export type MembershipRow = {
  user_id: string;
  plan: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  assistant_monthly_quota?: number | null;
};

type MembershipEmailApprovalRow = {
  email: string;
  plan: string | null;
  status: string | null;
  assistant_monthly_quota: number | null;
  started_at: string | null;
  expires_at: string | null;
};

type MemberApplicationPendingRow = {
  id: string;
  contact: string | null;
  review_status: string | null;
  created_at: string | null;
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

export function buildMembershipSummary(
  user: User | null,
  row: MembershipRow | null,
  options?: {
    hasPendingApplication?: boolean;
  },
): MembershipSummary {
  if (!user) {
    return {
      status: "guest",
      isAuthenticated: false,
      isMember: false,
      isPending: false,
      message: "未登录，仅可浏览。",
      detail: "请先登录申请时填写的邮箱；现在优先支持邮箱 + 密码登录，magic link 作为备用。服务端会在登录态基础上继续校验会员状态，并自动兑现该邮箱已获批的资格。审核通过后默认发放 Free 体验版与 2 次 AI 对话。",
      expiresAt: null,
      plan: null,
    };
  }

  const active = isMembershipActive(row);

  if (active) {
    return {
      status: "active",
      isAuthenticated: true,
      isMember: true,
      isPending: false,
      message: "已开通体验资格，可使用 AI 助手。",
      detail: "当前账号具备有效会员权限，文本对话能力已放行。默认审批会按登录邮箱发放 Free 体验版与 2 次 AI 对话；后续仍可在同一模型上叠加等级、额度与到期管理。",
      expiresAt: row?.expires_at ?? null,
      plan: row?.plan ?? null,
    };
  }

  if (options?.hasPendingApplication) {
    return {
      status: "pending",
      isAuthenticated: true,
      isMember: false,
      isPending: true,
      message: "你的申请正在审核中。",
      detail: "当前登录邮箱已存在待审核申请。审核完成前，AI 助手仍为只读状态，无需重复提交；请等待审核结果，并继续使用申请时填写的同一邮箱登录。若审核通过，资格会自动生效；老用户也可以顺手补一个密码，后续登录更方便。",
      expiresAt: row?.expires_at ?? null,
      plan: row?.plan ?? null,
    };
  }

  return {
    status: "inactive",
    isAuthenticated: true,
    isMember: false,
    isPending: false,
    message: "已登录，但当前账号还没有可用体验资格。",
    detail: "当前账号已有登录会话，但没有有效会员权限，AI 助手暂不可用。若你还没申请，请先提交申请；若你已通过审核，请确认现在登录的就是申请时填写的邮箱，系统会按该邮箱自动兑现资格。若你以前只靠邮箱链接登录，也可以先补一个密码。默认审批会开通 Free 体验版与 2 次 AI 对话。",
    expiresAt: row?.expires_at ?? null,
    plan: row?.plan ?? null,
  };
}

export async function ensureMembershipForUser(user: User) {
  if (!user.email) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const normalizedEmail = user.email.trim().toLowerCase();

  const { data: approval, error: approvalError } = await supabase
    .from("membership_email_approvals")
    .select("email, plan, status, assistant_monthly_quota, started_at, expires_at")
    .eq("email", normalizedEmail)
    .maybeSingle<MembershipEmailApprovalRow>();

  if (approvalError) {
    throw approvalError;
  }

  if (!approval || (approval.status ?? "inactive") !== "active") {
    return null;
  }

  const now = new Date().toISOString();
  const membershipPayload = {
    user_id: user.id,
    plan: approval.plan ?? "free",
    status: "active",
    assistant_monthly_quota: approval.assistant_monthly_quota ?? 2,
    started_at: approval.started_at ?? now,
    expires_at: approval.expires_at ?? null,
    updated_at: now,
  };

  const { error: upsertError } = await supabase.from("memberships").upsert(membershipPayload, { onConflict: "user_id" });

  if (upsertError) {
    throw upsertError;
  }

  return {
    user_id: user.id,
    plan: membershipPayload.plan,
    status: membershipPayload.status,
    started_at: membershipPayload.started_at,
    expires_at: membershipPayload.expires_at,
    assistant_monthly_quota: membershipPayload.assistant_monthly_quota,
  } satisfies MembershipRow;
}

async function hasPendingApplicationByEmail(user: User) {
  if (!user.email) {
    return false;
  }

  const supabase = await createSupabaseServerClient();
  const normalizedEmail = user.email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("member_applications")
    .select("id, contact, review_status, created_at")
    .eq("contact", normalizedEmail)
    .eq("review_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<MemberApplicationPendingRow>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function getMembershipSummary() {
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
    return buildMembershipSummary(null, null);
  }

  const { data: existingMembershipRow, error: membershipError } = await supabase
    .from("memberships")
    .select("user_id, plan, status, started_at, expires_at")
    .eq("user_id", user.id)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    throw membershipError;
  }

  let row = existingMembershipRow;

  row = await ensureMembershipForUser(user) ?? row;

  const hasPendingApplication = row ? false : await hasPendingApplicationByEmail(user);

  return buildMembershipSummary(user, row, { hasPendingApplication });
}
