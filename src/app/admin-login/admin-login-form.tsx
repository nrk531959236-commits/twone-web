"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth";
import { getReadableAuthErrorMessage } from "@/lib/auth-error";

type FormState = {
  email: string;
  password: string;
};

export function AdminLoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = form.email.trim();
    const password = form.password;

    if (!email) {
      setError("先输入管理员邮箱。");
      setMessage(null);
      return;
    }

    if (!password) {
      setError("先输入登录密码。");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(getReadableAuthErrorMessage(signInError.message));
      setIsSubmitting(false);
      return;
    }

    setMessage("登录成功，正在进入后台...");
    router.push("/admin");
    router.refresh();
  }

  async function handleSendResetEmail() {
    const email = form.email.trim();

    if (!email) {
      setError("先输入管理员邮箱，再发送设密邮件。");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthCallbackUrl("/auth/reset-password?next=%2Fadmin-login"),
    });

    if (resetError) {
      setError(getReadableAuthErrorMessage(resetError.message));
      setIsSubmitting(false);
      return;
    }

    setMessage(`设密邮件已发送到 ${email}。请打开邮件完成密码设置，完成后回到 /admin-login 用新密码登录。`);
    setIsSubmitting(false);
  }

  return (
    <form className="auth-form admin-login-form" onSubmit={handleSubmit}>
      <label className="assistant-form__field">
        <span>管理员邮箱</span>
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="admin@example.com"
          autoComplete="email"
        />
      </label>

      <label className="assistant-form__field">
        <span>登录密码</span>
        <input
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="请输入管理员密码"
          autoComplete="current-password"
        />
      </label>

      <div className="auth-card__actions">
        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? "处理中..." : "进入后台"}
        </button>
        <button type="button" className="button button--ghost" disabled={isSubmitting} onClick={handleSendResetEmail}>
          没密码？发设密邮件
        </button>
        <Link href="/auth/reset-password?next=/admin-login" className="button button--ghost">
          去重置页
        </Link>
      </div>

      <p className="auth-card__hint">
        说明：这里只负责完成 Supabase 登录；真正进入后台时，服务端还会按 ADMIN_EMAILS 白名单再次校验。若这个管理员邮箱还没设过密码，直接填邮箱后点“没密码？发设密邮件”即可，不必再去 Supabase 后台手工操作。
      </p>

      {message ? <div className="form-status form-status--success">{message}</div> : null}
      {error ? <div className="form-status form-status--error">{error}</div> : null}
    </form>
  );
}
