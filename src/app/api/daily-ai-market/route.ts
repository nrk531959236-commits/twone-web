import { NextResponse } from "next/server";
import { getDailyAiMarketAnalysis, getDailyAiMarketWorkflowNote, getLatestPublishedDailyAiMarketRecord } from "@/lib/daily-ai-market";

export const dynamic = "force-dynamic";

function isDebugEnabled(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("debug") === "1";
}

export async function GET(request: Request) {
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
      ...(isDebugEnabled(request)
        ? {
            debug: {
              itemTradeReview: item.tradeReviewCalendar,
              latestRecordTradeReview: latestRecord?.payload?.tradeReviewCalendar ?? null,
            },
          }
        : {}),
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
