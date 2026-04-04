"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth";
import { getReadableAuthErrorMessage } from "@/lib/auth-error";
import { PASSWORD_SETUP_MIN_LENGTH } from "@/lib/password-setup";

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

type FirstActivationView = {
  status: "none" | "required" | "completed";
  email: string | null;
  plan: string | null;
  assistantMonthlyQuota: number | null;
  source: "guest_email_approval" | "user_email_approval" | "inactive_user" | null;
  reason: string | null;
} | null;

type AuthStatusProps = {
  initialUser: AuthStatusUser | null;
  initialMembership: MembershipView;
  initialFirstActivation: FirstActivationView;
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

export function AuthStatus({
  initialUser,
  initialMembership,
  initialFirstActivation,
  initialQuota,
  initialAuthError,
}: AuthStatusProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<AuthStatusUser | null>(initialUser);
  const [email, setEmail] = useState(initialUser?.email ?? initialFirstActivation?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [membership, setMembership] = useState<MembershipView>(initialMembership);
  const [firstActivation, setFirstActivation] = useState<FirstActivationView>(initialFirstActivation);
  const [quota, setQuota] = useState<QuotaView>(initialQuota);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingActivation, setIsCheckingActivation] = useState(false);
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
      setConfirmPassword("");

      if (!nextUser) {
        setMembership({
          status: "guest",
          isMember: false,
          isPending: false,
          message: "未登录，仅可浏览。",
          detail: "请先输入申请时填写的邮箱；如果该邮箱对应申请已通过，但你还没完成激活，系统会直接在这里切到首次设置密码表单。激活完成后会立即登录，并自动兑现该邮箱已获批的资格。",
          plan: null,
          expiresAt: null,
        });
        setQuota({
          monthlyQuota: initialQuota.monthlyQuota,
          monthlyUsed: 0,
          monthlyRemaining: initialQuota.monthlyQuota,
          quotaMessage: "未登录状态下仅可浏览，登录后才会显示并消耗 AI 配额。默认 Free 体验版为 2 次。",
        });
        setFirstActivation(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [initialQuota.monthlyQuota, supabase]);

  async function checkActivationStatus(nextEmail?: string) {
    const normalizedEmail = (nextEmail ?? email).trim().toLowerCase();

    if (!normalizedEmail) {
      setFirstActivation(null);
      return null;
    }

    setIsCheckingActivation(true);

    try {
      const response = await fetch("/api/auth/activation-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = (await response.json().catch(() => null)) as { activation?: FirstActivationView; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "检测首次激活状态失败，请稍后重试。");
        return null;
      }

      const activation = payload?.activation ?? null;
      setFirstActivation(activation);
      return activation;
    } finally {
      setIsCheckingActivation(false);
    }
  }

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("先输入登录邮箱。");
      setMessage(null);
      return;
    }

    const activation = await checkActivationStatus(normalizedEmail);

    if (activation?.status === "required") {
      setError(null);
      setMessage("该邮箱已通过审核，但还没完成首次激活。请直接在下方设置密码，完成后会自动登录。");
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
    setConfirmPassword("");
    setMessage("登录成功，正在刷新你的会员与额度状态...");
    window.location.href = "/assistant";
  }

  async function handleInlineActivation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = (firstActivation?.email ?? email).trim();

    if (!normalizedEmail) {
      setError("先输入申请时填写的邮箱。");
      setMessage(null);
      return;
    }

    if (!password) {
      setError("先输入你要设置的密码。");
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
      const activateResponse = await fetch("/api/auth/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const activatePayload = (await activateResponse.json().catch(() => null)) as { message?: string; error?: string } | null;

      if (!activateResponse.ok) {
        setError(activatePayload?.error ?? "首次激活失败，请稍后再试。");
        setIsSubmitting(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(`首次激活已完成，但自动登录失败：${getReadableAuthErrorMessage(signInError.message)}。请立刻用刚设置的密码手动登录。`);
        setMessage(null);
        setIsSubmitting(false);
        return;
      }

      setMessage(activatePayload?.message ?? "首次激活完成，正在进入 AI 助手...");
      setPassword("");
      setConfirmPassword("");
      window.location.href = "/assistant";
    } catch {
      setError("网络异常，请稍后重试。");
      setIsSubmitting(false);
      return;
    }
  }

  async function handleMagicLinkLogin() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("先输入邮箱，再发送登录链接。");
      setMessage(null);
      return;
    }

    const activation = await checkActivationStatus(normalizedEmail);

    if (activation?.status === "required") {
      setError(null);
      setMessage("该邮箱已通过审核，但还没完成首次激活。主路径已切到站内首次设置密码；不建议继续走邮件链接。请直接在下方完成首次激活。");
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
      `备用登录链接已发送。打开邮箱点击链接后，会先进入 ${redirectTo}，然后自动回到 /assistant。`,
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
    setConfirmPassword("");
    setFirstActivation(null);
    setMembership({
      status: "guest",
      isMember: false,
      isPending: false,
      message: "未登录，仅可浏览。",
      detail: "请先输入申请时填写的邮箱；如果该邮箱已通过审核但还没激活，系统会直接显示首次设置密码表单。",
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

  const showInlineActivation = !user && firstActivation?.status === "required";

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
          <h2>{showInlineActivation ? "该邮箱已通过审核，直接完成首次激活" : "普通用户现在优先用邮箱登录"}</h2>
        </div>
        <span className="assistant-chat__badge auth-card__badge auth-card__badge--locked">
          <span className="status-dot status-dot--muted" />
          {showInlineActivation ? "Activation Required" : "Locked"}
        </span>
      </div>

      <p className="auth-card__text">
        {showInlineActivation
          ? `系统已识别到 ${firstActivation?.email ?? "该邮箱"} 对应申请已审核通过，但你还没完成首次激活。现在主路径不再是管理员生成网页内链接，也不再优先依赖邮件。你直接在这里设置密码，提交后系统会在服务端创建或绑定 Supabase Auth 用户，并立刻为你完成登录。`
          : "/assistant 当前支持公开浏览，但发送能力仅对有效体验资格开放。未申请用户先走申请；已通过审核的用户，先输入申请时填写的邮箱。系统会自动判断你该直接登录，还是先在站内完成首次设置密码。登录后服务端会继续校验 memberships 状态与剩余 AI 配额；如果该邮箱已获得通过资格，系统也会自动兑现对应权益。默认会发放 Free 体验版与 2 次 AI 对话。"}
      </p>

      {!showInlineActivation ? (
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
      ) : null}

      {showInlineActivation ? (
        <form className="auth-form" onSubmit={handleInlineActivation}>
          <label className="assistant-form__field">
            <span>申请邮箱</span>
            <input type="email" value={firstActivation?.email ?? email} readOnly autoComplete="email" />
          </label>

          <label className="assistant-form__field">
            <span>首次设置密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={`至少 ${PASSWORD_SETUP_MIN_LENGTH} 位`}
              autoComplete="new-password"
            />
          </label>

          <label className="assistant-form__field">
            <span>确认密码</span>
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
              {isSubmitting ? "激活中..." : "设置密码并立即登录"}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setFirstActivation(null)} disabled={isSubmitting}>
              换个邮箱
            </button>
          </div>

          <div className="auth-password-help auth-password-help--inline">
            <strong>你会得到什么</strong>
            <p>
              激活完成后，会立即进入已登录状态，并自动绑定你这条已通过的资格
              {firstActivation?.plan ? `（当前方案：${firstActivation.plan}` : ""}
              {typeof firstActivation?.assistantMonthlyQuota === "number" ? `，AI 月额度：${firstActivation.assistantMonthlyQuota} 次` : ""}
              {firstActivation?.plan ? "）" : ""}。
            </p>
          </div>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handlePasswordLogin}>
          <label className="assistant-form__field">
            <span>登录邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => {
                if (email.trim()) {
                  void checkActivationStatus(email);
                }
              }}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </label>

          {firstActivation?.status === "required" ? (
            <div className="assistant-gate-banner">
              {firstActivation.reason ?? "该邮箱已审核通过，但还没完成首次激活。继续下方流程设置密码即可。"}
              <div className="auth-card__actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    setMessage("请直接在下方完成首次激活。");
                    setLoginMode("password");
                  }}
                >
                  我知道了，继续首次激活
                </button>
              </div>
            </div>
          ) : null}

          {loginMode === "password" ? (
            <>
              <label className="assistant-form__field">
                <span>登录密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入你的登录密码；若你是新/老已通过用户但还没激活，先输邮箱即可自动进入首次设密"
                  autoComplete="current-password"
                />
              </label>

              <div className="auth-card__actions">
                <button type="submit" className="button button--primary" disabled={isSubmitting || isCheckingActivation}>
                  {isSubmitting ? "登录中..." : isCheckingActivation ? "检查中..." : "继续"}
                </button>
                <Link href="/auth/reset-password" className="button button--ghost">
                  忘记密码 / 邮件重置
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
                <p>只有在你已完成激活但临时忘记密码时，才建议继续用邮箱链接。对已通过但未激活的新老用户，主路径现在都是站内首次设置密码。</p>
              </div>

              <div className="auth-card__actions">
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={isSubmitting || isCheckingActivation}
                  onClick={handleMagicLinkLogin}
                >
                  {isSubmitting ? "发送中..." : isCheckingActivation ? "检查中..." : "发送邮箱登录链接"}
                </button>
                <Link href="/auth/reset-password" className="button button--ghost">
                  我是老用户，去补密码
                </Link>
              </div>
            </>
          )}
        </form>
      )}

      <p className="auth-card__hint">
        现在主路径已经改成：先识别申请邮箱状态；如果该邮箱对应申请已 approved 但还没完成激活，页面会直接切到“首次设置密码”表单。提交后服务端会创建或绑定 Supabase Auth 用户、设置密码，再由前端立刻用这组邮箱 + 密码完成登录。邮件链接与旧的一次性网页内设密链接仍可保留为备用，但不再是主路径。
      </p>

      {message ? <div className="form-status form-status--success">{message}</div> : null}
      {error ? <div className="form-status form-status--error">{error}</div> : null}
    </div>
  );
}
