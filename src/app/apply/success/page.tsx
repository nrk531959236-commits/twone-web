import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "申请已收到 | Twone Web3.0 Community",
  description: "Twone 会员申请提交成功后的 thank-you / 下一步引导页面。",
};

type ApplySuccessPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

export default async function ApplySuccessPage({ searchParams }: ApplySuccessPageProps) {
  const params = await searchParams;
  const successMessage = params?.status || "申请已提交成功，我们会尽快完成筛选与回访。";

  return (
    <main className="page-shell">
      <SiteHeader current="apply" />

      <section className="section hero page-hero success-hero">
        <div className="hero__badge">Application Received · Next Steps</div>
        <div className="hero__grid success-hero__grid">
          <div className="hero__content">
            <p className="eyebrow">申请已进入审核队列，接下来只需要等我们联系你</p>
            <h1>
              申请已收到，
              <br />
              下一步我们会继续跟进。
            </h1>
            <p className="hero__description">
              我们已经收到你的会员申请信息。接下来会根据你的交易背景、关注方向与加入动机进行人工筛选，
              再决定后续沟通和入群安排。
            </p>

            <div className="success-inline-status form-status form-status--success" role="status" aria-live="polite">
              <div>{successMessage}</div>
            </div>

            <div className="hero__actions">
              <Link href="/assistant" className="button button--primary">
                先看看 AI 助手
              </Link>
              <Link href="/apply" className="button button--ghost">
                返回申请页
              </Link>
            </div>
          </div>

          <aside className="hero__panel card-glow">
            <div className="panel__topline">
              <span className="status-dot" />
              Review Timeline
            </div>
            <div className="panel__title">预计 24-72 小时内完成首轮审核</div>
            <div className="panel__list">
              <article>
                <span>01 / 已收到</span>
                <strong>你的申请已成功进入待审核队列，无需重复提交。</strong>
              </article>
              <article>
                <span>02 / 人工筛选</span>
                <strong>我们会优先查看交易经验、关注方向、长期投入意愿与匹配度。</strong>
              </article>
              <article>
                <span>03 / 联系通知</span>
                <strong>若通过初筛，会通过你填写的 Telegram / 微信 / 邮箱联系你。</strong>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section className="section success-layout">
        <div className="success-layout__main">
          <p className="section__label">What happens next</p>
          <h2>接下来你可以这样准备</h2>
          <div className="success-steps">
            <article className="success-step card-glow">
              <span className="success-step__index">Step 01</span>
              <h3>等待审核结果</h3>
              <p>
                正常情况下，首轮审核会在 <strong>24-72 小时</strong> 内完成；如果申请量较大，可能顺延，
                但无需重复提交。
              </p>
            </article>
            <article className="success-step card-glow">
              <span className="success-step__index">Step 02</span>
              <h3>留意联系方式</h3>
              <p>
                后续我们会优先通过你表单里填写的联系方式通知你，包括审核结果、补充沟通、
                入群方式或下一步安排。
              </p>
            </article>
            <article className="success-step card-glow">
              <span className="success-step__index">Step 03</span>
              <h3>可先加入 Telegram / 等待回访</h3>
              <p>
                如果你已经有 Telegram，可以先准备好账号并保持可联系状态；后续若适合，我们会发送进一步说明或回访邀请。
              </p>
            </article>
          </div>
        </div>

        <aside className="success-sidebar">
          <div className="sidebar-card section">
            <p className="section__label">Contact & Notice</p>
            <h2>通知方式说明</h2>
            <p>
              我们主要通过你填写的 <strong>Telegram / 微信 / 邮箱</strong> 做后续联系，请确保联系方式可用，
              也注意查收陌生消息或邮件。
            </p>
            <div className="quota-grid">
              <div className="quota-card">
                <span>通知内容</span>
                <strong>审核结果</strong>
                <p>包括通过、补充信息、暂不匹配或后续等待名单。</p>
              </div>
              <div className="quota-card">
                <span>下一步</span>
                <strong>回访 / 入群 / 说明</strong>
                <p>根据匹配情况安排一对一沟通、社群入口或后续指引。</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
