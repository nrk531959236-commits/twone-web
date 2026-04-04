import { NextResponse } from "next/server";
import { getAssistantQuotaSummary } from "@/lib/assistant-quota";
import { toAssistantQuotaView } from "@/lib/assistant/view";

export async function GET() {
  try {
    const quota = await getAssistantQuotaSummary();

    return NextResponse.json({
      quota: toAssistantQuotaView(quota),
      canUseAssistant: quota.canUseAssistant,
      membership: quota.membership,
    });
  } catch (error) {
    console.error("/api/assistant/quota error", error);

    const message =
      error instanceof Error
        ? error.message
        : "获取 AI 配额失败，请稍后再试。";

    return NextResponse.json(
      { error: message || "获取 AI 配额失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
