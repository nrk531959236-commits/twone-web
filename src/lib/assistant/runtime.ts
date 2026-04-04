import type { AssistantQuotaView, AssistantReplyParams, AssistantReplyResult } from "./types";

type AssistantQuotaResponse = {
  quota: AssistantQuotaView;
};

export async function createAssistantReply({ message, history, sessionId }: AssistantReplyParams): Promise<AssistantReplyResult> {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history,
      sessionId,
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | { message?: AssistantReplyResult["message"]; quota?: AssistantReplyResult["quota"]; sessionId?: string | null; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.error || "当前回复服务暂时不可用，请稍后再试。");
  }

  if (!data?.message) {
    throw new Error("AI 服务返回格式异常，请稍后重试。");
  }

  return {
    message: data.message,
    quota: data.quota,
    sessionId: data.sessionId,
  } satisfies AssistantReplyResult;
}

export async function fetchAssistantQuota(): Promise<AssistantQuotaView> {
  const response = await fetch("/api/assistant/quota", {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | (AssistantQuotaResponse & { error?: string })
    | null;

  if (!response.ok || !data?.quota) {
    throw new Error(data?.error || "获取 AI 配额失败，请稍后再试。");
  }

  return data.quota;
}
