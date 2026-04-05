import { NextResponse } from "next/server";
import { getDailyAiMarketAnalysis, getDailyAiMarketWorkflowNote } from "@/lib/daily-ai-market";

export async function GET() {
  try {
    return NextResponse.json({
      item: getDailyAiMarketAnalysis(),
      workflow: getDailyAiMarketWorkflowNote(),
    });
  } catch (error) {
    console.error("/api/daily-ai-market error", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "获取每日 AI 行情分析失败。",
      },
      { status: 500 },
    );
  }
}
