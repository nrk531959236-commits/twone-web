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

  return (
    <>
      <div className="home-trade-review-trigger-wrap">
        <button type="button" className="home-trade-review-trigger" onClick={() => setOpen(true)}>
          <span className="home-chip home-chip--highlight">建议复盘入口</span>
          <strong>查看 AI 胜率日历</strong>
          <p>查看前一天建议的方向、开仓位，以及止盈止损结果。</p>
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

            <div className="trade-review-modal__stats">
              <article>
                <span>胜率亮化</span>
                <strong>{tradeReviewCalendar.winRate}</strong>
              </article>
              <article>
                <span>记录</span>
                <strong>{tradeReviewCalendar.record}</strong>
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

            <div className="trade-review-modal__calendar">
              {tradeReviewCalendar.entries.map((entry) => (
                <article
                  key={`${entry.date}-${entry.setupLabel}`}
                  className={`trade-review-day trade-review-day--${entry.status}`}
                >
                  <div className="trade-review-day__top">
                    <span className="trade-review-day__date">{entry.date}</span>
                    <span className={`trade-review-day__direction trade-review-day__direction--${entry.direction}`}>
                      {entry.direction === "long" ? "Long" : "Short"}
                    </span>
                  </div>

                  <div className="trade-review-day__core">
                    <h3>{entry.setupLabel}</h3>
                    <strong>{entry.resultLabel}</strong>
                  </div>

                  <div className="trade-review-day__grid">
                    <article>
                      <span>开仓位</span>
                      <strong>{entry.entry}</strong>
                    </article>
                    <article>
                      <span>止盈</span>
                      <strong>{entry.takeProfit}</strong>
                    </article>
                    <article>
                      <span>止损</span>
                      <strong>{entry.stopLoss}</strong>
                    </article>
                    <article>
                      <span>当前位置</span>
                      <strong>{entry.currentZone}</strong>
                    </article>
                  </div>

                  <div className="trade-review-day__footer">
                    <span className={`trade-review-day__status trade-review-day__status--${entry.status}`}>
                      {statusLabel[entry.status]}
                    </span>
                    <strong>{entry.pnlLabel}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
