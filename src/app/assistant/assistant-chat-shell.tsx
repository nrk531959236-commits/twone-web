"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAssistantReply, fetchAssistantQuota } from "@/lib/assistant/runtime";
import type { AssistantQuotaView, ChatMessage } from "@/lib/assistant/types";

type AssistantChatShellProps = {
  isAuthenticated: boolean;
  isMember: boolean;
  canUseAssistant: boolean;
  gateMessage: string;
  initialSessionId?: string | null;
  initialMessages?: ChatMessage[];
  quota: AssistantQuotaView;
  userEmail?: string | null;
};

const starterMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    title: "Twone AI Assistant",
    content:
      "欢迎回来。你可以直接问 BTC / ETH / 山寨结构、复盘某笔交易，或者让我帮你整理研究思路。我会先给出结构化判断，再提示风险点。",
    createdAt: new Date().toISOString(),
  },
];

const suggestions = [
  "帮我看 BTC 4H 当前结构",
  "把这笔亏损交易按问题拆开复盘",
  "给我一个今天适合盯的 watchlist 框架",
  "如果 ETH 失守关键位，风控应该怎么收缩？",
];

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
  canUseAssistant: initialCanUseAssistant,
  gateMessage,
  initialSessionId,
  initialMessages,
  quota: initialQuota,
  userEmail,
}: AssistantChatShellProps) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages?.length ? initialMessages : starterMessages);
  const [input, setInput] = useState("");
  const [quota, setQuota] = useState<AssistantQuotaView>(initialQuota);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuotaRefreshing, setIsQuotaRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const canSend = useMemo(
    () => isAuthenticated && isMember && canUseAssistant && input.trim().length > 0 && !isLoading,
    [canUseAssistant, input, isAuthenticated, isLoading, isMember],
  );

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

    const content = input.trim();
    if (!content || isLoading) {
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
    setInput(value);
    setError(null);
    formRef.current?.querySelector("textarea")?.focus();
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
        {!isMember ? (
          <div className="form-status assistant-gate-banner" role="status">
            {gateMessage}
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

        <div className="upload-placeholder">
          <div className="upload-placeholder__icon">📊</div>
          <div>
            <strong>图表上传将在下一版接入</strong>
            <p>当前先把文本对话流程跑通，后续这里可接截图上传、TradingView 图片分析与批注返回。</p>
          </div>
        </div>

        <div className="assistant-suggestions">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="suggestion-chip"
              onClick={() => applySuggestion(item)}
              disabled={isLoading}
            >
              {item}
            </button>
          ))}
        </div>

        <form ref={formRef} className="assistant-form" onSubmit={handleSubmit}>
          <label className="assistant-form__field">
            <span className="sr-only">输入你的问题</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isMember
                  ? isAuthenticated
                    ? "已登录，但未开通会员。开通后才可发送。"
                    : "未登录状态下可浏览，不可发送。先用右侧会员邮箱登录后再提问。"
                  : quota.monthlyRemaining > 0
                    ? "输入你的问题，例如：分析 BTC 4H 结构 / 帮我复盘这笔交易 / 给我一个今天的 watchlist 框架"
                    : "本月 AI 对话额度已用尽，请下月重置后再试。"
              }
              rows={4}
              disabled={!isMember || quota.monthlyRemaining <= 0}
            />
          </label>

          <div className="assistant-form__footer">
            <p>
              {isMember
                ? quota.monthlyRemaining > 0
                  ? "Enter 发送，Shift + Enter 换行。成功调用一次后会在服务端记录并扣减本月 AI 次数。"
                  : "当前会员有效，但本月 AI 配额已经用完。/api/assistant 会在服务端直接拒绝。"
                : isAuthenticated
                  ? "当前账号已登录，但没有有效会员权限。/api/assistant 会在服务端直接拒绝。"
                  : "当前为只读浏览模式。真正的发送权限由 /api/assistant 在服务端校验，未登录会直接拒绝。"}
            </p>
            <button type="submit" className="button button--primary" disabled={!canSend}>
              {isLoading
                ? "发送中..."
                : !isMember
                  ? isAuthenticated
                    ? "开通会员后可发送"
                    : "会员登录后可发送"
                  : quota.monthlyRemaining > 0
                    ? "发送"
                    : "本月额度已用尽"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="form-status form-status--error" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </>
  );
}
