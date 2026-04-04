"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess, createSupabaseAdminClient } from "@/lib/admin";

type AuthUserLookup = {
  id: string;
  email: string | null;
};

type ReviewStatus = "pending" | "approved" | "rejected";

type ApplicationReviewSnapshot = {
  review_status: ReviewStatus | null;
  notes: string | null;
};

type ApprovalTarget =
  | {
      mode: "email_approval";
      approvalEmail: string;
      matchedBy: "contact_email";
      matchedEmail: string;
      userId: null;
    }
  | {
      mode: "membership_user";
      userId: string;
      matchedBy: "manual_user_id" | "contact_email_existing_user";
      matchedEmail: string | null;
      approvalEmail: string | null;
    };

function toText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function toNullableText(value: FormDataEntryValue | null) {
  const text = toText(value);
  return text ? text : null;
}

function toNullableQuota(value: FormDataEntryValue | null) {
  const text = toText(value);

  if (!text) {
    return null;
  }

  const quota = Number.parseInt(text, 10);

  if (Number.isNaN(quota) || quota < 0) {
    throw new Error("assistant_monthly_quota 必须是大于等于 0 的整数。");
  }

  return quota;
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
      return {
        id: matched.id,
        email: matched.email ?? null,
      } satisfies AuthUserLookup;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

async function resolveApprovalTarget(params: { manualUserId: string; contact: string }): Promise<ApprovalTarget> {
  const manualUserId = params.manualUserId.trim();

  if (manualUserId) {
    return {
      mode: "membership_user",
      userId: manualUserId,
      matchedBy: "manual_user_id",
      matchedEmail: null,
      approvalEmail: null,
    };
  }

  const contact = normalizeEmail(params.contact);

  if (!contact || !contact.includes("@")) {
    throw new Error("当前申请缺少有效的登录邮箱，无法按邮箱审批。请先让申请人补正确的登录邮箱，或手动填写目标 user_id。");
  }

  const matchedUser = await findAuthUserByEmail(contact);

  if (matchedUser) {
    return {
      mode: "membership_user",
      userId: matchedUser.id,
      matchedBy: "contact_email_existing_user",
      matchedEmail: matchedUser.email,
      approvalEmail: contact,
    };
  }

  return {
    mode: "email_approval",
    approvalEmail: contact,
    matchedBy: "contact_email",
    matchedEmail: contact,
    userId: null,
  };
}

export async function updateMembershipAction(formData: FormData) {
  const access = await getAdminAccess();

  if (!access.user || !access.isAdmin) {
    throw new Error("无权限执行后台操作。");
  }

  const membershipUserId = toText(formData.get("membershipUserId"));
  const status = toNullableText(formData.get("status"));
  const plan = toNullableText(formData.get("plan"));
  const assistantMonthlyQuota = toNullableQuota(formData.get("assistantMonthlyQuota"));

  if (!membershipUserId) {
    throw new Error("缺少 membershipUserId。");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("memberships")
    .update({
      status,
      plan,
      assistant_monthly_quota: assistantMonthlyQuota,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", membershipUserId);

  if (error) {
    throw error;
  }

  revalidatePath("/admin");
}

async function getApplicationReviewSnapshot(applicationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("member_applications")
    .select("review_status, notes")
    .eq("id", applicationId)
    .maybeSingle<ApplicationReviewSnapshot>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("未找到对应申请记录，无法完成审批操作。");
  }

  return data;
}

async function appendApplicationReviewNote(params: {
  applicationId: string;
  reviewStatus: ReviewStatus;
  actor: string;
  reviewedAt: string;
  existingNotes?: string | null;
  extraNotes?: Array<string | null | undefined>;
}) {
  const supabase = createSupabaseAdminClient();
  const reviewNote = [
    `review_status=${params.reviewStatus}`,
    `reviewed_at=${params.reviewedAt}`,
    `reviewed_by=${params.actor}`,
    ...(params.extraNotes ?? []),
  ]
    .filter(Boolean)
    .join(" | ");

  const currentNotes = params.existingNotes?.trim() ?? "";

  if (currentNotes.includes(reviewNote)) {
    return;
  }

  const mergedNotes = [currentNotes, reviewNote].filter(Boolean).join("\n\n");

  const { error: applicationUpdateError } = await supabase
    .from("member_applications")
    .update({ notes: mergedNotes || reviewNote })
    .eq("id", params.applicationId);

  if (applicationUpdateError) {
    throw applicationUpdateError;
  }
}

export async function approveApplicationAction(formData: FormData) {
  const access = await getAdminAccess();

  if (!access.user || !access.isAdmin) {
    throw new Error("无权限执行后台操作。");
  }

  const applicationId = toText(formData.get("applicationId"));
  const contact = toText(formData.get("applicationContact"));
  const manualUserId = toText(formData.get("targetUserId"));
  const plan = toNullableText(formData.get("plan")) ?? "free";
  const assistantMonthlyQuota = toNullableQuota(formData.get("assistantMonthlyQuota")) ?? 2;

  if (!applicationId) {
    throw new Error("缺少 applicationId。");
  }

  const snapshot = await getApplicationReviewSnapshot(applicationId);

  if (snapshot.review_status === "approved") {
    redirect(`/admin?type=info&message=${encodeURIComponent("这条申请已经通过并开通，无需重复操作。")}`);
  }

  if (snapshot.review_status === "rejected") {
    redirect(`/admin?type=error&message=${encodeURIComponent("这条申请已被拒绝，不能再执行通过并开通。")}`);
  }

  const target = await resolveApprovalTarget({ manualUserId, contact });
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const actor = access.email ?? access.user.id;

  if (target.mode === "membership_user") {
    const { error } = await supabase.from("memberships").upsert(
      {
        user_id: target.userId,
        status: "active",
        plan,
        assistant_monthly_quota: assistantMonthlyQuota,
        started_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw error;
    }
  }

  const approvalEmail = target.mode === "email_approval" ? target.approvalEmail : target.approvalEmail;

  if (approvalEmail) {
    const { error: approvalError } = await supabase.from("membership_email_approvals").upsert(
      {
        email: approvalEmail,
        status: "active",
        plan,
        assistant_monthly_quota: assistantMonthlyQuota,
        started_at: now,
        approved_application_id: applicationId,
        approved_at: now,
        approved_by: actor,
        updated_at: now,
      },
      { onConflict: "email" },
    );

    if (approvalError) {
      throw approvalError;
    }
  }

  const { error: reviewUpdateError } = await supabase
    .from("member_applications")
    .update({
      review_status: "approved",
      reviewed_at: now,
      reviewed_by: actor,
    })
    .eq("id", applicationId);

  if (reviewUpdateError) {
    throw reviewUpdateError;
  }

  await appendApplicationReviewNote({
    applicationId,
    reviewStatus: "approved",
    actor,
    reviewedAt: now,
    existingNotes: snapshot.notes,
    extraNotes: [
      `matched_by=${target.matchedBy}`,
      `approval_mode=${target.mode}`,
      target.matchedEmail ? `matched_email=${target.matchedEmail}` : null,
      target.userId ? `membership_user_id=${target.userId}` : null,
      approvalEmail ? `approval_email=${approvalEmail}` : null,
      `plan=${plan}`,
      `assistant_monthly_quota=${assistantMonthlyQuota}`,
    ],
  });

  revalidatePath("/admin");
  redirect(`/admin?type=success&message=${encodeURIComponent("已通过并开通：申请状态已更新，会员资格已发放。")}`);
}

export async function rejectApplicationAction(formData: FormData) {
  const access = await getAdminAccess();

  if (!access.user || !access.isAdmin) {
    throw new Error("无权限执行后台操作。");
  }

  const applicationId = toText(formData.get("applicationId"));

  if (!applicationId) {
    throw new Error("缺少 applicationId。");
  }

  const snapshot = await getApplicationReviewSnapshot(applicationId);

  if (snapshot.review_status === "rejected") {
    redirect(`/admin?type=info&message=${encodeURIComponent("这条申请已经是已拒绝状态，无需重复操作。")}`);
  }

  if (snapshot.review_status === "approved") {
    redirect(`/admin?type=error&message=${encodeURIComponent("这条申请已通过并开通，不能再执行拒绝。")}`);
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const actor = access.email ?? access.user.id;

  const { error } = await supabase
    .from("member_applications")
    .update({
      review_status: "rejected",
      reviewed_at: now,
      reviewed_by: actor,
    })
    .eq("id", applicationId);

  if (error) {
    throw error;
  }

  await appendApplicationReviewNote({
    applicationId,
    reviewStatus: "rejected",
    actor,
    reviewedAt: now,
    existingNotes: snapshot.notes,
  });

  revalidatePath("/admin");
  redirect(`/admin?type=success&message=${encodeURIComponent("已拒绝该申请，状态已更新。")}`);
}
