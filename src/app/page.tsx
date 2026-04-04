const benefits = [
  {
    title: "策略框架",
    description:
      "从市场结构、流动性、情绪到执行节奏，形成适合实战的 Web3 认知地图，而不是碎片化喊单。",
  },
  {
    title: "高质量社群",
    description:
      "聚焦真正愿意长期进化的成员，减少噪音，提升讨论密度，让每次交流都有信息含量。",
  },
  {
    title: "AI 辅助决策",
    description:
      "用 AI 做信息筛选、行情整理、观点归纳与复盘支持，提升研究效率，而不是替代判断。",
  },
];

const memberships = [
  "核心研报与专题内容优先查看",
  "每周市场复盘与主题追踪",
  "课程资料库与方法论更新",
  "社群问答与阶段性闭门分享",
  "AI 助手专属入口与研究模板",
  "后续开放工具、活动与线下权益",
];

const courseCards = [
  {
    label: "Course 01",
    title: "市场结构与趋势识别",
    text: "理解周期、强弱切换、关键区间与确认逻辑，建立稳定的读图与决策基础。",
  },
  {
    label: "Course 02",
    title: "交易系统与风险管理",
    text: "把进场、止损、加减仓、复盘串成一套可执行系统，减少情绪型操作。",
  },
  {
    label: "Course 03",
    title: "Web3 叙事与项目研究",
    text: "从 narrative、资金流向、生态位置和团队执行力理解项目，不做情绪追高。",
  },
];

const aiFeatures = [
  "行情摘要 / Watchlist",
  "研报提炼 / 信息聚合",
  "交易复盘 / 结构化总结",
  "策略提示 / Risk Check",
];

import { SiteHeader } from "@/components/site-header";
import { AccessEntryLink } from "@/components/access-entry-link";

export default function Home() {
  return (
    <main className="page-shell">
      <SiteHeader current="home" />
      <section className="hero section">
        <div className="hero__badge">Twone Web3.0 Community · Private Members Hub</div>
        <div className="hero__grid">
          <div className="hero__content">
            <p className="eyebrow">面向少数真正想长期做成的人</p>
            <h1>
              不只是社群，
              <br />
              而是一套围绕 <span>认知 × 执行 × 连接</span> 的会员平台。
            </h1>
            <p className="hero__description">
              Twone 致力于打造一个偏高质量、偏长期主义、偏实战导向的 Web3 私人会员空间。
              现在优先开放 Free 体验版做内测：申请通过后默认可获得免费体验版与 2 次 AI 对话，用更低门槛先体验整体节奏，再决定是否继续深入。
            </p>
            <div className="hero__actions">
              <a href="/apply" className="button button--primary">
                申请加入
              </a>
              <a href="#courses" className="button button--ghost">
                浏览课程入口
              </a>
              <AccessEntryLink href="/assistant" mode="assistant" className="button button--ghost">
                查看 AI 助手
              </AccessEntryLink>
            </div>
            <div className="hero__stats">
              <div>
                <strong>01</strong>
                <span>Private Community</span>
              </div>
              <div>
                <strong>02</strong>
                <span>Courses & Research</span>
              </div>
              <div>
                <strong>03</strong>
                <span>AI Copilot Access</span>
              </div>
            </div>
          </div>

          <div className="hero__panel card-glow">
            <div className="panel__topline">
              <span className="status-dot" />
              Member Access Preview
            </div>
            <div className="panel__title">你的 Web3 Private Operating System</div>
            <div className="panel__list">
              <article>
                <span>Insight Layer</span>
                <strong>深度内容 / 专题 / 周期判断</strong>
              </article>
              <article>
                <span>Execution Layer</span>
                <strong>课程方法 / 风险框架 / 复盘体系</strong>
              </article>
              <article>
                <span>Network Layer</span>
                <strong>会员链接 / 协作机会 / 线下活动</strong>
              </article>
              <article>
                <span>AI Layer</span>
                <strong>申请通过默认送 Free Trial，含 2 次 AI 对话体验</strong>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--split">
        <div>
          <p className="section__label">为什么是 Twone</p>
          <h2>一个面向私人会员的高信噪比平台</h2>
        </div>
        <p className="section__intro">
          我们不把首页做成发币项目站，也不追求夸张叙事。这个平台强调的是：内容有深度、关系有筛选、工具能落地、AI 真正能提高效率。现在先用 Free 体验版把门槛降下来，方便真实用户先上手测试。
        </p>
      </section>

      <section className="section card-grid">
        {benefits.map((item) => (
          <article className="info-card" key={item.title}>
            <div className="info-card__index">0{benefits.indexOf(item) + 1}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <section className="section membership-block" id="benefits">
        <div className="membership-block__content">
          <p className="section__label">会员权益</p>
          <h2>加入后，你将进入一个持续更新的会员体系</h2>
          <p>
            从课程、研究、社群到 AI 辅助工具，Twone 的设计目标是让每一位成员都能拥有更稳定的成长路径，而不是依赖单点信息刺激。当前申请通过后会先发放 Free 体验版，默认附带 2 次 AI 对话额度。
          </p>
        </div>
        <div className="membership-list card-glow">
          {memberships.map((item) => (
            <div className="membership-list__item" key={item}>
              <span className="membership-list__icon">✦</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="courses">
        <div className="section-heading">
          <div>
            <p className="section__label">课程入口</p>
            <h2>从底层逻辑到实战方法，逐步建立你的系统</h2>
          </div>
          <a href="/apply" className="text-link">
            查看会员通道 →
          </a>
        </div>
        <div className="course-grid">
          {courseCards.map((course) => (
            <article className="course-card" key={course.title}>
              <span className="course-card__label">{course.label}</span>
              <h3>{course.title}</h3>
              <p>{course.text}</p>
              <button type="button">进入模块</button>
            </article>
          ))}
        </div>
      </section>

      <section className="section ai-block">
        <div className="ai-block__left">
          <p className="section__label">AI 助手入口</p>
          <h2>让 AI 成为你的研究副驾驶，而不是噪音制造机</h2>
          <p>
            平台后续将集成面向会员的 AI 入口，用于行情整理、交易复盘、研究摘要、知识库检索与策略提醒，帮助你更快完成从信息到判断的转换。当前申请通过后，默认会先开通 Free 体验版，含 2 次 AI 对话，方便快速试用。
          </p>
        </div>
        <div className="ai-block__right card-glow">
          <div className="ai-block__chip">AI Copilot Preview</div>
          <ul>
            {aiFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <AccessEntryLink href="/assistant" mode="assistant" className="button button--secondary">
            进入 AI 助手原型
          </AccessEntryLink>
        </div>
      </section>

      <section className="section cta-block card-glow" id="cta">
        <p className="section__label">Call To Action</p>
        <h2>如果你想进入一个更克制、更有质量的 Web3 成长环境，现在可以先留下入口。</h2>
        <p>
          当前页面为首页原型，后续可继续扩展会员登录、支付、内容系统、活动报名、AI 对话界面与 Vercel 部署配置。现阶段优先把 Free Trial 路径跑通：申请通过即可拿到免费体验版，默认 2 次 AI 对话。
        </p>
        <div className="hero__actions">
          <a href="/apply" className="button button--primary">
            前往会员申请
          </a>
          <AccessEntryLink href="/assistant" mode="assistant" className="button button--ghost">
            查看 AI 助手页
          </AccessEntryLink>
        </div>
      </section>

      <footer className="footer section">
        <div>
          <strong>Twone Web3.0 Community</strong>
          <p>Private Members Platform for serious builders, traders and thinkers.</p>
        </div>
        <div className="footer__meta">
          <span>Landing Page Prototype</span>
          <span>Next.js App Router</span>
          <span>© 2026 Twone</span>
        </div>
      </footer>
    </main>
  );
}
