import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/admin";
import { normalizeEmail, isPasswordStrongEnough, PASSWORD_SETUP_MIN_LENGTH } from "@/lib/password-setup";

async function findAuthUserByEmail(email: string) {
  const supabase = createSupabaseAdminClient();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const users = data.users ?? [];
    const matched = users.find((user) => user.email && normalizeEmail(user.email) === email);

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "请先输入申请时填写的邮箱。" }, { status: 400 });
    }

    if (!isPasswordStrongEnough(password)) {
      return NextResponse.json({ error: `密码至少 ${PASSWORD_SETUP_MIN_LENGTH} 位。` }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: approval, error: approvalError } = await supabase
      .from("membership_email_approvals")
      .select("email, plan, status, assistant_monthly_quota, approved_application_id")
      .eq("email", email)
      .maybeSingle();

    if (approvalError) {
      throw approvalError;
    }

    if (!approval || (approval.status ?? "inactive") !== "active") {
      return NextResponse.json({ error: "该邮箱当前还没有已通过的申请，暂时不能直接首次激活。" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const existingUser = await findAuthUserByEmail(email);
    let userId = existingUser?.id ?? null;

    if (!existingUser) {
      const { data: createdUserData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      userId = createdUserData.user?.id ?? null;
    } else {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "创建激活账号失败，请稍后重试。" }, { status: 500 });
    }

    const { error: membershipError } = await supabase.from("memberships").upsert(
      {
        user_id: userId,
        status: "active",
        plan: approval.plan ?? "free",
        assistant_monthly_quota: approval.assistant_monthly_quota ?? 2,
        started_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );

    if (membershipError) {
      throw membershipError;
    }

    return NextResponse.json({
      message: "首次激活完成，正在为你登录。",
      email,
      userId,
      plan: approval.plan ?? "free",
      assistantMonthlyQuota: approval.assistant_monthly_quota ?? 2,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "首次激活失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
