import { SiteHeader } from "@/components/site-header";
import { AccessEntryLink } from "@/components/access-entry-link";
import { getDailyAiMarketAnalysis, getDailyAiMarketWorkflowNote } from "@/lib/daily-ai-market";

const coreBenefits = [
  {
    title: "固定分析入口",
    description: "不把 AI 做成杂乱聊天框，而是直接收口到几个常用市场分析入口。",
  },
  {
    title: "交易导向输出",
    description: "围绕结构、关键位、确认位、否定位和执行计划，减少空话和噪音。",
  },
  {
    title: "会员分层",
    description: "普通体验用户默认走固定按钮，高级版会员再开放自由输入与更深度交互。",
  },
];

const assistantEntrances = [
  "BTC 15M 快速节奏",
  "BTC 1H 结构判断",
  "BTC 4H 主交易计划",
  "BTC 1D 大级别方向",
];

const planRows = [
  { label: "Free / 普通体验", value: "固定分析按钮入口" },
  { label: "Pro / VIP", value: "开放自由输入 + 更深度研究交互" },
  { label: "首页内容策略", value: "先展示 AI 核心能力，再补社群/课程信息" },
];

export default function Home() {
  const dailyAnalysis = getDailyAiMarketAnalysis();
  const workflow = getDailyAiMarketWorkflowNote();

  return (
    <main className="page-shell">
      <SiteHeader current="home" />

      <section className="hero section home-hero">
        <div className="hero__badge">Twone 社区 · AI 交易助手优先</div>
        <div className="hero__grid home-hero__grid">
          <div className="hero__content">
            <p className="eyebrow">更少噪音，更像真正能落地的炒币助手</p>
            <h1>
              <span>Twone</span> 首页先聚焦 AI 助手，
              <br />
              把分析入口做简单、做直接。
            </h1>
            <p className="hero__description">
              这一版首页不再堆太多社群介绍，而是把核心价值前置：固定分析入口、每日 AI 行情分析、会员分层权限。
              普通用户先通过按钮进入常用分析，高级版会员再开放自由输入，把页面从“介绍站”收束成“交易入口”。
            </p>
            <div className="hero__actions">
              <AccessEntryLink href="/assistant" mode="assistant" className="button button--primary">
                进入 AI 助手
              </AccessEntryLink>
              <a href="#daily-ai-market" className="button button--ghost">
                看今晚 AI 行情分析
              </a>
              <a href="/apply" className="button button--ghost">
                申请会员
              </a>
            </div>
          </div>

          <div className="hero__panel card-glow home-hero__panel">
            <div className="panel__topline">
              <span className="status-dot" />
              AI First Product Layout
            </div>
            <div className="home-logo-block">
              <div className="home-logo-block__mark">T</div>
              <div>
                <p className="home-logo-block__name">Twone 社区</p>
                <span className="home-logo-block__tag">中文化 / 简洁 / 交易产品导向</span>
              </div>
            </div>
            <div className="panel__list">
              {planRows.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--split compact-split">
        <div>
          <p className="section__label">核心能力</p>
          <h2>首页只保留对转化最关键的三件事</h2>
        </div>
        <p className="section__intro">
          第一是 AI 助手入口，第二是每日 AI 行情分析，第三是会员权限差异。课程、社群、内容体系仍然保留，但不再抢首页第一视觉。
        </p>
      </section>

      <section className="section card-grid compact-card-grid">
        {coreBenefits.map((item, index) => (
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
          <h2>默认不给普通用户开放闲聊，先走固定分析按钮</h2>
          <p className="section__intro">
            这样做的好处是减少滥问、减少无效 token 消耗，也更符合交易产品的使用路径：先点常用入口，再看结果；只有 Pro / VIP 会员才开放自由输入。
          </p>
        </div>
        <div className="assistant-entrance-grid">
          {assistantEntrances.map((item) => (
            <article key={item} className="assistant-entrance-card">
              <span className="assistant-entrance-card__label">固定入口</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section daily-market-block card-glow" id="daily-ai-market">
        <div className="section-heading daily-market-block__heading">
          <div>
            <p className="section__label">每日 AI 行情分析</p>
            <h2>每天日本时间 21:15 左右更新一条首页市场结论</h2>
          </div>
          <div className="daily-market-meta">
            <span>发布时间：{workflow.timezone} {workflow.preferredPublishTime}</span>
            <span>当前模式：{workflow.currentMode}</span>
          </div>
        </div>

        <div className="daily-market-card">
          <div className="daily-market-card__top">
            <div>
              <p className="daily-market-card__title">{dailyAnalysis.title}</p>
              <span className="daily-market-card__time">预设发布时间：{dailyAnalysis.publishAtJst}</span>
            </div>
            <div className="daily-market-bias">{dailyAnalysis.marketBias}</div>
          </div>

          <p className="daily-market-card__summary">{dailyAnalysis.summary}</p>

          <div className="daily-market-columns">
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

          <p className="daily-market-card__footnote">
            当前先走最小可用方案：首页直接读取本地数据结构 / API 占位内容。后续只需接一个后台发布动作或定时脚本，在每晚 21:15 前写入最新内容，首页就能自动展示当天分析。
          </p>
        </div>
      </section>

      <section className="section membership-block" id="benefits">
        <div className="membership-block__content">
          <p className="section__label">会员分层</p>
          <h2>先把权限逻辑讲清楚，再让用户进入 AI</h2>
          <p>
            Free / 普通体验版默认看固定按钮和固定分析流程，不鼓励直接闲聊。Pro / VIP 再开放自由输入、个性化问题和更深度的研究交互。这样首页承诺与产品能力会更一致。
          </p>
        </div>
        <div className="membership-list card-glow">
          <div className="membership-list__item">
            <span className="membership-list__icon">✦</span>
            <span>普通体验：固定分析入口 + 首页每日 AI 行情分析</span>
          </div>
          <div className="membership-list__item">
            <span className="membership-list__icon">✦</span>
            <span>高级会员：开放自由输入、追问、持仓上下文补充</span>
          </div>
          <div className="membership-list__item">
            <span className="membership-list__icon">✦</span>
            <span>整体语气继续保持中文、简洁、偏交易执行，不做花哨叙事</span>
          </div>
        </div>
      </section>

      <section className="section cta-block card-glow" id="cta">
        <p className="section__label">现在进入</p>
        <h2>首页已经收口成一个更像产品、而不是宣传页的版本</h2>
        <p>
          如果要继续推进，下一步最值得做的是：把每日 AI 行情分析接到后台发布，以及把 Pro / VIP 自由输入权限和会员计划真正联动起来。
        </p>
        <div className="hero__actions">
          <AccessEntryLink href="/assistant" mode="assistant" className="button button--primary">
            打开 AI 助手
          </AccessEntryLink>
          <a href="/apply" className="button button--ghost">
            去申请会员
          </a>
        </div>
      </section>
    </main>
  );
}
