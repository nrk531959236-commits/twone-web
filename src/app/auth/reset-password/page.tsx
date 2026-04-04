"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth";
import { getReadableAuthErrorMessage } from "@/lib/auth-error";

type ResetMode = "request" | "update";

function detectModeFromHash() {
  if (typeof window === "undefined") {
    return "request" satisfies ResetMode;
  }

  const hash = window.location.hash.toLowerCase();

  if (hash.includes("type=recovery") || hash.includes("access_token=")) {
    return "update" satisfies ResetMode;
  }

  return "request" satisfies ResetMode;
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode] = useState<ResetMode>(detectModeFromHash);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("先输入你的登录邮箱。\n如果你是老用户，也请填之前申请或使用过的邮箱。");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const redirectTo = getAuthCallbackUrl("/auth/reset-password");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (resetError) {
      setError(getReadableAuthErrorMessage(resetError.message));
      setIsSubmitting(false);
      return;
    }

    setMessage(
      `设置密码邮件已发送到 ${normalizedEmail}。\n请打开邮件里的链接完成设置；设置完成后，就可以回到 AI 助手页直接用邮箱 + 密码登录。`,
    );
    setIsSubmitting(false);
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password) {
      setError("先输入新密码。");
      setMessage(null);
      return;
    }

    if (password.length < 6) {
      setError("新密码至少 6 位，方便测试也别太短。");
      setMessage(null);
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的新密码不一致，请重新确认。");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(getReadableAuthErrorMessage(updateError.message));
      setIsSubmitting(false);
      return;
    }

    setMessage("密码已设置完成。现在可以直接回 AI 助手页，用邮箱 + 密码登录。\n如果你当前已登录，也可以直接继续使用。");
    setIsSubmitting(false);
  }

  return (
    <main className="page-shell">
      <section className="section hero page-hero">
        <div className="hero__badge">Password Setup / Recovery</div>
        <div className="section-heading assistant-heading">
          <div>
            <p className="eyebrow">给普通测试用户一个顺手的补密码入口</p>
            <h1>{mode === "update" ? "设置你的新密码" : "设置密码 / 忘记密码"}</h1>
          </div>
          <p className="section__intro">
            {mode === "update"
              ? "你已经通过邮件验证，可以直接设置新密码。设置完成后，后续登录优先使用邮箱 + 密码；magic link 仍保留为备用。"
              : "如果你以前一直用邮箱登录链接，或者忘了密码，可以在这里补密码。填入你的邮箱后，系统会发送一封设置密码邮件给你。"}
          </p>
        </div>
      </section>

      <section className="section auth-reset-card card-glow">
        {mode === "update" ? (
          <form className="auth-form" onSubmit={handleUpdatePassword}>
            <label className="assistant-form__field">
              <span>新密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
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
                {isSubmitting ? "保存中..." : "保存新密码"}
              </button>
              <Link href="/assistant?entry=login" className="button button--ghost">
                返回登录页
              </Link>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRequestReset}>
            <label className="assistant-form__field">
              <span>登录邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </label>

            <div className="auth-card__actions">
              <button type="submit" className="button button--primary" disabled={isSubmitting}>
                {isSubmitting ? "发送中..." : "发送设置密码邮件"}
              </button>
              <Link href="/assistant?entry=login" className="button button--ghost">
                返回登录页
              </Link>
            </div>
          </form>
        )}

        <div className="auth-reset-help">
          <div className="auth-reset-help__item">
            <strong>适合谁用</strong>
            <p>老用户以前只用 magic link 登录，想补一个固定密码；或者你单纯忘了密码。</p>
          </div>
          <div className="auth-reset-help__item">
            <strong>设置后怎么登录</strong>
            <p>以后直接去 AI 助手页，输入邮箱 + 密码登录即可；收邮件链接不再是主路径。</p>
          </div>
        </div>

        {message ? <div className="form-status form-status--success">{message}</div> : null}
        {error ? <div className="form-status form-status--error">{error}</div> : null}
      </section>
    </main>
  );
}
