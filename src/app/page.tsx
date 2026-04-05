import { SiteHeader } from "@/components/site-header";
import { AccessEntryLink } from "@/components/access-entry-link";
import { getDailyAiMarketAnalysis, getDailyAiMarketWorkflowNote } from "@/lib/daily-ai-market";

const insightCards = [
  {
    title: "先看今日结论",
    description: "首页第一屏直接给出 AI 今日行情分析，不先让用户读品牌介绍，也不先给空聊天框。",
  },
  {
    title: "再进更深分析",
    description: "上方高亮按钮直接导向 AI 助手，告诉用户进去后是做更细的结构拆解、节奏判断和计划推演。",
  },
  {
    title: "交易导向而非宣传导向",
    description: "围绕关键位、确认位、否定位与执行路径组织页面，减少传统 landing page 的叙事噪音。",
  },
];

const assistantEntrances = ["BTC 15M 快速节奏", "BTC 1H 结构判断", "BTC 4H 主交易计划", "BTC 1D 大级别方向"];

const executionNotes = [
  "普通体验用户先走固定分析入口，不优先开放闲聊。",
  "Pro / VIP 再开放自由输入、连续追问与更深度研究。",
  "首页主视觉改成 AI 今日行情分析，AI 助手按钮只负责承接更详细分析。",
];

export default function Home() {
  const dailyAnalysis = getDailyAiMarketAnalysis();
  const workflow = getDailyAiMarketWorkflowNote();

  return (
    <main className="page-shell">
      <SiteHeader current="home" />

      <section className="section hero ai-market-hero" id="daily-ai-market">
        <div className="hero__badge">首页主视觉 · AI 今日行情分析</div>

        <div className="ai-market-hero__topbar">
          <div className="ai-market-hero__intro">
            <p className="eyebrow">先看结论，再决定是否进入更细分析</p>
            <h1>
              AI 今日行情分析
              <br />
              <span>直接成为首页第一眼</span>
            </h1>
            <p className="hero__description">
              Twone 首页现在不再先做传统介绍，也不把空聊天框放在最前面。用户进入页面后，第一屏先看到今晚市场判断、关键位、风险提示；如果要看更详细的结构拆解，再点上方高亮 AI 助手入口继续深挖。
            </p>
          </div>

          <AccessEntryLink href="/assistant" mode="assistant" className="ai-assistant-banner card-glow">
            <div className="ai-assistant-banner__chip">高亮入口</div>
            <div className="ai-assistant-banner__body">
              <div>
                <p className="ai-assistant-banner__title">打开 AI 助手，做更详细分析</p>
                <p className="ai-assistant-banner__text">
                  进去后可继续看 BTC 多级别结构、确认位 / 否定位、交易计划与更细的节奏拆解。
                </p>
              </div>
              <span className="ai-assistant-banner__cta">立即深入分析 →</span>
            </div>
          </AccessEntryLink>
        </div>

        <div className="daily-market-hero-card card-glow">
          <div className="daily-market-hero-card__head">
            <div>
              <p className="daily-market-hero-card__eyebrow">{dailyAnalysis.title}</p>
              <div className="daily-market-hero-card__meta">
                <span>预设发布时间：{dailyAnalysis.publishAtJst}</span>
                <span>
                  更新节奏：{workflow.timezone} {workflow.preferredPublishTime}
                </span>
              </div>
            </div>
            <div className="daily-market-bias">{dailyAnalysis.marketBias}</div>
          </div>

          <p className="daily-market-hero-card__summary">{dailyAnalysis.summary}</p>

          <div className="daily-market-columns daily-market-columns--hero">
            <div>
              <h3>关键位</h3>
              <ul>
                {dailyAnalysis.keyLevels.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>今晚重点</h3>
              <ul>
                {dailyAnalysis.focus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>风险提示</h3>
              <ul>
                {dailyAnalysis.riskTips.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="hero-insight-grid">
          <article className="trade-setup-card trade-setup-card--highlight card-glow">
            <div className="trade-setup-card__header">
              <div>
                <p className="trade-setup-card__chip">高亮执行模块</p>
                <h2>开单建议</h2>
              </div>
              <div className="trade-setup-card__direction">{dailyAnalysis.tradeSetup.direction}</div>
            </div>

            <div className="trade-setup-grid">
              <div className="trade-setup-metric trade-setup-metric--primary">
                <span>开单位置 / 触发条件</span>
                <strong>{dailyAnalysis.tradeSetup.triggerZone}</strong>
              </div>
              <div className="trade-setup-metric trade-setup-metric--danger">
                <span>止损位</span>
                <strong>{dailyAnalysis.tradeSetup.stopLoss}</strong>
              </div>
              <div className="trade-setup-metric">
                <span>失效条件</span>
                <strong>{dailyAnalysis.tradeSetup.invalidation}</strong>
              </div>
            </div>

            <div className="trade-setup-targets">
              <div className="trade-setup-targets__header">
                <span>目标位</span>
                <strong>分批止盈，不一次性幻想吃满</strong>
              </div>
              <div className="trade-setup-targets__list">
                {dailyAnalysis.tradeSetup.targets.map((item) => (
                  <div key={item} className="trade-setup-target">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="trade-setup-execution">
              <span>一句话执行建议</span>
              <strong>{dailyAnalysis.tradeSetup.executionLine}</strong>
            </div>
          </article>

          <article className="macro-events-card">
            <div className="macro-events-card__header">
              <div>
                <p className="trade-setup-card__chip">事件节奏卡</p>
                <h2>宏观事件时间卡</h2>
              </div>
              <p className="macro-events-card__note">至少先盯 FOMC / CPI / 非农，不在大事件前后盲追。</p>
            </div>

            <div className="macro-events-list">
              {dailyAnalysis.macroEvents.map((event) => (
                <article key={event.name} className="macro-event-item">
                  <div className="macro-event-item__top">
                    <div>
                      <span className="macro-event-item__label">{event.name}</span>
                      <strong>{event.nextTimeJst}</strong>
                    </div>
                    <span className="macro-event-item__status">{event.status}</span>
                  </div>

                  <div className="macro-event-item__stats">
                    <div>
                      <span>当前</span>
                      <strong>{event.current ?? "待接入"}</strong>
                    </div>
                    <div>
                      <span>预期</span>
                      <strong>{event.forecast ?? "待接入"}</strong>
                    </div>
                    <div>
                      <span>前值</span>
                      <strong>{event.previous ?? "待接入"}</strong>
                    </div>
                  </div>

                  <p>{event.note}</p>
                </article>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section section--split compact-split">
        <div>
          <p className="section__label">页面策略</p>
          <h2>首页先完成交易判断，再引导用户进入更深分析</h2>
        </div>
        <p className="section__intro">
          这一版把页面重心改成“先给 AI 今日行情分析，再给 AI 助手入口”。用户不需要先理解一堆品牌故事，也不会先面对空白输入框，而是先拿到可执行的市场框架。
        </p>
      </section>

      <section className="section card-grid compact-card-grid">
        {insightCards.map((item, index) => (
          <article className="info-card" key={item.title}>
            <div className="info-card__index">0{index + 1}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <section className="section ai-home-focus">
        <div>
          <p className="section__label">AI 助手入口</p>
          <h2>高亮按钮负责承接“更详细分析”</h2>
          <p className="section__intro">
            首页不抢着让用户聊天，而是明确告诉用户：如果你已经看完今日结论，想继续拆 BTC 结构、级别节奏和执行计划，就点 AI 助手进去做更深分析。
          </p>
        </div>
        <div className="assistant-entrance-grid">
          {assistantEntrances.map((item) => (
            <article key={item} className="assistant-entrance-card">
              <span className="assistant-entrance-card__label">详细分析入口</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section membership-block" id="benefits">
        <div className="membership-block__content">
          <p className="section__label">产品路径</p>
          <h2>先固定分析，再分层开放能力</h2>
          <p>
            当前首页明确不走“什么都能问”的泛 AI 叙事。普通体验版先用固定交易分析入口；更高等级会员再获得自由输入、连续追问和更深度研究能力。这样首页承诺、按钮文案和后续体验是统一的。
          </p>
        </div>
        <div className="membership-list card-glow">
          {executionNotes.map((item) => (
            <div key={item} className="membership-list__item">
              <span className="membership-list__icon">✦</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section cta-block card-glow" id="cta">
        <p className="section__label">继续深入</p>
        <h2>看完首页第一屏结论后，再进 AI 助手做更细致推演</h2>
        <p>
          当前 daily-ai-market 模块已经被直接抬到首页主视觉。后续只要接后台发布或定时任务，每晚更新一条新的 AI 行情分析，首页第一屏就会自动变成当天版本。
        </p>
        <div className="hero__actions">
          <AccessEntryLink href="/assistant" mode="assistant" className="button button--primary">
            打开 AI 助手做详细分析
          </AccessEntryLink>
          <a href="/apply" className="button button--ghost">
            申请会员
          </a>
        </div>
      </section>
    </main>
  );
}
