import { SiteHeader } from "@/components/site-header";
import { getDailyAiMarketAnalysis, getDailyAiMarketWorkflowNote } from "@/lib/daily-ai-market";

const instantMarkets = ["BTC", "ETH", "黄金"];
const instantTimeframes = ["15M", "1H", "4H", "1D"];
const instantAnalysisTypes = ["方向判断", "支撑 / 阻力", "进场计划", "风险扫描"];

const membershipPlans = [
  {
    name: "Free",
    description: "看每日分析 + 用即时判断预设入口。",
    rights: ["可选 BTC / ETH / 黄金", "可选级别与分析类型", "一键发起即时判断"],
  },
  {
    name: "Pro / VIP",
    description: "在预设入口之外，额外开放自由输入与连续追问。",
    rights: ["保留全部即时预设入口", "增加自由输入框", "支持补充上下文继续追问"],
  },
];

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

  return (
    <main className="page-shell home-minimal-shell">
      <SiteHeader current="home" />

      <section className="section home-minimal-section home-daily-section" id="daily-ai-market">
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
                <p className="home-daily-main__summary">{dailyAnalysis.summary}</p>
              </div>
              <div className="home-bias-box">
                <span>今日偏向</span>
                <strong>{dailyAnalysis.marketBias}</strong>
                <em>{dailyAnalysis.conviction}</em>
              </div>
            </div>

            <div className="home-key-levels">
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

            <div className="home-daily-columns">
              <div>
                <p className="home-chip">今晚重点</p>
                <ul>
                  {dailyAnalysis.focus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="home-chip">风险提示</p>
                <ul>
                  {dailyAnalysis.riskTips.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <aside className="home-daily-side">
            <article className="home-side-card">
              <p className="home-chip">每日分析定位</p>
              <h3>这是每天统一更新的主判断</h3>
              <p>适合先快速掌握今天主方向、关键位、风险事件和整体执行框架。</p>
            </article>

            <article className="home-side-card">
              <p className="home-chip">更新时间</p>
              <h3>{dailyAnalysis.publishAtJst}</h3>
              <p>{workflow.timezone} / 美股开盘前更新，不是盘中即时请求。</p>
            </article>
          </aside>
        </div>
      </section>

      <section className="section home-minimal-section home-instant-section" id="instant-check">
        <div className="home-section-heading home-section-heading--split">
          <div>
            <p className="section__label">B · 即时工具</p>
            <h2>即时行情判断入口</h2>
          </div>
          <p className="section__intro">
            和“每日 AI 行情分析”不同，这里是即时发起的工具入口：你先选交易对、级别、分析类型，再点击发送，拿到当下这一刻的判断。
          </p>
        </div>

        <div className="home-instant-grid">
          <article className="home-instant-tool card-glow">
            <div className="home-tool-header">
              <div>
                <p className="home-chip">普通用户可用</p>
                <h3>用预设参数快速发起即时分析</h3>
              </div>
              <span className="home-tool-badge">即时请求，不等每日更新</span>
            </div>

            <div className="home-tool-fields">
              <div className="home-tool-field">
                <span>交易对</span>
                <div className="home-pill-row">
                  {instantMarkets.map((item, index) => (
                    <button key={item} type="button" className={`home-select-pill ${index === 0 ? "home-select-pill--active" : ""}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="home-tool-field">
                <span>级别</span>
                <div className="home-pill-row">
                  {instantTimeframes.map((item, index) => (
                    <button key={item} type="button" className={`home-select-pill ${index === 1 ? "home-select-pill--active" : ""}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="home-tool-field">
                <span>分析类型</span>
                <div className="home-pill-row">
                  {instantAnalysisTypes.map((item, index) => (
                    <button key={item} type="button" className={`home-select-pill ${index === 0 ? "home-select-pill--active" : ""}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="home-tool-actions">
              <a href="/assistant?entry=assistant" className="button button--primary">
                发送并开始即时分析
              </a>
              <span>适合盘中快速确认，不重复讲整天总观点。</span>
            </div>
          </article>

          <article className="home-pro-panel">
            <div className="home-pro-panel__head">
              <p className="home-chip">Pro / VIP 额外能力</p>
              <h3>自由输入只对 Pro / VIP 开放</h3>
              <p>普通用户使用上面的预设入口就能发起即时判断；Pro / VIP 才额外开放自由输入和连续追问。</p>
            </div>

            <div className="home-pro-input is-locked">
              <span>自由输入</span>
              <div>
                例如：<em>“帮我看 ETH 4H 假突破后的回踩承接是否有效”</em>
              </div>
              <strong>会员专属</strong>
            </div>

            <ul className="home-diff-list">
              <li>每日分析：统一发布，回答“今天整体怎么看”。</li>
              <li>即时判断：按你当前选择，回答“这一刻这笔怎么看”。</li>
              <li>Pro / VIP：在预设之外，再开放自由输入。</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section home-minimal-section home-membership-section" id="membership">
        <div className="home-section-heading home-section-heading--split">
          <div>
            <p className="section__label">C · 开通会员</p>
            <h2>会员入口只保留必要信息</h2>
          </div>
          <p className="section__intro">不再堆叠宣传话术，只直接说明普通用户能做什么，以及 Pro / VIP 多开放什么。</p>
        </div>

        <div className="home-membership-grid">
          {membershipPlans.map((plan) => (
            <article key={plan.name} className="home-membership-card">
              <p className="home-chip">{plan.name}</p>
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
              <ul>
                {plan.rights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="hero__actions">
          <a href="/apply" className="button button--primary">
            开通 Pro / VIP
          </a>
        </div>
      </section>

      <section className="section home-minimal-section home-contact-section" id="contact">
        <div className="home-section-heading home-section-heading--split">
          <div>
            <p className="section__label">D · 联系方式</p>
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
