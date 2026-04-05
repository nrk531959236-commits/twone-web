import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatMessage } from "@/lib/assistant/types";
import { consumeAssistantQuota, getAssistantQuotaSummary } from "@/lib/assistant-quota";
import { appendAssistantConversationMessages, ensureAssistantSession } from "@/lib/assistant-history";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAssistantQuotaView } from "@/lib/assistant/view";
import { BTC_ANALYSIS_SYSTEM_PROMPT, buildBtcAnalysisFallback } from "@/lib/assistant/btc-analysis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AssistantRequestBody = {
  message?: string;
  history?: ChatMessage[];
  sessionId?: string | null;
};

const systemPrompt = BTC_ANALYSIS_SYSTEM_PROMPT;

function normalizeHistory(history: ChatMessage[] = []) {
  return history
    .filter((item) => item?.content?.trim())
    .slice(-12)
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }));
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "服务端未配置 OPENAI_API_KEY。" },
        { status: 500 },
      );
    }

    const quota = await getAssistantQuotaSummary();

    if (!quota.membership.isAuthenticated) {
      return NextResponse.json(
        { error: "当前能力仅对会员开放，请先登录。" },
        { status: 401 },
      );
    }

    if (!quota.membership.isMember) {
      return NextResponse.json(
        { error: "当前账号已登录，但未开通有效会员，暂不可使用 AI 助手。" },
        { status: 403 },
      );
    }

    if (quota.monthlyRemaining <= 0) {
      return NextResponse.json(
        { error: "本月 AI 对话额度已用尽，请下月重置后再试。" },
        { status: 429 },
      );
    }

    const body = (await request.json()) as AssistantRequestBody;
    const message = body.message?.trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const requestedSessionId = body.sessionId ?? null;

    if (!message) {
      return NextResponse.json(
        { error: "消息内容不能为空。" },
        { status: 400 },
      );
    }

    let content = "";

    try {
      const completion = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...normalizeHistory(history).map((item) => ({
            role: item.role,
            content: item.content,
          })),
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.4,
        max_output_tokens: 900,
      });

      content = completion.output_text?.trim() || "";
    } catch (modelError) {
      console.error("openai.responses.create failed, using fallback", modelError);
    }

    if (!content) {
      content = buildBtcAnalysisFallback({ userMessage: message });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json(
        { error: "当前能力仅对会员开放，请先登录。" },
        { status: 401 },
      );
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      title: user.email || "Member",
      content: message,
      createdAt: new Date().toISOString(),
    };

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      title: "Twone AI Assistant",
      content,
      createdAt: new Date().toISOString(),
    };

    const session = requestedSessionId
      ? { id: requestedSessionId }
      : await ensureAssistantSession(user.id, userMessage.content);

    await appendAssistantConversationMessages({
      userId: user.id,
      sessionId: session.id,
      userMessage,
      assistantMessage,
    });

    const updatedQuota = await consumeAssistantQuota();

    return NextResponse.json({
      message: assistantMessage,
      sessionId: session.id,
      quota: toAssistantQuotaView(updatedQuota),
    });
  } catch (error) {
    console.error("/api/assistant error", error);

    const message = error instanceof Error ? error.message : "AI 服务暂时不可用，请稍后再试。";
    const knownStatus =
      message.includes("请先登录") ? 401
      : message.includes("未开通有效会员") ? 403
      : message.includes("额度已用尽") ? 429
      : 500;

    return NextResponse.json(
      {
        error:
          knownStatus === 500
            ? "AI 服务当前不可用，请稍后再试；如果你还没申请会员，也可以先走申请入口。"
            : message,
      },
      { status: knownStatus },
    );
  }
}
