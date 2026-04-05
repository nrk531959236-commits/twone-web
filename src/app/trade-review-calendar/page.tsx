import Link from "next/link";
import type { Metadata } from "next";
import { getDailyAiMarketAnalysis } from "@/lib/daily-ai-market";

export const metadata: Metadata = {
  title: "AI 胜率日历 | Twone Web3.0 Community",
  description: "按月份查看每天的开仓方向、开仓位，以及止盈止损结果。",
};

const statusLabel = {
  tp_hit: "止盈",
  sl_hit: "止损",
  holding: "持仓中",
  watching: "观望",
} as const;

const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function parseEntryDate(value: string) {
  const [month, day] = value.split("-").map(Number);
  const year = new Date().getFullYear();
  return new Date(year, (month || 1) - 1, day || 1);
}

export default async function TradeReviewCalendarPage() {
  const dailyAnalysis = await getDailyAiMarketAnalysis();
  const tradeReviewCalendar =
    dailyAnalysis.tradeReviewCalendar ?? {
      title: "前一日开单建议复盘",
      subtitle: "展示前一天建议的开仓位、止盈止损与当前持仓位置，把胜率亮化给用户直接看。",
      winRate: "--",
      record: "等待接入真实复盘数据",
      highlight: "当前站点仍在兼容旧数据结构，复盘日历会先用兜底展示，避免页面报错。",
      entries: [],
    };

  const entries = tradeReviewCalendar.entries;
  const stats = {
    total: entries.length,
    wins: entries.filter((item) => item.status === "tp_hit").length,
    losses: entries.filter((item) => item.status === "sl_hit").length,
    holding: entries.filter((item) => item.status === "holding").length,
    watching: entries.filter((item) => item.status === "watching").length,
  };

  const sortedEntries = [...entries].sort((a, b) => parseEntryDate(a.date).getTime() - parseEntryDate(b.date).getTime());
  const anchorDate = sortedEntries.length > 0 ? parseEntryDate(sortedEntries[sortedEntries.length - 1].date) : new Date();
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const entryMap = new Map(sortedEntries.map((entry) => [entry.date, entry]));

  const cells: Array<{ key: string; dateNumber?: number; entry?: (typeof entries)[number] }> = [];

  for (let i = 0; i < offset; i += 1) {
    cells.push({ key: `empty-start-${i}` });
  }

  for (let day = 1; day <= lastDate; day += 1) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const key = `${mm}-${dd}`;
    cells.push({ key, dateNumber: day, entry: entryMap.get(key) });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}` });
  }

  const monthLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", year: "numeric" }).format(anchorDate);

  return (
    <main className="page-shell home-minimal-shell trade-review-page-shell">
      <section className="section home-minimal-section trade-review-page-section">
        <div className="trade-review-page-header">
          <div>
            <p className="section__label">独立页面 · AI 胜率日历</p>
            <h1>{tradeReviewCalendar.title}</h1>
            <p>{tradeReviewCalendar.subtitle}</p>
          </div>
          <Link href="/" className="trade-review-page-back">
            ← 返回首页
          </Link>
        </div>

        <div className="trade-review-page-stats">
          <article>
            <span>月份</span>
            <strong>{monthLabel}</strong>
          </article>
          <article>
            <span>胜率亮化</span>
            <strong>{tradeReviewCalendar.winRate}</strong>
          </article>
          <article>
            <span>盈利格</span>
            <strong>{stats.wins}</strong>
          </article>
          <article>
            <span>亏损格</span>
            <strong>{stats.losses}</strong>
          </article>
          <article>
            <span>持仓中</span>
            <strong>{stats.holding}</strong>
          </article>
          <article>
            <span>观望</span>
            <strong>{stats.watching}</strong>
          </article>
        </div>

        <div className="trade-review-page-notes">
          <span className="trade-review-legend trade-review-legend--tp_hit">绿色 = 盈利</span>
          <span className="trade-review-legend trade-review-legend--sl_hit">红色 = 亏损</span>
          <span className="trade-review-legend trade-review-legend--holding">黄色 = 持仓中</span>
          <span className="trade-review-legend trade-review-legend--watching">灰色 = 观望</span>
          <p>{tradeReviewCalendar.highlight}</p>
        </div>

        <div className="trade-review-month-grid trade-review-month-grid--page">
          {weekLabels.map((label) => (
            <span key={label} className="trade-review-month-grid__weekday">
              {label}
            </span>
          ))}

          {cells.map((cell) =>
            cell.dateNumber ? (
              <article
                key={cell.key}
                className={`trade-review-month-cell ${cell.entry ? `trade-review-month-cell--${cell.entry.status}` : "trade-review-month-cell--empty"}`}
              >
                <div className="trade-review-month-cell__top">
                  <span className="trade-review-month-cell__date">{cell.dateNumber}</span>
                  {cell.entry ? (
                    <span className={`trade-review-month-cell__direction trade-review-month-cell__direction--${cell.entry.direction}`}>
                      {cell.entry.direction === "long" ? "Long" : "Short"}
                    </span>
                  ) : null}
                </div>

                {cell.entry ? (
                  <>
                    <div className="trade-review-month-cell__body">
                      <strong>{cell.entry.entry}</strong>
                      <p>{cell.entry.setupLabel}</p>
                    </div>

                    <div className="trade-review-month-cell__meta">
                      <span>TP {cell.entry.takeProfit}</span>
                      <span>SL {cell.entry.stopLoss}</span>
                    </div>

                    <div className="trade-review-month-cell__footer">
                      <span className={`trade-review-month-cell__status trade-review-month-cell__status--${cell.entry.status}`}>
                        {statusLabel[cell.entry.status]}
                      </span>
                      <strong>{cell.entry.pnlLabel}</strong>
                    </div>
                  </>
                ) : (
                  <div className="trade-review-month-cell__placeholder">无数据</div>
                )}
              </article>
            ) : (
              <div key={cell.key} className="trade-review-month-cell trade-review-month-cell--blank" aria-hidden="true" />
            ),
          )}
        </div>
      </section>
    </main>
  );
}
