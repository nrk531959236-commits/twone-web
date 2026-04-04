import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatMessage } from "@/lib/assistant/types";
import { consumeAssistantQuota, getAssistantQuotaSummary } from "@/lib/assistant-quota";
import { appendAssistantConversationMessages, ensureAssistantSession } from "@/lib/assistant-history";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAssistantQuotaView } from "@/lib/assistant/view";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AssistantRequestBody = {
  message?: string;
  history?: ChatMessage[];
  sessionId?: string | null;
};

const systemPrompt = [
  "你是 Twone 的 AI 交易助理，服务于 Web3 交易与会员社区。",
  "默认使用中文回答，语气冷静、直接、偏进攻型，但不要夸张喊单。",
  "你的回答应优先服务于以下场景：币圈行情判断、交易计划、风险提示、复盘拆解、watchlist 梳理、会员研究支持。",
  "回答尽量结构化、可执行。若信息不足，先基于用户给的信息给出一个实用框架，再明确说明还缺什么。",
  "不要编造实时价格、仓位、新闻或链上数据。如果用户询问实时行情但你没有数据，就明确说当前页面未接实时行情源，并给出分析框架或需要补充的信息。",
  "涉及交易建议时，必须同时提示关键风险、确认位和否定位，避免绝对化表述。",
  "如果用户让你复盘交易，优先从入场逻辑、仓位管理、止损纪律、执行偏差、可复用结论这几个维度拆解。",
  "输出以自然中文段落或简洁分点为主，不要使用 JSON。",
].join("\n");

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
      temperature: 0.7,
      max_output_tokens: 800,
    });

    const content = completion.output_text?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "模型未返回有效内容，请稍后再试。" },
        { status: 502 },
      );
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

    const message =
      error instanceof Error
        ? error.message
        : "AI 服务暂时不可用，请稍后再试。";

    return NextResponse.json(
      { error: message || "AI 服务暂时不可用，请稍后再试。" },
      { status: 500 },
    );
  }
}
