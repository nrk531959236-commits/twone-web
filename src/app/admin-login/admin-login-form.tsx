"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getReadableAuthErrorMessage } from "@/lib/auth-error";
import { PASSWORD_SETUP_MIN_LENGTH } from "@/lib/password-setup";

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

export function AdminLoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [form, setForm] = useState<FormState>({ email: "", password: "", confirmPassword: "" });
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

  async function handleDirectPasswordSetup() {
    const email = form.email.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!email) {
      setError("先输入管理员邮箱，再站内设置密码。");
      setMessage(null);
      return;
    }

    if (!password) {
      setError("先输入准备设置的管理员密码。");
      setMessage(null);
      return;
    }

    if (password.length < PASSWORD_SETUP_MIN_LENGTH) {
      setError(`密码至少 ${PASSWORD_SETUP_MIN_LENGTH} 位。`);
      setMessage(null);
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。`".replace("`", ""));
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/admin-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ? getReadableAuthErrorMessage(payload.error) : "站内管理员设密失败，请稍后重试。");
        setIsSubmitting(false);
        return;
      }

      setMessage(payload?.message ?? `管理员密码已设置完成：${email}。现在可直接登录后台。`);
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch {
      setError("网络异常，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
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

      <label className="assistant-form__field">
        <span>确认密码（站内设密时使用）</span>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
          placeholder="再次输入准备设置的新密码"
          autoComplete="new-password"
        />
      </label>

      <div className="auth-card__actions">
        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? "处理中..." : "进入后台"}
        </button>
        <button type="button" className="button button--ghost" disabled={isSubmitting} onClick={handleDirectPasswordSetup}>
          站内设置 / 重设密码
        </button>
        <Link href="/auth/reset-password?next=/admin-login" className="button button--ghost">
          去邮件重置页（备用）
        </Link>
      </div>

      <p className="auth-card__hint">
        说明：这里默认支持两条路径。主路径是站内直接设置 / 重设管理员密码：仅对 ADMIN_EMAILS 白名单里的邮箱生效，会由服务端直接创建或更新对应 Supabase Auth 用户密码，不再依赖 recovery 邮件跳转。真正进入后台时，服务端仍会再按 ADMIN_EMAILS 白名单校验。邮件重置页只保留为备用方案。
      </p>

      {message ? <div className="form-status form-status--success">{message}</div> : null}
      {error ? <div className="form-status form-status--error">{error}</div> : null}
    </form>
  );
}
