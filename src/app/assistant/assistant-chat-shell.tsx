"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAssistantReply, fetchAssistantQuota } from "@/lib/assistant/runtime";
import type { AssistantQuotaView, ChatMessage } from "@/lib/assistant/types";

type AssistantChatShellProps = {
  isAuthenticated: boolean;
  isMember: boolean;
  isPending: boolean;
  canUseAssistant: boolean;
  gateMessage: string;
  initialSessionId?: string | null;
  initialMessages?: ChatMessage[];
  quota: AssistantQuotaView;
  userEmail?: string | null;
};

const FREE_CHAT_PLANS = new Set(["pro", "vip"]);

function extractMembershipPlanFromMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("vip")) return "vip";
  if (normalized.includes("pro")) return "pro";
  if (normalized.includes("free")) return "free";
  return null;
}

const starterMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    title: "Twone BTC Assistant",
    content:
      "默认入口已切到 BTC 固定分析。直接选级别并发送，我会按固定模板输出：级别、现价/24h高低/24h涨跌、结构、OB、POC、OI、VWAP、CVD/Delta、MACD、RSI、确认位、否定位、我的判断。若当前没有实时数据，我会明确说明缺口，并给出结构化 fallback。",
    createdAt: new Date().toISOString(),
  },
];

const taskSuggestions = [
  "BTC 15M 快速节奏",
  "BTC 1H 结构判断",
  "BTC 4H 主交易计划",
  "BTC 1D 大级别方向",
];

const levelOptions = ["15M", "1H", "4H", "1D"] as const;

function dispatchQuotaUpdated(quota: AssistantQuotaView, isAuthenticated: boolean, isMember: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("assistant-quota-updated", {
      detail: {
        quota,
        canUseAssistant: isAuthenticated && isMember && quota.monthlyRemaining > 0,
      },
    }),
  );
}

export function AssistantChatShell({
  isAuthenticated,
  isMember,
  isPending,
  canUseAssistant: initialCanUseAssistant,
  gateMessage,
  initialSessionId,
  initialMessages,
  quota: initialQuota,
  userEmail,
}: AssistantChatShellProps) {
  const inferredPlan = extractMembershipPlanFromMessage(gateMessage);
  const canUseFreeChat = inferredPlan ? FREE_CHAT_PLANS.has(inferredPlan) : false;
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages?.length ? initialMessages : starterMessages);
  const [input, setInput] = useState("");
  const [quota, setQuota] = useState<AssistantQuotaView>(initialQuota);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuotaRefreshing, setIsQuotaRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<(typeof levelOptions)[number]>("4H");
  const [selectedTask, setSelectedTask] = useState("主交易计划");
  const formRef = useRef<HTMLFormElement | null>(null);

  const canUseAssistant = isAuthenticated && isMember && quota.monthlyRemaining > 0 && initialCanUseAssistant;

  const refreshQuota = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsQuotaRefreshing(true);

    try {
      const latestQuota = await fetchAssistantQuota();
      setQuota(latestQuota);
      dispatchQuotaUpdated(latestQuota, isAuthenticated, isMember);
    } catch {
      // 保留当前 quota，不打断对话流程
    } finally {
      setIsQuotaRefreshing(false);
    }
  }, [isAuthenticated, isMember]);

  useEffect(() => {
    setQuota(initialQuota);
    dispatchQuotaUpdated(initialQuota, isAuthenticated, isMember);
  }, [initialQuota, isAuthenticated, isMember]);

  const canSend = useMemo(() => {
    if (!(isAuthenticated && isMember && canUseAssistant) || isLoading) {
      return false;
    }

    if (canUseFreeChat) {
      return input.trim().length > 0;
    }

    return true;
  }, [canUseAssistant, canUseFreeChat, input, isAuthenticated, isLoading, isMember]);

  const fixedModePrompt = `请按固定模板分析 BTC ${selectedLevel} ${selectedTask}，如果没有实时数据就诚实标注缺失，并给我结构化 fallback。`;
  const inputDisabled = !isMember || quota.monthlyRemaining <= 0 || isLoading;

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!isAuthenticated || !isMember) {
      setError(gateMessage);
      return;
    }

    if (!canUseAssistant || quota.monthlyRemaining <= 0) {
      setError(quota.quotaMessage || "本月 AI 对话额度已用尽，请下月重置后再试。");
      return;
    }

    const manualInput = input.trim();
    const content = canUseFreeChat ? manualInput : fixedModePrompt;
    if ((!content && canUseFreeChat) || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      title: userEmail || "Member",
      content,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const result = await createAssistantReply({
        message: content,
        history: nextMessages,
        sessionId,
      });

      setMessages((prev) => [...prev, result.message]);
      if (result.sessionId) {
        setSessionId(result.sessionId);
      }
      if (result.quota) {
        setQuota(result.quota);
        dispatchQuotaUpdated(result.quota, isAuthenticated, isMember);
      }

      await refreshQuota();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "当前回复服务暂时不可用，请稍后再试。";

      setError(message);
      await refreshQuota();
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  function applySuggestion(value: string) {
    const matchedLevel = levelOptions.find((level) => value.includes(level));
    const nextTask = value.replace(/^BTC\s+\S+\s+/, "");

    if (matchedLevel) {
      setSelectedLevel(matchedLevel);
    }

    setSelectedTask(nextTask || "主交易计划");
    setInput(`补充上下文：${value}，重点写确认位、否定位和我的判断。`);
    setError(null);
    formRef.current?.querySelector("textarea")?.focus();
  }

  function applyPresetTask(task: string) {
    const matchedLevel = levelOptions.find((level) => task.includes(level));
    if (matchedLevel) {
      setSelectedLevel(matchedLevel);
    }
    setSelectedTask(task.replace(/^BTC\s+\S+\s+/, "") || "主交易计划");
    setError(null);
    setInput("");
  }

  return (
    <>
      <div className="chat-thread card-glow" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`chat-bubble chat-bubble--${message.role}`}>
            <span className="chat-bubble__role">{message.title}</span>
            <p>{message.content}</p>
          </article>
        ))}

        {isLoading ? (
          <article className="chat-bubble chat-bubble--assistant chat-bubble--loading">
            <span className="chat-bubble__role">Twone AI Assistant</span>
            <div className="typing-indicator" aria-label="AI 正在思考">
              <span />
              <span />
              <span />
            </div>
          </article>
        ) : null}
      </div>

      <div className="assistant-input card-glow">
        <section className="assistant-composer-overview">
          <article className="assistant-overview-card assistant-overview-card--primary">
            <div className="assistant-overview-card__top">
              <div>
                <span className="section__label">当前发送方式</span>
                <strong>默认走 BTC 固定分析入口</strong>
              </div>
              <span className="assistant-mode-card__tag">{canUseFreeChat ? "固定入口 + 自由输入" : "固定入口优先"}</span>
            </div>
            <p>
              旧的“随便发一句就试试看”逻辑已经收掉。现在普通 / 免费用户点击发送时，会直接按上面选定的级别与任务触发固定 BTC 分析；输入框只作为补充仓位、关键位、预期方向的上下文。Pro / VIP 才额外开放真正的自由输入与连续追问。
            </p>
            <div className="assistant-overview-metrics">
              <article>
                <span>当前级别</span>
                <strong>{selectedLevel}</strong>
              </article>
              <article>
                <span>当前任务</span>
                <strong>{selectedTask}</strong>
              </article>
              <article>
                <span>发送口径</span>
                <strong>{canUseFreeChat ? "可自由输入" : "固定模板"}</strong>
              </article>
            </div>
          </article>

          <article className="assistant-overview-card assistant-overview-card--secondary">
            <span className="section__label">权限表达</span>
            <ul className="assistant-overview-list">
              <li>未登录：可浏览，不可发。</li>
              <li>已登录待审核：继续只读，等审核完成。</li>
              <li>Free / 普通可用用户：默认固定 BTC 分析入口。</li>
              <li>Pro / VIP：在固定入口上额外开放自由输入。</li>
            </ul>
          </article>
        </section>
        {!isMember ? (
          <div className="form-status assistant-gate-banner" role="status">
            <div className="assistant-gate-banner__content">
              <p>{gateMessage}</p>
              <div className="assistant-gate-banner__actions">
                {!isAuthenticated ? (
                  <>
                    <Link href="#member-login" className="button button--secondary">
                      已有账号，先登录
                    </Link>
                    <Link href="/apply" className="button button--ghost">
                      还没申请，去申请
                    </Link>
                  </>
                ) : isPending ? (
                  <>
                    <Link href="#member-login" className="button button--secondary">
                      保持当前邮箱登录
                    </Link>
                    <Link href="/apply/success" className="button button--ghost">
                      查看审核说明
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/apply" className="button button--secondary">
                      去提交申请
                    </Link>
                    <Link href="#member-login" className="button button--ghost">
                      换已有会员账号登录
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="quota-inline-card">
          <div>
            <span className="section__label">Quota</span>
            <strong>
              本月剩余 {quota.monthlyRemaining} / {quota.monthlyQuota}
            </strong>
          </div>
          <p>{quota.quotaMessage}</p>
          {isAuthenticated && isMember ? (
            <p className="assistant-history-hint">
              {sessionId ? "当前会话历史已保存，刷新后会自动恢复。" : "发送第一条消息后，将自动创建并保存当前会话。"}
              {isQuotaRefreshing ? " 正在同步最新额度..." : ""}
            </p>
          ) : null}
        </div>

        <section className="assistant-mode-card assistant-mode-card--default">
          <div className="assistant-mode-card__header">
            <div>
              <span className="section__label">默认主入口</span>
              <strong>BTC 固定分析模式</strong>
            </div>
            <span className="assistant-mode-card__tag">所有可用用户</span>
          </div>
          <p>
            这是当前 AI 助手对所有可用用户开放的默认主入口。直接选级别并发送，重点输出结构、关键位、确认位、否定位和交易计划；普通 / 免费用户也能正常使用，不需要先升级到 Pro / VIP。
          </p>
          <div className="assistant-levels">
            {levelOptions.map((level) => (
              <button
                key={level}
                type="button"
                className={`suggestion-chip${selectedLevel === level ? " suggestion-chip--active" : ""}`}
                onClick={() => setSelectedLevel(level)}
                disabled={isLoading}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="assistant-suggestions">
            {taskSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                className="suggestion-chip"
                onClick={() => {
                  applyPresetTask(item);
                  applySuggestion(item);
                }}
                disabled={isLoading}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="assistant-prompt-preview">
            <span className="section__label">本次固定发送内容</span>
            <p>{fixedModePrompt}</p>
          </div>
        </section>

        <section className="assistant-mode-card assistant-mode-card--pro">
          <div className="assistant-mode-card__header">
            <div>
              <span className="section__label">额外开放</span>
              <strong>自由输入模式</strong>
            </div>
            <span className="assistant-mode-card__tag">仅 Pro / VIP</span>
          </div>
          <p>
            Pro / VIP 额外开放自由输入，可直接提问、连续追问，或补充方向、持仓、关键位与交易计划；但 BTC 固定分析模式仍然保留，并且仍是默认主入口。
          </p>
        </section>

        <form ref={formRef} className="assistant-form" onSubmit={handleSubmit}>
          {!canUseFreeChat && isMember ? (
            <div className="assistant-fixed-mode-tip">
              你当前直接使用上方 BTC 固定分析主入口即可；这是普通 / 免费用户默认可用的主入口，自由输入模式仅对 Pro / VIP 额外开放。
            </div>
          ) : null}
          <label className="assistant-form__field">
            <span className="sr-only">输入你的问题</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isMember
                  ? isAuthenticated
                    ? isPending
                      ? "你的申请正在审核中。当前可浏览，不可发送；请等待审核完成，并继续使用申请时填写的同一邮箱登录。"
                      : "已登录，但当前账号还未开通体验资格。若你已通过审核，请确认当前登录的是申请时填写的邮箱。"
                    : "未登录状态下可浏览，不可发送。先用申请时填写的登录邮箱登录后再提问。"
                  : quota.monthlyRemaining > 0
                    ? canUseFreeChat
                      ? "你当前额外开放自由输入模式，可直接提问，也可以继续使用上方 BTC 固定分析主入口。"
                      : `这里不再承担旧的自由发送逻辑。点击发送时会直接触发：BTC ${selectedLevel} ${selectedTask} 固定分析。你也可以在这里补充方向、关键位或持仓上下文。`
                    : "本月 Free 体验版 AI 对话额度已用尽，请等待下月重置后再试。"
              }
              rows={4}
              disabled={inputDisabled}
            />
          </label>

          <div className="assistant-form__footer">
            <p>
              {isMember
                ? quota.monthlyRemaining > 0
                  ? canUseFreeChat
                    ? "Enter 发送，Shift + Enter 换行。你当前额外开放自由输入模式，同时仍可继续使用固定 BTC 分析主入口。成功调用一次后会在服务端记录并扣减当月 AI 次数。"
                    : `普通 / 免费用户默认使用固定分析主入口，不填也能直接触发 BTC ${selectedLevel} ${selectedTask} 固定分析。成功调用一次后会在服务端记录并扣减当月 AI 次数。默认 Free 体验版为 2 次。`
                  : "当前资格有效，但本月 AI 配额已经用完。/api/assistant 会在服务端直接拒绝。"
                : isAuthenticated
                  ? isPending
                    ? "你的申请正在审核中。当前阶段可浏览页面，但不能发送消息；审核通过后继续使用同一邮箱登录即可自动生效。"
                    : "当前账号已登录，但没有有效体验资格。/api/assistant 会在服务端直接拒绝。"
                  : "当前为只读浏览模式。真正的发送权限由 /api/assistant 在服务端校验，未登录会直接拒绝。"}
            </p>
            <button type="submit" className="button button--primary" disabled={!canSend}>
              {isLoading
                ? "发送中..."
                : !isMember
                  ? isAuthenticated
                    ? isPending
                      ? "审核中，暂不可发送"
                      : "审核通过后可发送"
                    : "登录后可发送"
                  : quota.monthlyRemaining > 0
                    ? canUseFreeChat
                      ? "发送问题"
                      : "发送 BTC 固定分析"
                    : "本月额度已用尽"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="form-status assistant-inline-notice" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </>
  );
}
