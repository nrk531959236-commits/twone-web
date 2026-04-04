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
  const successMessage = params?.status || "状态：等待审核中。审核通过后，默认可获得 Free 体验版与 2 次 AI 对话。";

  return (
    <main className="page-shell">
      <SiteHeader current="apply" />

      <section className="section hero page-hero success-hero">
        <div className="hero__badge">Application Received · Next Steps</div>
        <div className="hero__grid success-hero__grid">
          <div className="hero__content">
            <p className="eyebrow">当前状态：等待审核中。接下来只需要等审核并用同一邮箱登录</p>
            <h1>
              申请已收到，
              <br />
              下一步我们会继续跟进。
            </h1>
            <p className="hero__description">
              我们已经收到你的会员申请信息。接下来会根据你的交易背景、关注方向与加入动机进行人工筛选。
              后台会直接按你填写的登录邮箱进行审批；若审核通过，默认会先发放 Free 体验版与 2 次 AI 对话额度。你之后只需用同一个邮箱登录 Twone，资格就会自动生效。
            </p>

            <div className="success-inline-status form-status form-status--success" role="status" aria-live="polite">
              <div>
                <strong>等待审核中</strong>
                <br />
                {successMessage}
              </div>
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
            <div className="panel__title">当前状态：等待审核中</div>
            <div className="panel__list">
              <article>
                <span>01 / 等待审核中</span>
                <strong>你的申请已成功进入待审核队列，无需重复提交。</strong>
              </article>
              <article>
                <span>02 / 人工筛选</span>
                <strong>我们会优先查看交易经验、关注方向、长期投入意愿与匹配度。</strong>
              </article>
              <article>
                <span>03 / 审核完成后登录</span>
                <strong>若通过初筛，会直接按你填写的登录邮箱完成批准，并默认发放 Free 体验版 + 2 次 AI 对话；之后你只需用该邮箱登录，资格会自动生效。</strong>
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
                但无需重复提交。审核通过后默认会先拿到 Free 体验版与 2 次 AI 对话。
              </p>
            </article>
            <article className="success-step card-glow">
              <span className="success-step__index">Step 02</span>
              <h3>留意登录邮箱</h3>
              <p>
                请确保你填写的就是未来登录 Twone 使用的邮箱。后台会按这个邮箱审批；审核通过后，你只需用同一个邮箱登录，
                资格就会自动兑现到你的账号。
              </p>
            </article>
            <article className="success-step card-glow">
              <span className="success-step__index">Step 03</span>
              <h3>审核通过后直接登录</h3>
              <p>
                不需要先注册别的资料，也不需要额外找管理员手动绑账号。等审核通过后，直接用申请时填写的登录邮箱登录 Twone 即可。
              </p>
            </article>
          </div>
        </div>

        <aside className="success-sidebar">
          <div className="sidebar-card section">
            <p className="section__label">Login Email</p>
            <h2>登录邮箱说明</h2>
            <p>
              后台审批默认以你填写的 <strong>登录邮箱</strong> 为准，请确保这个邮箱就是你登录 Twone 时使用的邮箱；
              审核通过后默认会发放 <strong>Free 体验版</strong> 与 <strong>2 次 AI 对话</strong>，之后你只需用该邮箱登录即可自动生效。
            </p>
            <div className="quota-grid">
              <div className="quota-card">
                <span>审批依据</span>
                <strong>登录邮箱</strong>
                <p>后台按你申请时填写的登录邮箱审批，并在你首次用该邮箱登录时自动兑现。</p>
              </div>
              <div className="quota-card">
                <span>下一步</span>
                <strong>审核通过后直接登录</strong>
                <p>若已通过审批，直接用申请时填写的邮箱登录 Twone，即可拿到 Free Trial 与 AI 次数。</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
