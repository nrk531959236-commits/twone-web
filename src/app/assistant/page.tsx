import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AssistantIcon } from "@/components/section-icons";
import { getAssistantQuotaSummary } from "@/lib/assistant-quota";
import { getAssistantConversation } from "@/lib/assistant-history";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthStatus } from "@/app/auth/auth-status";
import { toAssistantQuotaView } from "@/lib/assistant/view";
import { AssistantChatShell } from "./assistant-chat-shell";
import { AssistantQuotaPanel } from "./assistant-quota-panel";
import { AssistantEntryCard } from "./assistant-entry-card";
import { getAuthCallbackErrorMessage } from "@/lib/auth-error";
import { getFirstActivationContextForCurrentVisitor } from "@/lib/first-activation";

function isMissingAuthSessionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AuthSessionMissingError" || /auth session missing/i.test(error.message);
}

export const metadata: Metadata = {
  title: "BTC AI 助手 | Twone Web3.0 Community",
  description:
    "Twone BTC AI 助手 V1：BTC 优先、固定分析模板、登录 + membership 双重校验、月度 AI 配额限制。",
};

const capabilityCards = [
  "BTC 优先固定分析入口",
  "固定输出模板：结构 / OB / POC / OI / VWAP / CVD / Delta / MACD / RSI / 确认位 / 否定位",
  "缺实时数据时自动切到诚实的结构化 fallback",
  "成功调用后服务端记录一次 AI 使用",
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

  const firstActivation = user ? await getFirstActivationContextForCurrentVisitor(user) : null;

  return (
    <main className="page-shell">
      <SiteHeader current="assistant" />

      <section className="section hero page-hero">
        <div className="hero__badge">AI Copilot · Members Only V1</div>
        <div className="section-heading assistant-heading">
          <div>
            <p className="eyebrow">把 AI 收口成固定 BTC 分析入口，而不是继续开放闲聊</p>
            <h1>
              <span className="page-heading-with-icon">
                <AssistantIcon className="page-heading-icon" />
                BTC AI 助手 V1
              </span>
            </h1>
          </div>
          <p className="section__intro">
            这一版把 BTC 固定分析明确设为默认主入口：普通 / 免费用户也能正常使用，不需要先开 Pro / VIP。Pro / VIP 不是“才有助手可用”，而是在固定分析主入口之外，额外开放自由输入与连续追问。若当前页没有实时行情源，会直接诚实标注缺失，并给出结构化 fallback，而不是假装有数据。
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
              <p className="section__label">BTC Analysis</p>
              <h2>默认固定分析主入口 / Pro-VIP 额外自由输入</h2>
            </div>
            <div className="assistant-chat__badge">
              <span className={`status-dot${quota.canUseAssistant ? "" : " status-dot--muted"}`} />
              {quota.canUseAssistant ? "BTC Brain Online" : "Quota Locked"}
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
             initialFirstActivation={firstActivation}
             initialQuota={{
               monthlyQuota: quota.monthlyQuota,
               monthlyUsed: quota.monthlyUsed,
               monthlyRemaining: quota.monthlyRemaining,
               quotaMessage: quota.quotaMessage,
             }}
             initialAuthError={initialAuthError}
          />

          <section className="section card-glow sidebar-card">
            <p className="section__label">BTC Scope</p>
            <h2>
              <span className="section-title-with-icon">
                <AssistantIcon className="section-title-icon" />
                当前分析边界
              </span>
            </h2>
            <p>
              当前主界面已经明确分层：所有可用用户先走 BTC 固定分析主入口，选级别、发起分析、看确认位与否定位；Pro / VIP 只是在这个默认主入口基础上额外开放自由输入。如果你补充持仓、关键价位、预期方向，输出会更贴近实战；如果没补数据，系统会老实告诉你哪些字段暂时缺失。
            </p>
            <div className="membership-list">
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>默认先分析 BTC，再决定是否扩到 ETH / 山寨 / watchlist</span>
              </div>
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>输出模板固定：级别、现价/24h高低/24h涨跌、结构、OB、POC、OI、VWAP、CVD/Delta、MACD、RSI、确认位、否定位、我的判断</span>
              </div>
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>没有实时数据时不伪造价格和指标，只给结构化 fallback</span>
              </div>
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>确认位和否定位是强制输出字段，不给模糊判断</span>
              </div>
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>整体语气保持中文、简洁、交易导向，不做喊单式表达</span>
              </div>
              <div className="membership-list__item">
                <span className="membership-list__icon">✦</span>
                <span>普通 / 免费用户正常使用固定分析主入口；Pro / VIP 额外开放自由输入</span>
              </div>
            </div>
          </section>

          <section className="section sidebar-card" id="quota-panel">
            <p className="section__label">Usage</p>
            <h2>分析调用额度</h2>
            <AssistantQuotaPanel
              initialQuota={toAssistantQuotaView(quota)}
              initialCanUseAssistant={quota.canUseAssistant}
              membershipPlan={membership.plan || "free"}
              membershipActive={membership.isMember}
            />
          </section>

          <section className="section sidebar-card assistant-notes-card">
            <p className="section__label">Current Scope</p>
            <h2>
              <span className="section-title-with-icon">
                <AssistantIcon className="section-title-icon" />
                这一版 BTC 脑子已经能做什么
              </span>
            </h2>
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
