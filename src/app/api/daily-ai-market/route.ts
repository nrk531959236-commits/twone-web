import { NextResponse } from "next/server";
import { getDailyAiMarketAnalysis, getDailyAiMarketWorkflowNote, getLatestPublishedDailyAiMarketRecord } from "@/lib/daily-ai-market";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [item, workflow, latestRecord] = await Promise.all([
      getDailyAiMarketAnalysis(),
      getDailyAiMarketWorkflowNote(),
      getLatestPublishedDailyAiMarketRecord(),
    ]);

    return NextResponse.json({
      item,
      workflow,
      latestRecord,
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
