import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/admin";
import { hashPasswordSetupToken, isPasswordStrongEnough, PASSWORD_SETUP_MIN_LENGTH } from "@/lib/password-setup";

type PasswordSetupTokenRow = {
  id: string;
  token_hash: string;
  user_id: string;
  email: string | null;
  status: "active" | "used" | "revoked" | "expired";
  expires_at: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";

    if (!token) {
      return NextResponse.json({ error: "missing token" }, { status: 400 });
    }

    if (!isPasswordStrongEnough(password)) {
      return NextResponse.json(
        { error: `password should be at least ${PASSWORD_SETUP_MIN_LENGTH} characters` },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const tokenHash = hashPasswordSetupToken(token);

    const { data: tokenRow, error: tokenError } = await supabase
      .from("membership_password_setup_tokens")
      .select("id, token_hash, user_id, email, status, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle<PasswordSetupTokenRow>();

    if (tokenError) {
      throw tokenError;
    }

    if (!tokenRow) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 });
    }

    const now = new Date();

    if (tokenRow.status !== "active") {
      return NextResponse.json({ error: "token already used or revoked" }, { status: 400 });
    }

    if (new Date(tokenRow.expires_at).getTime() <= now.getTime()) {
      await supabase
        .from("membership_password_setup_tokens")
        .update({ status: "expired", updated_at: now.toISOString() })
        .eq("id", tokenRow.id);

      return NextResponse.json({ error: "token expired" }, { status: 400 });
    }

    const { error: updateUserError } = await supabase.auth.admin.updateUserById(tokenRow.user_id, {
      password,
      email_confirm: true,
    });

    if (updateUserError) {
      return NextResponse.json({ error: updateUserError.message }, { status: 400 });
    }

    const { error: markUsedError } = await supabase
      .from("membership_password_setup_tokens")
      .update({
        status: "used",
        used_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", tokenRow.id);

    if (markUsedError) {
      throw markUsedError;
    }

    return NextResponse.json({
      message: `密码已设置完成${tokenRow.email ? `（${tokenRow.email}）` : ""}。现在去 /assistant 用邮箱 + 密码登录即可。`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "首次设密失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
