"use client";

import { useMemo, useState } from "react";
import type { DailyAiMarketAnalysis } from "@/lib/daily-ai-market";

type Props = {
  tradeReviewCalendar: DailyAiMarketAnalysis["tradeReviewCalendar"];
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

export function TradeReviewCalendarModal({ tradeReviewCalendar }: Props) {
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const entries = tradeReviewCalendar.entries;
    return {
      total: entries.length,
      wins: entries.filter((item) => item.status === "tp_hit").length,
      losses: entries.filter((item) => item.status === "sl_hit").length,
      holding: entries.filter((item) => item.status === "holding").length,
      watching: entries.filter((item) => item.status === "watching").length,
    };
  }, [tradeReviewCalendar.entries]);

  const calendar = useMemo(() => {
    const sortedEntries = [...tradeReviewCalendar.entries].sort((a, b) => parseEntryDate(a.date).getTime() - parseEntryDate(b.date).getTime());
    const anchorDate = sortedEntries.length > 0 ? parseEntryDate(sortedEntries[sortedEntries.length - 1].date) : new Date();
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    const entryMap = new Map(sortedEntries.map((entry) => [entry.date, entry]));

    const cells: Array<{ key: string; dateNumber?: number; entry?: DailyAiMarketAnalysis["tradeReviewCalendar"]["entries"][number] }> = [];

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

    return {
      monthLabel: new Intl.DateTimeFormat("zh-CN", { month: "long", year: "numeric" }).format(anchorDate),
      cells,
    };
  }, [tradeReviewCalendar.entries]);

  return (
    <>
      <div className="home-trade-review-trigger-wrap">
        <button type="button" className="home-trade-review-trigger" onClick={() => setOpen(true)}>
          <span className="home-chip home-chip--highlight">建议复盘入口</span>
          <strong>查看 AI 胜率日历</strong>
          <p>按月份查看每天的开仓方向、开仓位，以及止盈止损结果。</p>
        </button>
      </div>

      {open ? (
        <div className="trade-review-modal" role="dialog" aria-modal="true" aria-labelledby="trade-review-modal-title">
          <div className="trade-review-modal__backdrop" onClick={() => setOpen(false)} />
          <div className="trade-review-modal__panel">
            <div className="trade-review-modal__header">
              <div>
                <p className="home-chip home-chip--highlight">AI 胜率日历</p>
                <h2 id="trade-review-modal-title">{tradeReviewCalendar.title}</h2>
                <p>{tradeReviewCalendar.subtitle}</p>
              </div>
              <button type="button" className="trade-review-modal__close" onClick={() => setOpen(false)} aria-label="关闭弹窗">
                ×
              </button>
            </div>

            <div className="trade-review-modal__body">
              <div className="trade-review-modal__stats">
                <article>
                  <span>月份</span>
                  <strong>{calendar.monthLabel}</strong>
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

              <div className="trade-review-modal__legend">
                <span className="trade-review-legend trade-review-legend--tp_hit">绿色 = 盈利</span>
                <span className="trade-review-legend trade-review-legend--sl_hit">红色 = 亏损</span>
                <span className="trade-review-legend trade-review-legend--holding">黄色 = 持仓中</span>
                <span className="trade-review-legend trade-review-legend--watching">灰色 = 观望</span>
              </div>

              <div className="trade-review-month-grid">
                {weekLabels.map((label) => (
                  <span key={label} className="trade-review-month-grid__weekday">
                    {label}
                  </span>
                ))}

                {calendar.cells.map((cell) =>
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
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
