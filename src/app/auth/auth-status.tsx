"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth";
import { getReadableAuthErrorMessage } from "@/lib/auth-error";

type LoginMode = "password" | "magic";

type AuthStatusUser = {
  id: string;
  email: string | null;
};

type MembershipView = {
  status: "guest" | "pending" | "inactive" | "active";
  isMember: boolean;
  isPending: boolean;
  message: string;
  detail: string;
  plan: string | null;
  expiresAt: string | null;
};

type QuotaView = {
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  quotaMessage: string;
};

type AuthStatusProps = {
  initialUser: AuthStatusUser | null;
  initialMembership: MembershipView;
  initialQuota: QuotaView;
  initialAuthError?: string | null;
};

function formatExpiry(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function AuthStatus({ initialUser, initialMembership, initialQuota, initialAuthError }: AuthStatusProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<AuthStatusUser | null>(initialUser);
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [membership, setMembership] = useState<MembershipView>(initialMembership);
  const [quota, setQuota] = useState<QuotaView>(initialQuota);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialAuthError ?? null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user
        ? {
            id: session.user.id,
            email: session.user.email ?? null,
          }
        : null;

      setUser(nextUser);
      setEmail(nextUser?.email ?? "");
      setPassword("");

      if (!nextUser) {
        setMembership({
          status: "guest",
          isMember: false,
          isPending: false,
          message: "未登录，仅可浏览。",
          detail: "请先登录申请时填写的邮箱；服务端会在登录态基础上继续校验资格状态，并自动兑现该邮箱已获批的资格。审核通过后默认发放 Free 体验版与 2 次 AI 对话。",
          plan: null,
          expiresAt: null,
        });
        setQuota({
          monthlyQuota: initialQuota.monthlyQuota,
          monthlyUsed: 0,
          monthlyRemaining: initialQuota.monthlyQuota,
          quotaMessage: "未登录状态下仅可浏览，登录后才会显示并消耗 AI 配额。默认 Free 体验版为 2 次。",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [initialQuota.monthlyQuota, supabase]);

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("先输入登录邮箱。");
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
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setError(getReadableAuthErrorMessage(signInError.message));
      setIsSubmitting(false);
      return;
    }

    setPassword("");
    setMessage("登录成功，正在刷新你的会员与额度状态...");
    window.location.href = "/assistant";
  }

  async function handleMagicLinkLogin() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("先输入邮箱，再发送登录链接。");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const redirectTo = getAuthCallbackUrl("/assistant");

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (signInError) {
      setError(getReadableAuthErrorMessage(signInError.message));
      setIsSubmitting(false);
      return;
    }

    setMessage(
      `备用登录链接已发送。打开邮箱点击链接后，会先进入 ${redirectTo}，然后自动回到 /assistant。\n如果你还没设置密码，或者临时忘了密码，可以先用这个方式进来。`,
    );
    setIsSubmitting(false);
  }

  async function handleSignOut() {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(getReadableAuthErrorMessage(signOutError.message));
      setIsSubmitting(false);
      return;
    }

    setUser(null);
    setPassword("");
    setMembership({
      status: "guest",
      isMember: false,
      isPending: false,
      message: "未登录，仅可浏览。",
      detail: "请先登录申请时填写的邮箱；服务端会在登录态基础上继续校验资格状态。审核通过后默认发放 Free 体验版与 2 次 AI 对话。",
      plan: null,
      expiresAt: null,
    });
    setQuota({
      monthlyQuota: initialQuota.monthlyQuota,
      monthlyUsed: 0,
      monthlyRemaining: initialQuota.monthlyQuota,
      quotaMessage: "未登录状态下仅可浏览，登录后才会显示并消耗 AI 配额。默认 Free 体验版为 2 次。",
    });
    setMessage("你已退出登录。现在可以浏览页面，但不能发送消息。");
    setIsSubmitting(false);
  }

  return user ? (
    <div className="auth-card auth-card--signed-in card-glow">
      <div className="auth-card__header">
        <div>
          <p className="section__label">Member Access</p>
          <h2>{membership.isMember ? "已登录且资格有效" : membership.isPending ? "已登录，你的申请正在审核中" : "已登录，但未开通体验资格"}</h2>
        </div>
        <span className="assistant-chat__badge">
          <span className={`status-dot${membership.isMember ? "" : " status-dot--muted"}`} />
          {membership.isMember ? "Access Active" : membership.isPending ? "Review Pending" : "Access Locked"}
        </span>
      </div>

      <p className="auth-card__text">
        当前登录身份：<strong>{user.email || "已验证会员"}</strong>
        <br />
        当前状态：<strong>{membership.message}</strong>
        {membership.plan ? (
          <>
            <br />
            当前方案：<strong>{membership.plan}</strong>
          </>
        ) : null}
        {membership.expiresAt ? (
          <>
            <br />
            到期时间：<strong>{formatExpiry(membership.expiresAt)}</strong>
          </>
        ) : null}
        <br />
        本月额度：<strong>{quota.monthlyRemaining}</strong> / {quota.monthlyQuota} 剩余
      </p>

      <div className="auth-card__actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={handleSignOut}
          disabled={isSubmitting}
        >
          {isSubmitting ? "处理中..." : "退出登录"}
        </button>
      </div>

      <div className={`form-status ${membership.isMember ? "form-status--success" : "assistant-gate-banner"}`}>
        {membership.detail}
      </div>
      {!membership.isMember ? (
        <div className="auth-password-help auth-password-help--inline">
          <strong>老用户提示</strong>
          <p>如果你以前一直靠邮箱登录链接，现在可以补一个密码。以后直接用邮箱 + 密码登录会更顺手。</p>
          <Link href="/auth/reset-password" className="text-link">
            去设置密码 / 忘记密码 →
          </Link>
        </div>
      ) : null}
      <div className="form-status form-status--success">{quota.quotaMessage}</div>

      {message ? <div className="form-status form-status--success">{message}</div> : null}
      {error ? <div className="form-status form-status--error">{error}</div> : null}
    </div>
  ) : (
    <div className="auth-card card-glow" id="member-login">
      <div className="auth-card__header">
        <div>
          <p className="section__label">Members Only</p>
          <h2>普通用户现在优先用邮箱 + 密码登录</h2>
        </div>
        <span className="assistant-chat__badge auth-card__badge auth-card__badge--locked">
          <span className="status-dot status-dot--muted" />
          Locked
        </span>
      </div>

      <p className="auth-card__text">
        /assistant 当前支持公开浏览，但发送能力仅对有效体验资格开放。未申请用户先走申请；已通过审核的用户，优先用申请时填写的邮箱 + 密码登录。
        登录后服务端会继续校验 memberships 状态与剩余 AI 配额；如果该邮箱已获得通过资格，系统也会在登录后自动兑现对应权益。默认会发放 Free 体验版与 2 次 AI 对话。
      </p>

      <div className="auth-login-mode-tabs" role="tablist" aria-label="登录方式选择">
        <button
          type="button"
          className={`auth-login-mode-tab${loginMode === "password" ? " auth-login-mode-tab--active" : ""}`}
          onClick={() => setLoginMode("password")}
        >
          密码登录
        </button>
        <button
          type="button"
          className={`auth-login-mode-tab${loginMode === "magic" ? " auth-login-mode-tab--active" : ""}`}
          onClick={() => setLoginMode("magic")}
        >
          邮箱链接备用
        </button>
      </div>

      <form className="auth-form" onSubmit={handlePasswordLogin}>
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

        {loginMode === "password" ? (
          <>
            <label className="assistant-form__field">
              <span>登录密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入你的登录密码"
                autoComplete="current-password"
              />
            </label>

            <div className="auth-card__actions">
              <button type="submit" className="button button--primary" disabled={isSubmitting}>
                {isSubmitting ? "登录中..." : "邮箱 + 密码登录"}
              </button>
              <Link href="/auth/reset-password" className="button button--ghost">
                设置密码 / 忘记密码
              </Link>
              <Link href="/apply" className="button button--ghost">
                我还没申请，先去申请 Free Trial
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="auth-password-help">
              <strong>备用方式</strong>
              <p>如果你还没来得及设置密码，或者临时忘了密码，也可以先收邮箱登录链接进来。</p>
            </div>

            <div className="auth-card__actions">
              <button
                type="button"
                className="button button--secondary"
                disabled={isSubmitting}
                onClick={handleMagicLinkLogin}
              >
                {isSubmitting ? "发送中..." : "发送邮箱登录链接"}
              </button>
              <Link href="/auth/reset-password" className="button button--ghost">
                我是老用户，去补密码
              </Link>
            </div>
          </>
        )}
      </form>

      <p className="auth-card__hint">
        现在主路径是邮箱 + 密码登录；magic link 继续保留为备用。无论你用哪种方式登录，系统都会继续按登录邮箱校验申请、审核、Free Trial、membership 与 AI 配额，不影响现有资格流程。
      </p>

      {message ? <div className="form-status form-status--success">{message}</div> : null}
      {error ? <div className="form-status form-status--error">{error}</div> : null}
    </div>
  );
}
