import { SiteHeader } from "@/components/site-header";
import { getDailyAiMarketAnalysis, getDailyAiMarketWorkflowNote } from "@/lib/daily-ai-market";

const contactChannels = [
  {
    name: "Discord",
    detail: "加入社区，接收盘中讨论与会员通知",
    href: "/apply",
    cta: "加入 Discord",
  },
  {
    name: "Telegram",
    detail: "直接联系团队，处理会员咨询与开通问题",
    href: "/apply",
    cta: "打开 Telegram",
  },
];

const macroEventMetricLabels = {
  current: "当前 / 实际",
  forecast: "预期",
  previous: "前值",
} as const;

const indicatorToneLabel = {
  bullish: "偏多",
  bearish: "偏空",
  neutral: "中性",
} as const;

function formatCountdown(targetIso: string) {
  const now = new Date();
  const target = new Date(targetIso);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "更新中";
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} 分钟`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
}

export default function Home() {
  const dailyAnalysis = getDailyAiMarketAnalysis();
  const workflow = getDailyAiMarketWorkflowNote();
  const nextUpdateCountdown = formatCountdown(dailyAnalysis.publishAtJst);
  const tradeSetups = [dailyAnalysis.tradeSetups.shortTerm, dailyAnalysis.tradeSetups.longTerm];

  return (
    <main className="page-shell home-minimal-shell">
      <SiteHeader current="home" />

      <section className="section home-minimal-section home-daily-section" id="daily-ai-market">
        <div className="home-content-pillars">
          <span>每日 AI 行情分析</span>
          <span>开单建议</span>
          <span>事件表</span>
          <span>Discord / Telegram</span>
        </div>
        <div className="home-section-heading">
          <div>
            <p className="section__label">A · 首页核心</p>
            <h1>每日 AI 行情分析</h1>
          </div>
          <div className="home-daily-meta">
            <span>{workflow.preferredPublishTime} 固定更新</span>
            <span>下次更新：{nextUpdateCountdown}</span>
          </div>
        </div>

        <div className="home-daily-grid">
          <article className="home-daily-main card-glow">
            <div className="home-daily-main__top">
              <div>
                <p className="home-chip">每日结论</p>
                <h2>{dailyAnalysis.headline}</h2>
              </div>
              <div className="home-bias-box">
                <span className="home-highlight-label">今日偏向</span>
                <strong>{dailyAnalysis.marketBias}</strong>
                <em>{dailyAnalysis.conviction}</em>
              </div>
            </div>

            <div className="home-analysis-highlights home-analysis-highlights--stacked">
              <article className="home-analysis-highlight home-analysis-highlight--bias">
                <span className="home-highlight-label">主结论</span>
                <strong>{dailyAnalysis.headline}</strong>
                <p>{dailyAnalysis.summary}</p>
              </article>
              <article className="home-analysis-highlight home-analysis-highlight--levels">
                <span className="home-highlight-label">关键位置</span>
                <div className="home-key-levels home-key-levels--compact">
                  <article>
                    <span>上方确认</span>
                    <strong>{dailyAnalysis.keyLevels[0]}</strong>
                  </article>
                  <article>
                    <span>核心承接</span>
                    <strong>{dailyAnalysis.keyLevels[1]}</strong>
                  </article>
                  <article>
                    <span>下方否定</span>
                    <strong>{dailyAnalysis.keyLevels[2]}</strong>
                  </article>
                </div>
              </article>
            </div>
          </article>

          <aside className="home-daily-side">
            <article className="home-side-card home-side-card--intro">
              <div className="home-side-card__compact-head">
                <div>
                  <p className="home-chip">多级别指标提示</p>
                  <h3>4H / D / W 指标提示</h3>
                </div>
                <span className="home-side-mini-tag">快速校验</span>
              </div>
              <p>把 VWAP、VAL / VAH、MACD 与 RSI 浓缩成同一阅读节奏，用来确认强弱与节奏，不抢主结论的位置。</p>
            </article>

            <div className="home-indicator-list">
              {dailyAnalysis.indicatorPanels.map((panel) => (
                <article
                  key={panel.timeframe}
                  className={`home-side-card home-side-card--indicator home-side-card--${panel.bias}`}
                >
                  <div className="home-indicator-card__head">
                    <div className="home-indicator-title">
                      <p className="home-chip">{panel.timeframe}</p>
                      <span className={`home-indicator-tone home-indicator-tone--${panel.bias}`}>
                        {indicatorToneLabel[panel.bias]}
                      </span>
                    </div>
                    <p className="home-indicator-note">{panel.vwap.stance}</p>
                  </div>

                  <div className="home-indicator-metrics">
                    <div className="home-indicator-stack">
                      <div className="home-indicator-row">
                        <span className="home-indicator-label">VWAP</span>
                        <strong>{panel.vwap.value}</strong>
                      </div>
                      <div className="home-indicator-subrow">
                        <span>VAL {panel.vwap.val}</span>
                        <span>VAH {panel.vwap.vah}</span>
                      </div>
                    </div>

                    <div className="home-indicator-stack">
                      <div className="home-indicator-row">
                        <span className="home-indicator-label">MACD</span>
                        <strong>{panel.macd.direction}</strong>
                      </div>
                      <div className="home-indicator-subrow">
                        <span>背离</span>
                        <span className={`home-indicator-signal home-indicator-signal--${panel.macd.bias}`}>
                          {panel.macd.divergence}
                        </span>
                      </div>
                    </div>

                    <div className="home-indicator-stack">
                      <div className="home-indicator-row">
                        <span className="home-indicator-label">RSI</span>
                        <strong>{panel.rsi.value}</strong>
                      </div>
                      <div className="home-indicator-subrow">
                        <span>背离</span>
                        <span className={`home-indicator-signal home-indicator-signal--${panel.rsi.bias}`}>
                          {panel.rsi.divergence}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="section home-minimal-section home-trade-section" id="trade-setups">
        <div className="home-section-heading home-section-heading--split">
          <div>
            <p className="section__label">C · 开单建议</p>
            <h2>短线 / 长线分开执行</h2>
          </div>
          <p className="section__intro">
            恢复首页开单建议，但不做成喊单区。只保留触发区、止损、目标、失效条件和执行备注，避免信息发散。
          </p>
        </div>

        <div className="home-trade-grid">
          {tradeSetups.map((setup) => (
            <article key={setup.label} className="home-trade-card home-trade-card--highlight">
              <div className="home-trade-card__header">
                <div>
                  <p className="home-chip">{setup.label}</p>
                  <h3>{setup.direction}</h3>
                </div>
                <span className="home-trade-stance">{setup.stance}</span>
              </div>

              <p className="home-trade-rationale">{setup.rationale}</p>

              <div className="home-trade-points">
                <article>
                  <span>触发区</span>
                  <strong>{setup.triggerZone}</strong>
                </article>
                <article>
                  <span>止损</span>
                  <strong>{setup.stopLoss}</strong>
                </article>
                <article>
                  <span>失效条件</span>
                  <strong>{setup.invalidation}</strong>
                </article>
              </div>

              <div className="home-trade-columns">
                <div>
                  <p className="home-chip home-chip--highlight">目标位</p>
                  <ul>
                    {setup.targets.map((target) => (
                      <li key={target}>{target}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="home-chip home-chip--highlight-soft">执行备注</p>
                  <p>{setup.executionLine}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section home-minimal-section home-events-section" id="macro-events">
        <div className="home-section-heading home-section-heading--split">
          <div>
            <p className="section__label">D · 宏观事件</p>
            <h2>FOMC / CPI / 非农</h2>
          </div>
          <p className="section__intro">恢复首页事件表，放在开单建议后面，用来解释今晚波动驱动，不再额外堆宣传模块。</p>
        </div>

        <div className="home-events-grid">
          {dailyAnalysis.macroEvents.map((event) => (
            <article key={event.name} className="home-event-card">
              <div className="home-event-card__header">
                <div>
                  <p className="home-chip">{event.name}</p>
                  <h3>{event.nextTimeJst}</h3>
                </div>
                <span className="home-event-status">{event.status}</span>
              </div>

              <div className="home-event-stats">
                {([
                  ["current", event.current],
                  ["forecast", event.forecast],
                  ["previous", event.previous],
                ] as const).map(([key, value]) => (
                  <article key={key}>
                    <span>{macroEventMetricLabels[key]}</span>
                    <strong>{value ?? "待补充"}</strong>
                  </article>
                ))}
              </div>

              <p className="home-event-note">{event.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section home-minimal-section home-contact-section" id="contact">
        <div className="home-section-heading home-section-heading--split">
          <div>
            <p className="section__label">E · 联系方式</p>
            <h2>Discord / Telegram</h2>
          </div>
          <p className="section__intro">首页最后只留联系入口，方便用户加入社区或直接咨询会员开通。</p>
        </div>

        <div className="home-contact-grid">
          {contactChannels.map((item) => (
            <a key={item.name} href={item.href} className="home-contact-card">
              <p className="home-chip">{item.name}</p>
              <h3>{item.name}</h3>
              <p>{item.detail}</p>
              <span>{item.cta} →</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
