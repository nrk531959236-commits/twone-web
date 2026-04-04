"use client";

import Link from "next/link";
import { useState } from "react";
import { getReadableAuthErrorMessage } from "@/lib/auth-error";
import { PASSWORD_SETUP_MIN_LENGTH } from "@/lib/password-setup";

export function FirstPasswordForm({ token, presetEmail }: { token: string; presetEmail: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("缺少一次性设密 token，请让管理员重新生成链接。");
      setMessage(null);
      return;
    }

    if (!password) {
      setError("先输入登录密码。");
      setMessage(null);
      return;
    }

    if (password.length < PASSWORD_SETUP_MIN_LENGTH) {
      setError(`密码至少 ${PASSWORD_SETUP_MIN_LENGTH} 位。`);
      setMessage(null);
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/first-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ? getReadableAuthErrorMessage(payload.error) : "首次设密失败，请让管理员重新生成链接后再试。");
        setIsSubmitting(false);
        return;
      }

      setMessage(payload?.message ?? "密码已设置完成。现在可以直接去登录页，用邮箱 + 密码登录。");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("网络异常，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section auth-reset-card card-glow">
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="assistant-form__field">
          <span>登录邮箱</span>
          <input type="email" value={presetEmail} readOnly placeholder="由管理员生成链接时自动带入" />
        </label>

        <label className="assistant-form__field">
          <span>新密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`至少 ${PASSWORD_SETUP_MIN_LENGTH} 位`}
            autoComplete="new-password"
          />
        </label>

        <label className="assistant-form__field">
          <span>确认新密码</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="再输入一次"
            autoComplete="new-password"
          />
        </label>

        <div className="auth-card__actions">
          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存并启用密码登录"}
          </button>
          <Link href="/assistant?entry=login" className="button button--ghost">
            去登录页
          </Link>
        </div>
      </form>

      <div className="auth-reset-help">
        <div className="auth-reset-help__item">
          <strong>适合谁用</strong>
          <p>已经通过审核、管理员已为你生成一次性网页内设密链接的测试用户。</p>
        </div>
        <div className="auth-reset-help__item">
          <strong>安全边界</strong>
          <p>必须持有管理员生成的受控 token 才能设密码；token 只存哈希、24 小时过期、使用后立即作废。</p>
        </div>
      </div>

      {message ? <div className="form-status form-status--success">{message}</div> : null}
      {error ? <div className="form-status form-status--error">{error}</div> : null}
    </section>
  );
}
