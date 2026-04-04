import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/password-setup";

export type FirstActivationStatus = "none" | "required" | "completed";

export type FirstActivationContext = {
  status: FirstActivationStatus;
  email: string | null;
  plan: string | null;
  assistantMonthlyQuota: number | null;
  source: "guest_email_approval" | "user_email_approval" | "inactive_user" | null;
  reason: string | null;
};

type MembershipEmailApprovalRow = {
  email: string;
  plan: string | null;
  status: string | null;
  assistant_monthly_quota: number | null;
};

function isMissingAuthSessionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AuthSessionMissingError" || /auth session missing/i.test(error.message);
}

async function findAuthUserByEmail(email: string) {
  const supabase = createSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(email);
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const users = data.users ?? [];
    const matched = users.find((user) => user.email && normalizeEmail(user.email) === normalizedEmail);

    if (matched) {
      return matched;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function getFirstActivationContextByEmail(rawEmail: string): Promise<FirstActivationContext> {
  const email = normalizeEmail(rawEmail);

  if (!email || !email.includes("@")) {
    return {
      status: "none",
      email: null,
      plan: null,
      assistantMonthlyQuota: null,
      source: null,
      reason: null,
    };
  }

  const serverSupabase = await createSupabaseServerClient();
  const { data: approval, error: approvalError } = await serverSupabase
    .from("membership_email_approvals")
    .select("email, plan, status, assistant_monthly_quota")
    .eq("email", email)
    .maybeSingle<MembershipEmailApprovalRow>();

  if (approvalError) {
    throw approvalError;
  }

  if (!approval || (approval.status ?? "inactive") !== "active") {
    return {
      status: "none",
      email,
      plan: null,
      assistantMonthlyQuota: null,
      source: null,
      reason: null,
    };
  }

  const existingUser = await findAuthUserByEmail(email);

  if (!existingUser) {
    return {
      status: "required",
      email,
      plan: approval.plan ?? "free",
      assistantMonthlyQuota: approval.assistant_monthly_quota ?? 2,
      source: "guest_email_approval",
      reason: "该邮箱对应申请已审核通过，但还没完成首次激活。现在可直接在站内设置密码并立即登录。",
    };
  }

  return {
    status: "required",
    email,
    plan: approval.plan ?? "free",
    assistantMonthlyQuota: approval.assistant_monthly_quota ?? 2,
    source: "user_email_approval",
    reason: "该邮箱对应申请已审核通过，但当前还没有可用登录态。现在可直接在站内设置首次密码并立即登录。",
  };
}

export async function getFirstActivationContextForCurrentVisitor(user: User | null): Promise<FirstActivationContext> {
  const serverSupabase = await createSupabaseServerClient();

  if (!user) {
    return {
      status: "none",
      email: null,
      plan: null,
      assistantMonthlyQuota: null,
      source: null,
      reason: null,
    };
  }

  const email = user.email ? normalizeEmail(user.email) : "";

  if (!email) {
    return {
      status: "none",
      email: null,
      plan: null,
      assistantMonthlyQuota: null,
      source: null,
      reason: null,
    };
  }

  const { data: approval, error: approvalError } = await serverSupabase
    .from("membership_email_approvals")
    .select("email, plan, status, assistant_monthly_quota")
    .eq("email", email)
    .maybeSingle<MembershipEmailApprovalRow>();

  if (approvalError) {
    throw approvalError;
  }

  if (!approval || (approval.status ?? "inactive") !== "active") {
    return {
      status: "none",
      email,
      plan: null,
      assistantMonthlyQuota: null,
      source: null,
      reason: null,
    };
  }

  const {
    data: { user: currentUser },
    error: userError,
  } = await serverSupabase.auth.getUser();

  if (userError && !isMissingAuthSessionError(userError)) {
    throw userError;
  }

  if (!currentUser) {
    return {
      status: "required",
      email,
      plan: approval.plan ?? "free",
      assistantMonthlyQuota: approval.assistant_monthly_quota ?? 2,
      source: "inactive_user",
      reason: "该邮箱对应申请已审核通过，但你当前没有有效登录态。请直接完成首次激活。",
    };
  }

  return {
    status: "completed",
    email,
    plan: approval.plan ?? "free",
    assistantMonthlyQuota: approval.assistant_monthly_quota ?? 2,
    source: null,
    reason: null,
  };
}
