import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getAssistantQuotaSummary } from "@/lib/assistant-quota";
import { getAssistantConversation } from "@/lib/assistant-history";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthStatus } from "@/app/auth/auth-status";
import { toAssistantQuotaView } from "@/lib/assistant/view";
import { AssistantChatShell } from "./assistant-chat-shell";
import { AssistantQuotaPanel } from "./assistant-quota-panel";
import { AssistantEntryCard } from "./assistant-entry-card";
import { getAuthCallbackErrorMessage } from "@/lib/auth-error";

function isMissingAuthSessionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AuthSessionMissingError" || /auth session missing/i.test(error.message);
}

export const metadata: Metadata = {
  title: "AI 助手 | Twone Web3.0 Community",
  description:
    "Twone 会员 AI 助手 V1：支持公开浏览、登录 + membership 双重校验、月度 AI 配额限制、未开通会员拦截，并预留后续等级扩展结构。",
};

const capabilityCards = [
  "文本问题输入、发送与对话记录展示",
  "已接入真实 AI 回复接口",
  "成功调用后服务端记录一次 AI 使用",
  "Supabase Auth 登录态 + memberships + 月度额度校验",
];

export default async function AssistantPage({
  searchParams,
}: {
  searchParams?: Promise<{ entry?: string; authError?: string }>;
}) {
  const quota = await getAssistantQuotaSummary();
  const membership = quota.membership;
  const conversation = await getAssistantConversation();
  const supabase = await createSupabaseServerClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const entryMode = resolvedSearchParams?.entry === "login" ? "login" : "assistant";
  const initialAuthError = getAuthCallbackErrorMessage(resolvedSearchParams?.authError ?? null);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && !isMissingAuthSessionError(userError)) {
    throw userError;
  }

  return (
    <main className="page-shell">
      <SiteHeader current="assistant" />

      <section className="section hero page-hero">
        <div className="hero__badge">AI Copilot · Members Only V1</div>
        <div className="section-heading assistant-heading">
          <div>
            <p className="eyebrow">把 AI 变成研究副驾驶，而不是又一个聊天窗口</p>
            <h1>AI 助手 V1</h1>
          </div>
          <p className="section__intro">
            这一版把最轻量可行的体验权限补齐：未登录可浏览、不可发送；已登录但未通过审核仍不可用；
            只有有效体验资格或会员资格且本月额度未耗尽才放行。当前默认审批会按登录邮箱发放 Free 体验版与 2 次 AI 对话，已接入真实 AI 后端接口，并在服务端同时校验 Supabase Auth 会话、
            memberships 状态与 assistant_usage 月度使用次数，并在用户首次用已获批邮箱登录时自动兑现资格。
          </p>
        </div>
      </section>

      <AssistantEntryCard
        membership={membership}
        entryMode={entryMode}
        canUseAssistant={quota.canUseAssistant}
      />

      <section className="assistant-layout">
        <div className="section assistant-chat" id="assistant-chat">
          <div className="assistant-chat__header">
            <div>
              <p className="section__label">Conversation</p>
              <h2>文本对话</h2>
            </div>
            <div className="assistant-chat__badge">
              <span className={`status-dot${quota.canUseAssistant ? "" : " status-dot--muted"}`} />
              {quota.canUseAssistant ? "AI Runtime Online" : "Quota Locked"}
            </div>
          </div>

          <AssistantChatShell
            isAuthenticated={membership.isAuthenticated}
            isMember={membership.isMember}
            isPending={membership.isPending}
            canUseAssistant={quota.canUseAssistant}
            gateMessage={membership.detail}
            initialSessionId={conversation.session?.id ?? null}
            initialMessages={conversation.messages}
            quota={toAssistantQuotaView(quota)}
            userEmail={user?.email ?? null}
          />
        </div>

        <aside className="assistant-sidebar">
          <AuthStatus
            initialUser={
              user
                ? {
                    id: user.id,
                    email: user.email ?? null,
                  }
                : null
            }
            initialMembership={membership}
            initialQuota={{
              monthlyQuota: quota.monthlyQuota,
              monthlyUsed: quota.monthlyUsed,
              monthlyRemaining: quota.monthlyRemaining,
              quotaMessage: quota.quotaMessage,
            }}
            initialAuthError={initialAuthError}
          />

          <section className="section card-glow sidebar-card">
            <p className="section__label">Membership Gate</p>
            <h2>会员权限提示</h2>
            <p>
              当前先开放文本对话体验。未登录用户可以查看页面和默认欢迎内容，但发送入口会锁定；
              已登录且申请仍在审核中的用户，会明确看到“你的申请正在审核中”与下一步说明；未申请用户会被明确引导去申请或使用已有账号登录；
              审核通过后默认按登录邮箱发放 Free 体验版与 2 次 AI 对话，用户未来首次用该邮箱登录后会自动生效；若本月次数耗尽，也会被前后端同时拦截。
            </p>
            <div className="membership-list">
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>未登录：可浏览 AI 助手页面，不可发送消息</span>
              </div>
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>已登录且申请审核中：页面会明确提示“你的申请正在审核中”，当前可浏览不可发送，无需重复提交</span>
              </div>
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>已登录但未申请或未获批：/assistant 与 /api/assistant 仍会拒绝发送；若已通过审核，请确认当前邮箱就是申请时填写的登录邮箱</span>
              </div>
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>已开通 Free 体验版但额度耗尽：页面会显示剩余 0 次，服务端返回 429</span>
              </div>
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>已开通 Free 体验版且额度充足：可正常发起文本对话与获取 AI 回复</span>
              </div>
            </div>
          </section>

          <section className="section sidebar-card" id="quota-panel">
            <p className="section__label">Usage</p>
            <h2>使用额度展示</h2>
            <AssistantQuotaPanel
              initialQuota={toAssistantQuotaView(quota)}
              initialCanUseAssistant={quota.canUseAssistant}
              membershipPlan={membership.plan || "free"}
              membershipActive={membership.isMember}
            />
          </section>

          <section className="section sidebar-card assistant-notes-card">
            <p className="section__label">Current Scope</p>
            <h2>这一版已经能做什么</h2>
            <div className="assistant-notes-list">
              {capabilityCards.map((item) => (
                <article key={item} className="assistant-note-item">
                  <span className="assistant-note-item__dot" />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
