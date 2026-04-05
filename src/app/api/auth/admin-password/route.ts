import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getAdminEmails } from "@/lib/admin";
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
      return NextResponse.json({ error: "请先输入管理员邮箱。" }, { status: 400 });
    }

    const allowedAdminEmails = getAdminEmails();

    if (!allowedAdminEmails.includes(email)) {
      return NextResponse.json(
        { error: "该邮箱不在管理员白名单内，不能通过站内管理员设密入口处理。" },
        { status: 403 },
      );
    }

    if (!isPasswordStrongEnough(password)) {
      return NextResponse.json({ error: `密码至少 ${PASSWORD_SETUP_MIN_LENGTH} 位。` }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const existingUser = await findAuthUserByEmail(email);

    if (!existingUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        message: `管理员账号已创建并设置密码：${email}。现在可直接去 /admin-login 登录。`,
        userId: data.user?.id ?? null,
        created: true,
      });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      message: `管理员密码已更新：${email}。现在可直接去 /admin-login 用新密码登录。`,
      userId: existingUser.id,
      created: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "管理员设密失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
