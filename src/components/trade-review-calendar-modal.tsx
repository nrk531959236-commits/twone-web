import Link from "next/link";
import type { DailyAiMarketAnalysis } from "@/lib/daily-ai-market";

type Props = {
  tradeReviewCalendar: DailyAiMarketAnalysis["tradeReviewCalendar"];
};

export function TradeReviewCalendarModal({ tradeReviewCalendar }: Props) {
  return (
    <div className="home-trade-review-trigger-wrap">
      <Link href="/trade-review-calendar" className="home-trade-review-trigger">
        <span className="home-chip home-chip--highlight">建议复盘入口</span>
        <strong>查看 AI 胜率日历</strong>
        <p>按月份查看每天的开仓方向、开仓位，以及止盈止损结果。</p>
        <span className="home-trade-review-trigger__meta">
          {tradeReviewCalendar.title} · 胜率 {tradeReviewCalendar.winRate}
        </span>
      </Link>
    </div>
  );
}
